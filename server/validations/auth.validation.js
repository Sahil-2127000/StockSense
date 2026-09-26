import { z } from 'zod';
import {
  emailField,
  fullNameField,
  loginIdField,
  passwordField,
  withPasswordConfirmation,
} from '../utils/validators.js';

export const signupSchema = withPasswordConfirmation(
  z.object({
    loginId: loginIdField,
    email: emailField,
    fullName: fullNameField,
    password: passwordField,
    confirmPassword: z.string({ error: 'Please re-enter your password' }),
  })
);

export const loginSchema = z.object({
  loginId: z.string({ error: 'Login ID is required' }).trim().min(1, 'Login ID is required'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const resendVerificationSchema = z.object({ email: emailField });

const codeField = z.string({ error: 'Code is required' }).trim().regex(/^\d{6}$/, 'Code must be 6 digits');

export const verifyEmailSchema = z.object({ email: emailField, code: codeField });

export const verifyOtpSchema = z.object({
  email: emailField,
  code: z.string({ error: 'Code is required' }).trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const resetPasswordSchema = withPasswordConfirmation(
  z.object({
    resetToken: z.string({ error: 'Reset token is required' }).min(1),
    password: passwordField,
    confirmPassword: z.string({ error: 'Please re-enter your password' }),
  })
);
