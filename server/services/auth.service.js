import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import prisma from '../config/db.js';
import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { sendMail } from '../utils/mailer.js';
import { signAuthToken, signResetToken, verifyToken } from '../utils/token.js';
import { publicUserSelect } from '../utils/userSelect.js';

// Full strength in real use; cheaper hashing keeps the test suite fast
const BCRYPT_ROUNDS = config.NODE_ENV === 'test' ? 4 : 12;
const OTP_TTL_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const INVALID_LOGIN = 'Invalid Login Id or Password';

// Used when the login ID does not exist, so both cases take the same time
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const hashOtp = (code) => crypto.createHmac('sha256', config.JWT_SECRET).update(code).digest('hex');

const sameHash = (a, b) => crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const signup = async ({ loginId, email, fullName, password }) => {
  const existing = await prisma.user.findMany({
    where: { OR: [{ loginId }, { email }] },
    select: { loginId: true, email: true },
  });

  const errors = [];
  if (existing.some((u) => u.loginId.toLowerCase() === loginId.toLowerCase())) {
    errors.push({ field: 'loginId', message: 'Login ID already taken' });
  }
  if (existing.some((u) => u.email === email)) {
    errors.push({ field: 'email', message: 'Email already registered' });
  }
  if (errors.length) throw ApiError.conflict('Account already exists', errors);

  // Self sign-up always creates STAFF; only a manager can promote users
  return prisma.user.create({
    data: { loginId, email, fullName, passwordHash: await hashPassword(password), role: 'STAFF' },
    select: publicUserSelect,
  });
};

export const login = async ({ loginId, password }) => {
  const user = await prisma.user.findUnique({ where: { loginId } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk || !user.isActive) throw ApiError.unauthorized(INVALID_LOGIN);

  const { passwordHash: _passwordHash, updatedAt: _updatedAt, ...publicUser } = user;
  return { user: publicUser, token: signAuthToken(user) };
};

// Always resolves the same way so the response never reveals whether the email exists
export const requestPasswordReset = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;

  const latest = await prisma.otpCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < OTP_RESEND_SECONDS * 1000) return;

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  await prisma.$transaction([
    // Only the newest code is valid
    prisma.otpCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  await sendMail({
    to: user.email,
    subject: 'Your StockSense password reset code',
    text: `Hi ${user.fullName},\n\nYour password reset code is ${code}.\nIt expires in ${OTP_TTL_MINUTES} minutes.\n\nIf you did not ask for this, you can ignore this email.`,
  });
};

export const verifyOtp = async ({ email, code }) => {
  const invalid = ApiError.badRequest('Code is invalid or expired', [
    { field: 'code', message: 'Code is invalid or expired' },
  ]);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw invalid;

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) throw invalid;

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.badRequest('Too many wrong attempts. Request a new code.', [
      { field: 'code', message: 'Too many wrong attempts. Request a new code.' },
    ]);
  }

  if (!sameHash(hashOtp(code), otp.codeHash)) {
    const updated = await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const left = OTP_MAX_ATTEMPTS - updated.attempts;
    throw ApiError.badRequest('Incorrect code', [
      { field: 'code', message: `Incorrect code. ${left} attempt(s) left.` },
    ]);
  }

  return { resetToken: signResetToken(user.id, otp.id) };
};

export const resetPassword = async ({ resetToken, password }) => {
  const expired = ApiError.badRequest('Reset link expired. Please start again.');

  let payload;
  try {
    payload = verifyToken(resetToken);
  } catch {
    throw expired;
  }
  if (payload.purpose !== 'password-reset') throw expired;

  const userId = Number(payload.sub);
  const otp = await prisma.otpCode.findFirst({ where: { id: payload.otp, userId, usedAt: null } });
  if (!otp) throw expired;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.otpCode.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
};
