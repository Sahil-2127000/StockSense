import { afterAll } from 'vitest';
import { loadTestEnv } from './loadTestEnv.js';

loadTestEnv();

const { default: prisma } = await import('../src/config/db.js');

afterAll(async () => {
  await prisma.$disconnect();
});
