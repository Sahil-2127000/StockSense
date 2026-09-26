import sendSuccess from '../utils/response.js';
import { AUTH_COOKIE, authCookieOptions } from '../utils/token.js';
import * as authService from '../services/auth.service.js';

export const signup = async (req, res) => {
  const user = await authService.signup(req.validated.body);
  sendSuccess(res, user, 201);
};

export const login = async (req, res) => {
  const { user, token } = await authService.login(req.validated.body);
  res.cookie(AUTH_COOKIE, token, authCookieOptions(token));
  sendSuccess(res, user);
};

export const logout = (req, res) => {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
  sendSuccess(res, { message: 'Logged out' });
};

export const forgotPassword = async (req, res) => {
  await authService.requestPasswordReset(req.validated.body);
  sendSuccess(res, { message: 'If an account exists for this email, a 6-digit code has been sent.' });
};

export const verifyOtp = async (req, res) => {
  sendSuccess(res, await authService.verifyOtp(req.validated.body));
};

export const resetPassword = async (req, res) => {
  await authService.resetPassword(req.validated.body);
  sendSuccess(res, { message: 'Password updated. You can now log in.' });
};
