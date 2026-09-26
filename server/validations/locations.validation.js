import { z } from 'zod';
import { idParam, paginationQuery, positiveId } from '../utils/validators.js';

const name = z.string({ error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(60);

export const createLocationSchema = z.object({
  warehouseId: positiveId('Warehouse'),
  name,
  shortCode: z
    .string({ error: 'Short code is required' })
    .trim()
    .regex(/^[A-Za-z0-9-]{1,10}$/, 'Short code must be 1–10 letters, digits or dashes (e.g. RackA)'),
});

export const updateLocationSchema = z.object({ name });

export const listLocationsQuery = paginationQuery.extend({
  warehouseId: z.coerce.number().int().positive().optional(),
  type: z.enum(['INTERNAL', 'VENDOR', 'CUSTOMER', 'ADJUSTMENT']).optional(),
});

export { idParam };
