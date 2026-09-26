import dotenv from 'dotenv';

// Load .env.test before anything reads process.env, and refuse to touch a non-test database
export const loadTestEnv = () => {
  dotenv.config({ path: '.env.test', override: true, quiet: true });

  if (!process.env.DATABASE_URL?.includes('_test')) {
    throw new Error('Refusing to run tests: DATABASE_URL in .env.test must point to a *_test database');
  }
  process.env.NODE_ENV = 'test';
};
