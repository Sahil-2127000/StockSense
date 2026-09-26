import { Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError.js';

/*
 * The stock engine: the ONLY code that changes stock.
 * Every call must run inside a prisma.$transaction so the ledger (stock_moves)
 * and the balances (stock_quants) are always updated together or not at all.
 */

const SYSTEM_LOCATIONS = {
  VENDOR: { name: 'Vendors', shortCode: 'Vendor', fullPath: 'Vendors' },
  CUSTOMER: { name: 'Customers', shortCode: 'Customer', fullPath: 'Customers' },
  ADJUSTMENT: { name: 'Inventory Adjustment', shortCode: 'Adjustment', fullPath: 'Adjustment' },
};

// Virtual locations are the "other side" of receipts, deliveries and adjustments
export const getSystemLocation = async (tx, type) => {
  const data = SYSTEM_LOCATIONS[type];
  return tx.location.upsert({
    where: { fullPath: data.fullPath },
    update: {},
    create: { ...data, type, warehouseId: null },
  });
};

const OPERATION_CODES = { RECEIPT: 'IN', DELIVERY: 'OUT', TRANSFER: 'INT', ADJUSTMENT: 'ADJ' };

// Next reference like "WH/IN/0005". The sequence row is locked by the update, so two
// operations created at the same time never get the same number.
export const nextReference = async (tx, warehouseId, type) => {
  const warehouse = await tx.warehouse.findUniqueOrThrow({ where: { id: warehouseId } });
  const sequence = await tx.referenceSequence.upsert({
    where: { warehouseId_type: { warehouseId, type } },
    create: { warehouseId, type, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  const number = String(sequence.nextNumber - 1).padStart(4, '0');
  return `${warehouse.shortCode}/${OPERATION_CODES[type]}/${number}`;
};

// Locks the balance row (SELECT ... FOR UPDATE) so concurrent moves wait for each other
const lockQuantity = async (tx, productId, locationId) => {
  const rows = await tx.$queryRaw`
    SELECT quantity FROM stock_quants
    WHERE productId = ${productId} AND locationId = ${locationId}
    FOR UPDATE`;
  return rows.length ? new Prisma.Decimal(rows[0].quantity) : new Prisma.Decimal(0);
};

const addQuantity = (tx, productId, locationId, quantity) => tx.$executeRaw`
  INSERT INTO stock_quants (productId, locationId, quantity, createdAt, updatedAt)
  VALUES (${productId}, ${locationId}, ${quantity}, NOW(3), NOW(3))
  ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), updatedAt = NOW(3)`;

/**
 * Moves stock for every line from one location to another and logs it in the ledger.
 * Only INTERNAL locations hold stock; VENDOR / CUSTOMER / ADJUSTMENT are virtual.
 * Throws 409 if a source location does not have enough stock (nothing is changed).
 *
 * @param tx          Prisma transaction client
 * @param operationId operation the moves belong to
 * @param from        source location { id, type, fullPath }
 * @param to          destination location { id, type, fullPath }
 * @param lines       [{ productId, quantity }]
 * @param products    optional map productId → { name } for error messages
 */
export const moveStock = async (tx, { operationId, from, to, lines, products = {} }) => {
  // Lock rows in a fixed order (by productId) to avoid deadlocks between transactions
  const sorted = [...lines].sort((a, b) => a.productId - b.productId);

  if (from.type === 'INTERNAL') {
    const shortages = [];
    for (const { productId, quantity } of sorted) {
      const available = await lockQuantity(tx, productId, from.id);
      if (available.lt(quantity)) {
        shortages.push({
          field: `product:${productId}`,
          message: `Not enough ${products[productId]?.name ?? `product ${productId}`} in ${from.fullPath}: ${available} available, ${quantity} needed`,
        });
      }
    }
    if (shortages.length) throw ApiError.conflict('Not enough stock', shortages);
  }

  for (const { productId, quantity } of sorted) {
    if (from.type === 'INTERNAL') await addQuantity(tx, productId, from.id, -quantity);
    if (to.type === 'INTERNAL') await addQuantity(tx, productId, to.id, quantity);
  }

  await tx.stockMove.createMany({
    data: sorted.map(({ productId, quantity }) => ({
      operationId,
      productId,
      fromLocationId: from.id,
      toLocationId: to.id,
      quantity,
    })),
  });
};
