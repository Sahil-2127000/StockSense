import { z } from 'zod';
import { idParam, optionalText, paginationQuery } from '../utils/validators.js';

const shortCode = z
  .string({ error: 'Short code is required' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,5}$/, 'Short code must be 2–5 letters or digits (e.g. WH)');

const name = z.string({ error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(60);

export const createWarehouseSchema = z.object({ name, shortCode, address: optionalText(200) });

export const updateWarehouseSchema = z
  .object({ name: name.optional(), shortCode: shortCode.optional(), address: optionalText(200) })
  .refine((d) => Object.values(d).some((v) => v !== undefined), 'Nothing to update');

export const listWarehousesQuery = paginationQuery;
export { idParam };
