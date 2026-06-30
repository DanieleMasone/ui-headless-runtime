import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/ui-headless-runtime/src/**/*.ts'],
      exclude: ['packages/ui-headless-runtime/src/index.ts'],
      reporter: ['text', 'json-summary', 'lcov', 'html'],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
