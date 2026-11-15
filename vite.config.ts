import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so the build runs from any folder or static host.
  base: '/timbang/',
  plugins: [
    react(),
    {
      // Gives every build its own service-worker cache name, so a new deploy replaces the old cache.
      name: 'stamp-service-worker',
      apply: 'build',
      closeBundle() {
        const file = 'dist/sw.js';
        if (existsSync(file)) writeFileSync(file, readFileSync(file, 'utf8').replaceAll('__BUILD_ID__', Date.now().toString(36)));
      },
    },
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
