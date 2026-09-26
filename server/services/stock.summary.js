import { Prisma } from '@prisma/client';
import prisma from '../config/db.js';

const ZERO = new Prisma.Decimal(0);

/**
 * Stock status from the on-hand quantity and the reorder rule:
 * OUT when nothing is left, LOW when at or below the rule's minimum, otherwise OK.
 */
export const stockStatus = (onHand, minQty) => {
  const qty = new Prisma.Decimal(onHand);
  if (qty.lte(0)) return 'OUT';
  if (minQty !== null && minQty !== undefined && qty.lte(minQty)) return 'LOW';
  return 'OK';
};

/**
 * On hand / reserved / free quantities for many products in two grouped queries.
 * Reserved = quantities on READY deliveries and transfers (confirmed but not yet validated).
 * Optional warehouseId / locationId limit everything to one warehouse or one location.
 */
export const getStockSummary = async (productIds, { warehouseId, locationId } = {}) => {
  if (!productIds.length) return new Map();
  const locationFilter = {
    type: 'INTERNAL',
    ...(warehouseId && { warehouseId }),
    ...(locationId && { id: locationId }),
  };

  const [onHandRows, reservedRows] = await Promise.all([
    prisma.stockQuant.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, location: locationFilter },
      _sum: { quantity: true },
    }),
    prisma.operationLine.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        operation: { status: 'READY', type: { in: ['DELIVERY', 'TRANSFER'] }, sourceLocation: locationFilter },
      },
      _sum: { quantity: true },
    }),
  ]);

  const onHand = new Map(onHandRows.map((r) => [r.productId, r._sum.quantity ?? ZERO]));
  const reserved = new Map(reservedRows.map((r) => [r.productId, r._sum.quantity ?? ZERO]));

  return new Map(
    productIds.map((id) => {
      const qty = onHand.get(id) ?? ZERO;
      const held = reserved.get(id) ?? ZERO;
      const free = Prisma.Decimal.max(qty.minus(held), ZERO);
      return [id, { onHand: qty, reserved: held, free }];
    })
  );
};

/**
 * Product ids matching a stock status, computed in SQL so filtering works across all pages.
 * Options: warehouseId / locationId (stock in one warehouse or location), categoryId, activeOnly.
 */
export const productIdsByStatus = async (status, { warehouseId, locationId, categoryId, activeOnly = false } = {}) => {
  const warehouseClause = Prisma.sql`${warehouseId ? Prisma.sql`AND l.warehouseId = ${warehouseId}` : Prisma.empty} ${locationId ? Prisma.sql`AND l.id = ${locationId}` : Prisma.empty}`;
  const qty = Prisma.sql`COALESCE(s.qty, 0)`;
  const condition = {
    OUT: Prisma.sql`${qty} <= 0`,
    LOW: Prisma.sql`${qty} > 0 AND r.minQty IS NOT NULL AND ${qty} <= r.minQty`,
    OK: Prisma.sql`${qty} > 0 AND (r.minQty IS NULL OR ${qty} > r.minQty)`,
    IN_STOCK: Prisma.sql`${qty} > 0`,
  }[status];
  const filters = [
    categoryId ? Prisma.sql`AND p.categoryId = ${categoryId}` : Prisma.empty,
    activeOnly ? Prisma.sql`AND p.isActive = true` : Prisma.empty,
  ];

  const rows = await prisma.$queryRaw`
    SELECT p.id FROM products p
    LEFT JOIN (
      SELECT sq.productId, SUM(sq.quantity) AS qty
      FROM stock_quants sq JOIN locations l ON l.id = sq.locationId
      WHERE l.type = 'INTERNAL' ${warehouseClause}
      GROUP BY sq.productId
    ) s ON s.productId = p.id
    LEFT JOIN reorder_rules r ON r.productId = p.id
    WHERE ${condition} ${Prisma.join(filters, ' ')}`;
  return rows.map((r) => r.id);
};

/**
 * Total units and total value (quantity × unit cost) held in warehouse locations.
 */
export const stockValue = async ({ warehouseId, locationId, categoryId } = {}) => {
  const [row] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(sq.quantity), 0) AS units, COALESCE(SUM(sq.quantity * p.unitCost), 0) AS value
    FROM stock_quants sq
    JOIN locations l ON l.id = sq.locationId
    JOIN products p ON p.id = sq.productId
    WHERE l.type = 'INTERNAL'
      ${warehouseId ? Prisma.sql`AND l.warehouseId = ${warehouseId}` : Prisma.empty}
      ${locationId ? Prisma.sql`AND l.id = ${locationId}` : Prisma.empty}
      ${categoryId ? Prisma.sql`AND p.categoryId = ${categoryId}` : Prisma.empty}`;
  return { units: new Prisma.Decimal(row.units), value: new Prisma.Decimal(row.value) };
};
