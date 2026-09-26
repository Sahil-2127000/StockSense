import prisma from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

const shortCodeTaken = () =>
  ApiError.conflict('Short code already in use', [{ field: 'shortCode', message: 'Short code already in use' }]);

const findOr404 = async (id) => {
  const warehouse = await prisma.warehouse.findUnique({ where: { id } });
  if (!warehouse) throw ApiError.notFound('Warehouse not found');
  return warehouse;
};

const operationCount = (warehouseId) =>
  prisma.operation.count({
    where: {
      OR: [{ sourceLocation: { warehouseId } }, { destLocation: { warehouseId } }],
    },
  });

export const list = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const where = query.q ? { OR: [{ name: { contains: query.q } }, { shortCode: { contains: query.q } }] } : {};
  const [items, total] = await prisma.$transaction([
    prisma.warehouse.findMany({
      where,
      include: { _count: { select: { locations: true } } },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.warehouse.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

export const getById = async (id) => {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: { locations: { orderBy: { fullPath: 'asc' } } },
  });
  if (!warehouse) throw ApiError.notFound('Warehouse not found');
  return warehouse;
};

// Creates the warehouse and its default "<CODE>/Stock" location together
export const create = async ({ name, shortCode, address }) => {
  if (await prisma.warehouse.findUnique({ where: { shortCode } })) throw shortCodeTaken();

  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.create({ data: { name, shortCode, address } });
    await tx.location.create({
      data: { warehouseId: warehouse.id, name: 'Stock', shortCode: 'Stock', fullPath: `${shortCode}/Stock`, type: 'INTERNAL' },
    });
    return tx.warehouse.findUnique({ where: { id: warehouse.id }, include: { locations: true } });
  });
};

export const update = async (id, { name, shortCode, address }) => {
  const warehouse = await findOr404(id);
  const codeChanges = shortCode && shortCode !== warehouse.shortCode;

  if (codeChanges) {
    if (await prisma.warehouse.findUnique({ where: { shortCode } })) throw shortCodeTaken();
    // The code is printed in document references (WH/IN/0001), so freeze it once used
    if ((await operationCount(id)) > 0) {
      throw ApiError.conflict('Short code cannot change after operations exist for this warehouse', [
        { field: 'shortCode', message: 'Already used in document references' },
      ]);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (codeChanges) {
      const locations = await tx.location.findMany({ where: { warehouseId: id } });
      for (const location of locations) {
        await tx.location.update({
          where: { id: location.id },
          data: { fullPath: `${shortCode}/${location.shortCode}` },
        });
      }
    }
    return tx.warehouse.update({
      where: { id },
      data: { name, shortCode, address },
      include: { locations: true },
    });
  });
};

export const remove = async (id) => {
  await findOr404(id);

  const [stock, operations] = await Promise.all([
    prisma.stockQuant.count({ where: { location: { warehouseId: id }, quantity: { not: 0 } } }),
    operationCount(id),
  ]);
  if (stock > 0) throw ApiError.conflict('Warehouse still holds stock. Move or adjust it first.');
  if (operations > 0) throw ApiError.conflict('Warehouse has operation history and cannot be deleted.');

  await prisma.$transaction([
    prisma.stockQuant.deleteMany({ where: { location: { warehouseId: id } } }),
    prisma.location.deleteMany({ where: { warehouseId: id } }),
    prisma.referenceSequence.deleteMany({ where: { warehouseId: id } }),
    prisma.warehouse.delete({ where: { id } }),
  ]);
};
