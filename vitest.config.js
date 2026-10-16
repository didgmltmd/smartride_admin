import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    env: { NODE_ENV: 'test' },
    include: ['tests/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    clearMocks: true,
    restoreMocks: true,
  },
});
