import prisma from '../config/db.js';
import { serialize } from '../utils/response.js';
import { buildMeta, getPagination } from '../utils/pagination.js';

const locationSelect = { select: { id: true, name: true, fullPath: true, type: true, warehouseId: true } };

// IN = arrives from outside, OUT = leaves to outside, INTERNAL = between warehouse locations
export const directionOf = (from, to) => {
  if (from.type === 'INTERNAL' && to.type === 'INTERNAL') return 'INTERNAL';
  return to.type === 'INTERNAL' ? 'IN' : 'OUT';
};

const directionFilter = {
  IN: { toLocation: { type: 'INTERNAL' }, fromLocation: { type: { not: 'INTERNAL' } } },
  OUT: { fromLocation: { type: 'INTERNAL' }, toLocation: { type: { not: 'INTERNAL' } } },
  INTERNAL: { fromLocation: { type: 'INTERNAL' }, toLocation: { type: 'INTERNAL' } },
};

/**
 * Move history (the stock ledger): one row per product per move, newest first.
 * An operation with several products appears as several rows.
 */
export const list = async (query) => {
  const { skip, take, page, limit } = getPagination(query);
  const where = {
    ...(query.productId && { productId: query.productId }),
    ...(query.type && { operation: { type: { in: query.type } } }),
    ...((query.from || query.to) && {
      createdAt: { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) },
    }),
    AND: [
      query.direction ? directionFilter[query.direction] : {},
      query.locationId ? { OR: [{ fromLocationId: query.locationId }, { toLocationId: query.locationId }] } : {},
      query.warehouseId
        ? { OR: [{ fromLocation: { warehouseId: query.warehouseId } }, { toLocation: { warehouseId: query.warehouseId } }] }
        : {},
      query.q
        ? {
          OR: [
            { operation: { reference: { contains: query.q } } },
            { operation: { contact: { name: { contains: query.q } } } },
            { product: { name: { contains: query.q } } },
            { product: { sku: { contains: query.q } } },
          ],
        }
        : {},
    ],
  };

  const [moves, total] = await prisma.$transaction([
    prisma.stockMove.findMany({
      where,
      include: {
        operation: {
          select: {
            id: true,
            reference: true,
            type: true,
            status: true,
            contact: { select: { id: true, name: true } },
            responsible: { select: { id: true, fullName: true } },
          },
        },
        product: { select: { id: true, name: true, sku: true, uom: true } },
        fromLocation: locationSelect,
        toLocation: locationSelect,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    }),
    prisma.stockMove.count({ where }),
  ]);

  return {
    items: moves.map((move) => ({ ...serialize(move), direction: directionOf(move.fromLocation, move.toLocation) })),
    meta: buildMeta(total, page, limit),
  };
};
