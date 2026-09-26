import request from 'supertest';
import { server } from './server.js';
import prisma from '../../config/db.js';
import { hashPassword } from '../../services/auth.service.js';

export const TEST_PASSWORD = 'Test@12345';

let counter = 0;

export const createUser = async ({ role = 'STAFF', isActive = true, ...overrides } = {}) => {
  counter += 1;
  return prisma.user.create({
    data: {
      loginId: `user_${counter}`.padEnd(6, '0'),
      email: `user${counter}@test.local`,
      fullName: `Test User ${counter}`,
      passwordHash: await hashPassword(overrides.password ?? TEST_PASSWORD),
      role,
      isActive,
      ...(overrides.loginId && { loginId: overrides.loginId }),
      ...(overrides.email && { email: overrides.email }),
    },
  });
};

// Returns a supertest agent that keeps the auth cookie, plus the user
export const loginAs = async (role = 'STAFF') => {
  const user = await createUser({ role });
  const agent = request.agent(server);
  const res = await agent.post('/api/auth/login').send({ loginId: user.loginId, password: TEST_PASSWORD });
  if (res.status !== 200) throw new Error(`loginAs failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user };
};
