import { afterAll } from 'vitest';
import { loadTestEnv } from './loadTestEnv.js';

loadTestEnv();

const { default: prisma } = await import('../config/db.js');
const { server } = await import('./helpers/server.js');

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});
