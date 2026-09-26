import prisma from '../config/db.js';
import { buildMeta, getPagination } from '../utils/pagination.js';
import { getStockSummary, productIdsByStatus, stockStatus, stockValue } from './stock.summary.js';

/**
 * Stock page: one row per product with on hand, free, value and where it is stored.
 * "Update" on this page uses POST /api/operations/adjustments (count → adjustment).
 */
export const list = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const locationFilter = {
    type: 'INTERNAL',
    ...(query.warehouseId && { warehouseId: query.warehouseId }),
    ...(query.locationId && { id: query.locationId }),
  };

  const where = {
    isActive: true,
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.q && { OR: [{ name: { contains: query.q } }, { sku: { contains: query.q } }] }),
    ...(query.locationId && { stockQuants: { some: { locationId: query.locationId, quantity: { not: 0 } } } }),
  };
  if (query.inStock) {
    where.id = { in: await productIdsByStatus('IN_STOCK', { warehouseId: query.warehouseId }) };
  }

  const [products, total, totals] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        reorderRule: { select: { minQty: true, maxQty: true } },
        stockQuants: {
          where: { quantity: { not: 0 }, location: locationFilter },
          include: { location: { select: { id: true, name: true, fullPath: true } } },
          orderBy: { location: { fullPath: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.product.count({ where }),
    stockValue({ warehouseId: query.warehouseId, categoryId: query.categoryId }),
  ]);

  const summary = await getStockSummary(products.map((p) => p.id), { warehouseId: query.warehouseId });

  const items = products.map(({ stockQuants, ...product }) => {
    const { onHand, reserved, free } = summary.get(product.id);
    return {
      product: { id: product.id, name: product.name, sku: product.sku, uom: product.uom, category: product.category },
      unitCost: product.unitCost,
      onHand,
      reserved,
      free,
      value: onHand.times(product.unitCost),
      stockStatus: stockStatus(onHand, product.reorderRule?.minQty),
      reorderRule: product.reorderRule,
      byLocation: stockQuants.map((q) => ({ location: q.location, quantity: q.quantity })),
    };
  });

  return { items, meta: { ...buildMeta(total, page, limit), totalUnits: totals.units, totalValue: totals.value } };
};

