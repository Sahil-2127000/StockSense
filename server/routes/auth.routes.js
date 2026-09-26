import { Router } from 'express';
import validate from '../middlewares/validate.js';
import { loginLimiter, otpLimiter } from '../middlewares/rateLimit.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as controller from '../controllers/auth.controller.js';
import {
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
  verifyOtpSchema,
} from '../validations/auth.validation.js';

const router = Router();

router.post('/signup', validate({ body: signupSchema }), asyncHandler(controller.signup));
router.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(controller.login));
router.post('/verify-email', otpLimiter, validate({ body: verifyEmailSchema }), asyncHandler(controller.verifyEmail));
router.post('/resend-verification', otpLimiter, validate({ body: resendVerificationSchema }), asyncHandler(controller.resendVerification));
router.post('/logout', controller.logout);
router.post('/forgot-password', otpLimiter, validate({ body: forgotPasswordSchema }), asyncHandler(controller.forgotPassword));
router.post('/verify-otp', otpLimiter, validate({ body: verifyOtpSchema }), asyncHandler(controller.verifyOtp));
router.post('/reset-password', validate({ body: resetPasswordSchema }), asyncHandler(controller.resetPassword));

export default router;
