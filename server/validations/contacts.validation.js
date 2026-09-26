import { z } from 'zod';
import { optionalText, paginationQuery } from '../utils/validators.js';

const type = z.enum(['SUPPLIER', 'CUSTOMER'], { error: 'Type must be SUPPLIER or CUSTOMER' });

const fields = {
  name: z.string({ error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.email('Enter a valid email address').optional()),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^\+?[0-9][0-9 -]{6,18}$/, 'Enter a valid phone number').optional()),
  address: optionalText(200),
};

export const createContactSchema = z.object({ ...fields, type });

export const updateContactSchema = z
  .object({ ...fields, name: fields.name.optional(), type: type.optional() })
  .refine((d) => Object.values(d).some((v) => v !== undefined), 'Nothing to update');

export const listContactsQuery = paginationQuery.extend({ type: type.optional() });
