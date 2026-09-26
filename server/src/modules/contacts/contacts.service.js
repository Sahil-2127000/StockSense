import prisma from '../../config/db.js';
import ApiError from '../../utils/ApiError.js';
import { buildMeta, getPagination } from '../../utils/pagination.js';

const findOr404 = async (id) => {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) throw ApiError.notFound('Contact not found');
  return contact;
};

export const list = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const where = {
    ...(query.type && { type: query.type }),
    ...(query.q && {
      OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }, { phone: { contains: query.q } }],
    }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.contact.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
    prisma.contact.count({ where }),
  ]);
  return { items, meta: buildMeta(total, page, limit) };
};

export const getById = async (id) => {
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { _count: { select: { operations: true } } },
  });
  if (!contact) throw ApiError.notFound('Contact not found');
  return contact;
};

export const create = (data) => prisma.contact.create({ data });

export const update = async (id, data) => {
  await findOr404(id);
  // Changing supplier ↔ customer would make past receipts / deliveries inconsistent
  if (data.type && (await prisma.operation.count({ where: { contactId: id } }))) {
    const current = await findOr404(id);
    if (current.type !== data.type) {
      throw ApiError.conflict('Contact type cannot change once it is used in operations', [
        { field: 'type', message: 'Already used in operations' },
      ]);
    }
  }
  return prisma.contact.update({ where: { id }, data });
};

export const remove = async (id) => {
  await findOr404(id);
  if (await prisma.operation.count({ where: { contactId: id } })) {
    throw ApiError.conflict('Contact is used in operations and cannot be deleted');
  }
  await prisma.contact.delete({ where: { id } });
};
