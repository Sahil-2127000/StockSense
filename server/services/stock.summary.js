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
 * Optional warehouseId limits everything to one warehouse.
 */
export const getStockSummary = async (productIds, { warehouseId } = {}) => {
  if (!productIds.length) return new Map();
  const locationFilter = { type: 'INTERNAL', ...(warehouseId && { warehouseId }) };

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
 */
export const productIdsByStatus = async (status, { warehouseId } = {}) => {
  const warehouseClause = warehouseId ? Prisma.sql`AND l.warehouseId = ${warehouseId}` : Prisma.empty;
  const qty = Prisma.sql`COALESCE(s.qty, 0)`;
  const condition = {
    OUT: Prisma.sql`${qty} <= 0`,
    LOW: Prisma.sql`${qty} > 0 AND r.minQty IS NOT NULL AND ${qty} <= r.minQty`,
    OK: Prisma.sql`${qty} > 0 AND (r.minQty IS NULL OR ${qty} > r.minQty)`,
  }[status];

  const rows = await prisma.$queryRaw`
    SELECT p.id FROM products p
    LEFT JOIN (
      SELECT sq.productId, SUM(sq.quantity) AS qty
      FROM stock_quants sq JOIN locations l ON l.id = sq.locationId
      WHERE l.type = 'INTERNAL' ${warehouseClause}
      GROUP BY sq.productId
    ) s ON s.productId = p.id
    LEFT JOIN reorder_rules r ON r.productId = p.id
    WHERE ${condition}`;
  return rows.map((r) => r.id);
};
