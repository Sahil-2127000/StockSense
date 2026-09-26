import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export const AUTH_COOKIE = 'token';

// Short fingerprint of the password hash. It changes whenever the password changes,
// which invalidates every token issued before (e.g. after a password reset).
export const passwordVersion = (passwordHash) =>
  crypto.createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);

export const signAuthToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role, pwv: passwordVersion(user.passwordHash) }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });

export const verifyToken = (token) => jwt.verify(token, config.JWT_SECRET);

// Short-lived token proving the user passed OTP verification
export const signResetToken = (userId, otpId) =>
  jwt.sign({ sub: String(userId), otp: otpId, purpose: 'password-reset' }, config.JWT_SECRET, {
    expiresIn: '15m',
  });

export const authCookieOptions = (token) => {
  const { exp } = jwt.decode(token);
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    maxAge: exp * 1000 - Date.now(),
    path: '/',
  };
};
