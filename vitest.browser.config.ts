import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/browser/**/*.browser.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      api: {
        host: '127.0.0.1',
        port: 48615,
        strictPort: false,
      },
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
