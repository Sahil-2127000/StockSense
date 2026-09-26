import { z } from 'zod';

// Reusable Zod building blocks shared by every module

export const idParam = z.object({
  id: z.coerce.number().int().positive('id must be a positive integer'),
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

export const emailField = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address'));

export const loginIdField = z
  .string({ error: 'Login ID is required' })
  .trim()
  .min(6, 'Login ID must be 6–12 characters')
  .max(12, 'Login ID must be 6–12 characters')
  .regex(/^[A-Za-z0-9_]+$/, 'Login ID can only contain letters, numbers and underscore');

// Rule from the design: a–z, A–Z, a special character, more than 8 characters
export const passwordField = z
  .string({ error: 'Password is required' })
  .min(9, 'Password must be more than 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const fullNameField = z
  .string({ error: 'Full name is required' })
  .trim()
  .min(2, 'Full name must be at least 2 characters')
  .max(60, 'Full name must be at most 60 characters');

// Adds a "passwords do not match" error on confirmPassword
export const withPasswordConfirmation = (schema, field = 'password') =>
  schema.refine((data) => data[field] === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const maxDecimals = (places) => (value) => Number.isInteger(Math.round(value * 10 ** places * 1e6) / 1e6);

// Stock quantities: DECIMAL(12,3)
export const quantityField = z.coerce
  .number({ error: 'Quantity must be a number' })
  .positive('Quantity must be greater than 0')
  .max(999_999_999, 'Quantity is too large')
  .refine(maxDecimals(3), 'Quantity can have at most 3 decimal places');

// Counted quantities may be zero
export const countedQuantityField = z.coerce
  .number({ error: 'Quantity must be a number' })
  .min(0, 'Quantity cannot be negative')
  .max(999_999_999, 'Quantity is too large')
  .refine(maxDecimals(3), 'Quantity can have at most 3 decimal places');

// Money: DECIMAL(12,2)
export const moneyField = z.coerce
  .number({ error: 'Amount must be a number' })
  .min(0, 'Amount cannot be negative')
  .max(9_999_999_999, 'Amount is too large')
  .refine(maxDecimals(2), 'Amount can have at most 2 decimal places');

export const positiveId = (label) =>
  z.coerce.number({ error: `${label} is required` }).int().positive(`${label} is required`);

export const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .optional()
    .transform((v) => (v === '' ? undefined : v));
