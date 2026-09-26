import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { sentMails } from '../src/utils/mailer.js';
import prisma, { resetDatabase } from './helpers/db.js';
import { TEST_PASSWORD, createUser } from './helpers/auth.js';

const validSignup = {
  loginId: 'sahil_01',
  email: 'Sahil@Example.com',
  fullName: 'Sahil Maurya',
  password: 'Strong@Pass1',
  confirmPassword: 'Strong@Pass1',
};

const fieldsOf = (res) => res.body.errors?.map((e) => e.field) ?? [];

beforeEach(async () => {
  await resetDatabase();
  sentMails.length = 0;
});

describe('POST /api/auth/signup', () => {
  it('creates a STAFF user, lowercases email and never returns the hash', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...validSignup, role: 'MANAGER' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ loginId: 'sahil_01', email: 'sahil@example.com', role: 'STAFF' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it.each([
    ['loginId', { loginId: 'abc' }],
    ['loginId', { loginId: 'way_too_long_id' }],
    ['loginId', { loginId: 'bad.login' }],
    ['email', { email: 'not-an-email' }],
    ['password', { password: 'short@A', confirmPassword: 'short@A' }],
    ['password', { password: 'nouppercase@1', confirmPassword: 'nouppercase@1' }],
    ['password', { password: 'NoSpecial123', confirmPassword: 'NoSpecial123' }],
    ['confirmPassword', { confirmPassword: 'Different@1' }],
  ])('rejects invalid %s', async (field, override) => {
    const res = await request(app).post('/api/auth/signup').send({ ...validSignup, ...override });

    expect(res.status).toBe(400);
    expect(fieldsOf(res)).toContain(field);
  });

  it('returns 409 for duplicate login ID and email', async () => {
    await createUser({ loginId: 'sahil_01', email: 'sahil@example.com' });

    const res = await request(app).post('/api/auth/signup').send(validSignup);

    expect(res.status).toBe(409);
    expect(fieldsOf(res)).toEqual(expect.arrayContaining(['loginId', 'email']));
  });
});

describe('POST /api/auth/login', () => {
  it('sets an httpOnly cookie on success', async () => {
    const user = await createUser();

    const res = await request(app).post('/api/auth/login').send({ loginId: user.loginId, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.loginId).toBe(user.loginId);
    expect(res.headers['set-cookie'][0]).toMatch(/token=.+HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it.each([
    ['wrong password', async (u) => ({ loginId: u.loginId, password: 'Wrong@12345' })],
    ['unknown login ID', async () => ({ loginId: 'nobody_x', password: TEST_PASSWORD })],
    ['inactive user', async () => ({ loginId: (await createUser({ isActive: false })).loginId, password: TEST_PASSWORD })],
  ])('gives the same generic error for %s', async (_case, makeBody) => {
    const user = await createUser();

    const res = await request(app).post('/api/auth/login').send(await makeBody(user));

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid Login Id or Password');
  });

  it('logout clears the cookie', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/token=;/);
  });
});

describe('OTP password reset', () => {
  const codeFromMail = () => sentMails.at(-1).text.match(/\b(\d{6})\b/)[1];

  it('email → code → new password → can log in with the new password', async () => {
    const user = await createUser();

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    expect(forgot.status).toBe(200);
    expect(sentMails).toHaveLength(1);

    const stored = await prisma.otpCode.findFirst({ where: { userId: user.id } });
    expect(stored.codeHash).not.toBe(codeFromMail()); // stored hashed, not plain text

    const verify = await request(app).post('/api/auth/verify-otp').send({ email: user.email, code: codeFromMail() });
    expect(verify.status).toBe(200);

    const reset = await request(app).post('/api/auth/reset-password').send({
      resetToken: verify.body.data.resetToken,
      password: 'Brand@New123',
      confirmPassword: 'Brand@New123',
    });
    expect(reset.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ loginId: user.loginId, password: 'Brand@New123' });
    expect(login.status).toBe(200);

    // The same reset token cannot be used twice
    const again = await request(app).post('/api/auth/reset-password').send({
      resetToken: verify.body.data.resetToken,
      password: 'Other@New123',
      confirmPassword: 'Other@New123',
    });
    expect(again.status).toBe(400);
  });

  it('does not reveal whether an email exists', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@test.local' });

    expect(res.status).toBe(200);
    expect(sentMails).toHaveLength(0);
  });

  it('does not send a new code within 60 seconds', async () => {
    const user = await createUser();

    await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    await request(app).post('/api/auth/forgot-password').send({ email: user.email });

    expect(sentMails).toHaveLength(1);
  });

  it('locks the code after 5 wrong attempts', async () => {
    const user = await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    const wrong = codeFromMail() === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/verify-otp').send({ email: user.email, code: wrong });
    }
    const res = await request(app).post('/api/auth/verify-otp').send({ email: user.email, code: codeFromMail() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too many/i);
  });

  it('rejects an expired code', async () => {
    const user = await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    await prisma.otpCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).post('/api/auth/verify-otp').send({ email: user.email, code: codeFromMail() });

    expect(res.status).toBe(400);
  });
});
