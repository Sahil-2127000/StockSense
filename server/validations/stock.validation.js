import { z } from 'zod';
import { paginationQuery } from '../utils/validators.js';

const optionalId = z.coerce.number().int().positive().optional();
const bool = z.enum(['true', 'false']).transform((v) => v === 'true').optional();

export const stockQuery = paginationQuery.extend({
  warehouseId: optionalId,
  locationId: optionalId,
  categoryId: optionalId,
  inStock: bool,
});

export const movesQuery = paginationQuery.extend({
  productId: optionalId,
  locationId: optionalId,
  warehouseId: optionalId,
  type: z
    .string()
    .transform((s) => s.split(',').map((v) => v.trim().toUpperCase()).filter(Boolean))
    .pipe(z.array(z.enum(['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'])))
    .optional(),
  direction: z.enum(['IN', 'OUT', 'INTERNAL']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const dashboardQuery = z.object({
  warehouseId: optionalId,
  categoryId: optionalId,
});
