import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => config.NODE_ENV === 'test',
    handler: (req, res) => res.status(429).json({ success: false, message }),
  });

export const loginLimiter = limiter(15, 10, 'Too many login attempts. Try again in 15 minutes.');
export const otpLimiter = limiter(15, 5, 'Too many code requests. Try again in 15 minutes.');
