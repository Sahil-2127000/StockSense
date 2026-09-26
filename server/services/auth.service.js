import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import prisma from '../config/db.js';
import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { sendMail } from '../utils/mailer.js';
import { signAuthToken, signResetToken, verifyToken } from '../utils/token.js';

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

const toPublicUser = ({ passwordHash: _passwordHash, updatedAt: _updatedAt, ...user }) => user;

// ─── One-time codes (shared by email verification and password reset) ───

const EMAILS = {
  EMAIL_VERIFICATION: (name, code) => ({
    subject: 'Verify your StockSense email',
    text: `Hi ${name},\n\nWelcome to StockSense! Your verification code is ${code}.\nIt expires in ${OTP_TTL_MINUTES} minutes.\n\nIf you did not create an account, you can ignore this email.`,
  }),
  PASSWORD_RESET: (name, code) => ({
    subject: 'Your StockSense password reset code',
    text: `Hi ${name},\n\nYour password reset code is ${code}.\nIt expires in ${OTP_TTL_MINUTES} minutes.\n\nIf you did not ask for this, you can ignore this email.`,
  }),
};

/**
 * Creates a new 6-digit code for the user (older codes of the same purpose stop working)
 * and emails it. Does nothing if a code was sent less than 60 seconds ago.
 */
const issueCode = async (user, purpose) => {
  const latest = await prisma.otpCode.findFirst({ where: { userId: user.id, purpose }, orderBy: { createdAt: 'desc' } });
  if (latest && Date.now() - latest.createdAt.getTime() < OTP_RESEND_SECONDS * 1000) return;

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  await prisma.$transaction([
    prisma.otpCode.updateMany({ where: { userId: user.id, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.otpCode.create({
      data: { userId: user.id, purpose, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000) },
    }),
  ]);

  await sendMail({ to: user.email, ...EMAILS[purpose](user.fullName, code) });
};

/**
 * Checks a code: must be the newest unused, unexpired code of that purpose.
 * Wrong guesses count; after 5 the code is locked. Returns the matching code row.
 */
const checkCode = async (user, purpose, code) => {
  const invalid = ApiError.badRequest('Code is invalid or expired', [{ field: 'code', message: 'Code is invalid or expired' }]);
  if (!user) throw invalid;

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) throw invalid;

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.badRequest('Too many wrong attempts. Request a new code.', [
      { field: 'code', message: 'Too many wrong attempts. Request a new code.' },
    ]);
  }

  if (!sameHash(hashOtp(code), otp.codeHash)) {
    const updated = await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest('Incorrect code', [
      { field: 'code', message: `Incorrect code. ${OTP_MAX_ATTEMPTS - updated.attempts} attempt(s) left.` },
    ]);
  }
  return otp;
};

// ─── Sign-up and email verification ───

/**
 * Creates an unverified STAFF account and emails a verification code.
 * The user cannot log in until the email is verified.
 */
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
  const user = await prisma.user.create({
    data: { loginId, email, fullName, passwordHash: await hashPassword(password), role: 'STAFF' },
  });
  await issueCode(user, 'EMAIL_VERIFICATION');
  return { email: user.email, verificationRequired: true };
};

// Always resolves the same way so it never reveals whether an unverified account exists
export const resendVerification = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || user.emailVerifiedAt) return;
  await issueCode(user, 'EMAIL_VERIFICATION');
};

// Confirms the email and logs the user in
export const verifyEmail = async ({ email, code }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.emailVerifiedAt) throw ApiError.badRequest('This email is already verified. You can log in.');
  await checkCode(user, 'EMAIL_VERIFICATION', code);

  const verified = await prisma.$transaction(async (tx) => {
    await tx.otpCode.updateMany({ where: { userId: user.id, purpose: 'EMAIL_VERIFICATION', usedAt: null }, data: { usedAt: new Date() } });
    return tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  });
  return { user: toPublicUser(verified), token: signAuthToken(verified) };
};

// ─── Login ───

export const login = async ({ loginId, password }) => {
  const user = await prisma.user.findUnique({ where: { loginId } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk || !user.isActive) throw ApiError.unauthorized(INVALID_LOGIN);

  // Only told after the correct password, so this never helps someone guessing accounts
  if (!user.emailVerifiedAt) {
    await issueCode(user, 'EMAIL_VERIFICATION');
    const error = ApiError.forbidden('Please verify your email first. We sent a code to your inbox.').withCode('EMAIL_NOT_VERIFIED');
    error.errors = [{ field: 'email', message: user.email }];
    throw error;
  }

  return { user: toPublicUser(user), token: signAuthToken(user) };
};

// ─── Password reset ───

// Always resolves the same way so the response never reveals whether the email exists
export const requestPasswordReset = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;
  await issueCode(user, 'PASSWORD_RESET');
};

export const verifyOtp = async ({ email, code }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  const otp = await checkCode(user, 'PASSWORD_RESET', code);
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
  const otp = await prisma.otpCode.findFirst({ where: { id: payload.otp, userId, purpose: 'PASSWORD_RESET', usedAt: null } });
  if (!otp) throw expired;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      // Receiving the reset code proves the user owns the email, so it also counts as verification
      data: { passwordHash: await hashPassword(password), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    }),
    prisma.otpCode.updateMany({ where: { userId, purpose: 'PASSWORD_RESET', usedAt: null }, data: { usedAt: new Date() } }),
  ]);
};
