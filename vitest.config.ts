import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': resolve(import.meta.dirname) } },
  test: { include: ['tests/**/*.test.ts'], exclude: process.env.LOAD ? [] : ['tests/load/**', 'node_modules/**'], testTimeout: 30000 }
});
