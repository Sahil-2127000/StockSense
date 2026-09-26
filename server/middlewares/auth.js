import prisma from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { AUTH_COOKIE, verifyToken } from '../utils/token.js';

const readToken = (req) => {
  if (req.cookies?.[AUTH_COOKIE]) return req.cookies[AUTH_COOKIE];
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
};

// Verifies the JWT and loads the current user into req.user
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized('Please log in');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired, please log in again');
  }
  if (payload.purpose) throw ApiError.unauthorized('Please log in');

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, loginId: true, email: true, fullName: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) throw ApiError.unauthorized('Please log in');

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
