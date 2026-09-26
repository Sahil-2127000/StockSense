import prisma from '../../config/db.js';
import ApiError from '../../utils/ApiError.js';
import { buildMeta, getPagination } from '../../utils/pagination.js';

const withCount = { _count: { select: { products: true } } };

const findOr404 = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
};

// The column collation is case-insensitive, so "furniture" matches "Furniture"
const assertNameFree = async (name, exceptId) => {
  const existing = await prisma.category.findFirst({ where: { name, ...(exceptId && { NOT: { id: exceptId } }) } });
  if (existing) throw ApiError.conflict('Category already exists', [{ field: 'name', message: 'Category already exists' }]);
};

export const list = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const where = query.q ? { name: { contains: query.q } } : {};
  const [items, total] = await prisma.$transaction([
    prisma.category.findMany({ where, include: withCount, orderBy: { name: 'asc' }, skip, take }),
    prisma.category.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

export const getById = async (id) => {
  const category = await prisma.category.findUnique({ where: { id }, include: withCount });
  if (!category) throw ApiError.notFound('Category not found');
  return category;
};

export const create = async ({ name }) => {
  await assertNameFree(name);
  return prisma.category.create({ data: { name }, include: withCount });
};

export const update = async (id, { name }) => {
  await findOr404(id);
  await assertNameFree(name, id);
  return prisma.category.update({ where: { id }, data: { name }, include: withCount });
};

export const remove = async (id) => {
  await findOr404(id);
  if (await prisma.product.count({ where: { categoryId: id } })) {
    throw ApiError.conflict('Category is used by products and cannot be deleted');
  }
  await prisma.category.delete({ where: { id } });
};
