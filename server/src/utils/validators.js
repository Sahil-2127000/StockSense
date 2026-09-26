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
