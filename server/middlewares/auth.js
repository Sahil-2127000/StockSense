import prisma from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { AUTH_COOKIE, passwordVersion, verifyToken } from '../utils/token.js';

const readToken = (req) => {
  if (req.cookies?.[AUTH_COOKIE]) return req.cookies[AUTH_COOKIE];
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
};

/**
 * Returns the active user a token belongs to, or null when the token is invalid, expired,
 * not a login token, the user is inactive, or the password changed after it was issued.
 */
export const userFromToken = async (token) => {
  if (!token) return null;
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }
  if (payload.purpose) return null;

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, loginId: true, email: true, fullName: true, role: true, isActive: true, passwordHash: true },
  });
  if (!user || !user.isActive || payload.pwv !== passwordVersion(user.passwordHash)) return null;

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

// Verifies the JWT and loads the current user into req.user
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized('Please log in');

  const user = await userFromToken(token);
  if (!user) throw ApiError.unauthorized('Session expired, please log in again');

  req.user = user;
  next();
});

// Usage: router.post('/', authenticate, requireRole('MANAGER'), handler)
export const requireRole =
  (...roles) =>
    (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return next(ApiError.forbidden('You do not have permission to do this'));
      }
      return next();
    };
