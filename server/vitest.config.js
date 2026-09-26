import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['tests/globalSetup.js'],
    setupFiles: ['tests/setup.js'],
    // All suites share one MySQL test database, so run files one at a time
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 20000,
  },
});
