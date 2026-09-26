import { execSync } from 'node:child_process';
import { loadTestEnv } from './loadTestEnv.js';

// Runs once before all test files: apply any missing migrations to the test database.
// (Each test file then empties the tables itself with resetDatabase().)
export default function setup() {
  loadTestEnv();
  try {
    execSync('npx prisma migrate deploy', { env: process.env, stdio: 'pipe' });
  } catch (error) {
    throw new Error(`Could not migrate the test database:\n${error.stdout}${error.stderr}`);
  }
}
