import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { server } from './helpers/server.js';
import { resetDatabase } from './helpers/db.js';
import { createUser, loginAs, TEST_PASSWORD } from './helpers/auth.js';

beforeEach(resetDatabase);

describe('authentication middleware', () => {
  it('returns 401 without a login', async () => {
    const res = await request(server).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a forged token', async () => {
    const res = await request(server).get('/api/users/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('accepts a Bearer token as well as the cookie', async () => {
    const user = await createUser();
    const login = await request(server).post('/api/auth/login').send({ loginId: user.loginId, password: TEST_PASSWORD });
    const token = login.headers['set-cookie'][0].match(/token=([^;]+)/)[1];

    const res = await request(server).get('/api/users/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });
});

describe('/api/users/me', () => {
  it('returns and updates the profile', async () => {
    const { agent } = await loginAs('STAFF');

    const res = await agent.patch('/api/users/me').send({ fullName: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('New Name');
  });

  it('rejects an email that belongs to someone else', async () => {
    const other = await createUser();
    const { agent } = await loginAs('STAFF');

    const res = await agent.patch('/api/users/me').send({ email: other.email });

    expect(res.status).toBe(409);
  });

  it('changes the password only with the correct current password', async () => {
    const { agent } = await loginAs('STAFF');
    const body = { password: 'Newer@Pass1', confirmPassword: 'Newer@Pass1' };

    const wrong = await agent.patch('/api/users/me/password').send({ ...body, currentPassword: 'Wrong@123456' });
    const ok = await agent.patch('/api/users/me/password').send({ ...body, currentPassword: TEST_PASSWORD });

    expect(wrong.status).toBe(400);
    expect(ok.status).toBe(200);
  });
});

describe('user management (manager only)', () => {
  it('blocks STAFF with 403', async () => {
    const { agent } = await loginAs('STAFF');
    const res = await agent.get('/api/users');
    expect(res.status).toBe(403);
  });

  it('lets a manager list, filter and promote users', async () => {
    const { agent } = await loginAs('MANAGER');
    const staff = await createUser();

    const list = await agent.get('/api/users?role=STAFF');
    const promote = await agent.patch(`/api/users/${staff.id}`).send({ role: 'MANAGER' });

    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(promote.body.data.role).toBe('MANAGER');
  });

  it('stops a manager from demoting themselves', async () => {
    const { agent, user } = await loginAs('MANAGER');
    const res = await agent.patch(`/api/users/${user.id}`).send({ role: 'STAFF' });
    expect(res.status).toBe(400);
  });

  it('a deactivated user is logged out immediately', async () => {
    const { agent: manager } = await loginAs('MANAGER');
    const { agent: staffAgent, user: staff } = await loginAs('STAFF');

    await manager.patch(`/api/users/${staff.id}`).send({ isActive: false });
    const res = await staffAgent.get('/api/users/me');

    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown user and 400 for a bad id', async () => {
    const { agent } = await loginAs('MANAGER');
    expect((await agent.patch('/api/users/9999').send({ role: 'STAFF' })).status).toBe(404);
    expect((await agent.patch('/api/users/abc').send({ role: 'STAFF' })).status).toBe(400);
  });
});
