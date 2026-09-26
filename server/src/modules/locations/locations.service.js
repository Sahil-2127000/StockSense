import prisma from '../../config/db.js';
import ApiError from '../../utils/ApiError.js';
import { buildMeta, getPagination } from '../../utils/pagination.js';

const warehouseSelect = { select: { id: true, name: true, shortCode: true } };

const findOr404 = async (id) => {
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) throw ApiError.notFound('Location not found');
  return location;
};

export const list = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const where = {
    ...(query.warehouseId && { warehouseId: query.warehouseId }),
    ...(query.type && { type: query.type }),
    ...(query.q && { OR: [{ name: { contains: query.q } }, { fullPath: { contains: query.q } }] }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.location.findMany({ where, include: { warehouse: warehouseSelect }, orderBy: { fullPath: 'asc' }, skip, take }),
    prisma.location.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

// Location with the products currently stored in it
export const getById = async (id) => {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      warehouse: warehouseSelect,
      stockQuants: {
        where: { quantity: { not: 0 } },
        include: { product: { select: { id: true, name: true, sku: true, uom: true } } },
        orderBy: { product: { name: 'asc' } },
      },
    },
  });
  if (!location) throw ApiError.notFound('Location not found');

  const { stockQuants, ...rest } = location;
  return { ...rest, stock: stockQuants.map((q) => ({ product: q.product, quantity: q.quantity })) };
};

// Users can only create INTERNAL locations; the server builds the full path
export const create = async ({ warehouseId, name, shortCode }) => {
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) {
    throw ApiError.badRequest('Validation failed', [{ field: 'warehouseId', message: 'Warehouse not found' }]);
  }

  const fullPath = `${warehouse.shortCode}/${shortCode}`;
  if (await prisma.location.findUnique({ where: { fullPath } })) {
    throw ApiError.conflict('Location already exists', [{ field: 'shortCode', message: `${fullPath} already exists` }]);
  }

  return prisma.location.create({
    data: { warehouseId, name, shortCode, fullPath, type: 'INTERNAL' },
    include: { warehouse: warehouseSelect },
  });
};

// Only the name can change: the short code is part of the history (full path)
export const update = async (id, { name }) => {
  await findOr404(id);
  return prisma.location.update({ where: { id }, data: { name }, include: { warehouse: warehouseSelect } });
};

export const remove = async (id) => {
  const location = await findOr404(id);
  if (location.type !== 'INTERNAL') throw ApiError.conflict('System locations cannot be deleted');

  const [stock, moves, operations] = await Promise.all([
    prisma.stockQuant.count({ where: { locationId: id, quantity: { not: 0 } } }),
    prisma.stockMove.count({ where: { OR: [{ fromLocationId: id }, { toLocationId: id }] } }),
    prisma.operation.count({ where: { OR: [{ sourceLocationId: id }, { destLocationId: id }] } }),
  ]);
  if (stock > 0) throw ApiError.conflict('Location still holds stock. Move or adjust it first.');
  if (moves > 0 || operations > 0) throw ApiError.conflict('Location has stock history and cannot be deleted.');

  await prisma.$transaction([
    prisma.stockQuant.deleteMany({ where: { locationId: id } }),
    prisma.location.delete({ where: { id } }),
  ]);
};
