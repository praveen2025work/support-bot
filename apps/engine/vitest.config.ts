import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Vitest runs the colocated unit tests only. The jest-based integration
    // tests under tests/ are run by jest (`npm run test:integration`); excluding
    // them here prevents Vitest from collecting their `jest.*` globals.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
