import { Prisma } from '@prisma/client';
import prisma from '../../config/db.js';
import ApiError from '../../utils/ApiError.js';
import { buildMeta, getPagination } from '../../utils/pagination.js';
import { getSystemLocation, moveStock, nextReference } from '../stock/stock.engine.js';
import { getStockSummary, productIdsByStatus, stockStatus } from '../stock/stock.summary.js';

const include = {
  category: { select: { id: true, name: true } },
  reorderRule: { select: { minQty: true, maxQty: true } },
};

const withStock = (product, summary) => ({
  ...product,
  ...summary,
  stockStatus: stockStatus(summary.onHand, product.reorderRule?.minQty),
});

const findOr404 = async (id) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
};

const assertCategory = async (categoryId) => {
  if (!(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    throw ApiError.badRequest('Validation failed', [{ field: 'categoryId', message: 'Category not found' }]);
  }
};

const assertSkuFree = async (sku, exceptId) => {
  const existing = await prisma.product.findFirst({ where: { sku, ...(exceptId && { NOT: { id: exceptId } }) } });
  if (existing) throw ApiError.conflict('SKU already exists', [{ field: 'sku', message: 'SKU already exists' }]);
};

export const list = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const where = {
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
    ...(query.q && { OR: [{ name: { contains: query.q } }, { sku: { contains: query.q } }] }),
  };
  if (query.stockStatus) {
    where.id = { in: await productIdsByStatus(query.stockStatus, { warehouseId: query.warehouseId }) };
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include, orderBy: { name: 'asc' }, skip, take }),
    prisma.product.count({ where }),
  ]);
  const summary = await getStockSummary(products.map((p) => p.id), { warehouseId: query.warehouseId });

  return {
    items: products.map((p) => withStock(p, summary.get(p.id))),
    meta: buildMeta(total, page, limit),
  };
};

// Product with stock per location and a suggested reorder quantity
export const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      ...include,
      stockQuants: {
        where: { quantity: { not: 0 }, location: { type: 'INTERNAL' } },
        include: { location: { select: { id: true, name: true, fullPath: true, warehouse: { select: { id: true, name: true } } } } },
        orderBy: { location: { fullPath: 'asc' } },
      },
    },
  });
  if (!product) throw ApiError.notFound('Product not found');

  const { stockQuants, ...rest } = product;
  const result = withStock(rest, (await getStockSummary([id])).get(id));
  const rule = product.reorderRule;

  return {
    ...result,
    stockByLocation: stockQuants.map((q) => ({ location: q.location, quantity: q.quantity })),
    suggestedReorderQty:
      rule && result.stockStatus !== 'OK' ? Prisma.Decimal.max(new Prisma.Decimal(rule.maxQty).minus(result.onHand), 0) : 0,
  };
};

/**
 * Creates a product (with optional reorder rule). Initial stock is not written directly:
 * it is booked as a DONE adjustment through the stock engine, so it appears in the ledger.
 */
export const create = async ({ reorderRule, initialStock, ...data }, user) => {
  await assertCategory(data.categoryId);
  await assertSkuFree(data.sku);

  const productId = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: { ...data, ...(reorderRule && { reorderRule: { create: reorderRule } }) },
    });

    if (initialStock) {
      const location = await tx.location.findUnique({ where: { id: initialStock.locationId } });
      if (!location || location.type !== 'INTERNAL') {
        throw ApiError.badRequest('Validation failed', [
          { field: 'initialStock.locationId', message: 'Choose a warehouse location' },
        ]);
      }
      const adjustment = await getSystemLocation(tx, 'ADJUSTMENT');
      const lines = [{ productId: product.id, quantity: initialStock.quantity }];
      const operation = await tx.operation.create({
        data: {
          reference: await nextReference(tx, location.warehouseId, 'ADJUSTMENT'),
          type: 'ADJUSTMENT',
          status: 'DONE',
          sourceLocationId: adjustment.id,
          destLocationId: location.id,
          scheduleDate: new Date(),
          doneAt: new Date(),
          responsibleId: user.id,
          notes: 'Initial stock',
          lines: { create: lines },
        },
      });
      await moveStock(tx, { operationId: operation.id, from: adjustment, to: location, lines });
    }
    return product.id;
  });

  return getById(productId);
};

export const update = async (id, data) => {
  await findOr404(id);
  if (data.categoryId) await assertCategory(data.categoryId);
  if (data.sku) await assertSkuFree(data.sku, id);
  await prisma.product.update({ where: { id }, data });
  return getById(id);
};

export const setReorderRule = async (id, rule) => {
  await findOr404(id);
  await prisma.reorderRule.upsert({ where: { productId: id }, create: { productId: id, ...rule }, update: rule });
  return getById(id);
};

export const removeReorderRule = async (id) => {
  await findOr404(id);
  await prisma.reorderRule.deleteMany({ where: { productId: id } });
  return getById(id);
};

// Products with history are deactivated instead of deleted, so the ledger stays complete
export const remove = async (id) => {
  await findOr404(id);
  const [lines, moves] = await Promise.all([
    prisma.operationLine.count({ where: { productId: id } }),
    prisma.stockMove.count({ where: { productId: id } }),
  ]);
  if (lines || moves) {
    throw ApiError.conflict('Product has stock history. Deactivate it instead (isActive: false).');
  }
  await prisma.$transaction([
    prisma.reorderRule.deleteMany({ where: { productId: id } }),
    prisma.stockQuant.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);
};
