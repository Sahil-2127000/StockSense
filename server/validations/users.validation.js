import { z } from 'zod';
import {
  emailField,
  fullNameField,
  idParam,
  paginationQuery,
  passwordField,
  withPasswordConfirmation,
} from '../utils/validators.js';

export const updateProfileSchema = z
  .object({ fullName: fullNameField.optional(), email: emailField.optional() })
  .refine((data) => Object.keys(data).length > 0, 'Provide fullName or email to update');

export const changePasswordSchema = withPasswordConfirmation(
  z.object({
    currentPassword: z.string({ error: 'Current password is required' }).min(1, 'Current password is required'),
    password: passwordField,
    confirmPassword: z.string({ error: 'Please re-enter your password' }),
  })
);

export const listUsersQuery = paginationQuery.extend({
  role: z.enum(['MANAGER', 'STAFF']).optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export const updateUserSchema = z
  .object({ role: z.enum(['MANAGER', 'STAFF']).optional(), isActive: z.boolean().optional() })
  .refine((data) => Object.keys(data).length > 0, 'Provide role or isActive to update');

export { idParam };
