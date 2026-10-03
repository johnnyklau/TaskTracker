import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    env: process.env.CI
      ? {}
      : {
          DATABASE_URL:
            process.env.TEST_DATABASE_URL ??
            'postgresql://postgres:postgres@localhost:5432/tasktracker_test',
        },
  },
});
