import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  // Enforce relative resource pathing so asset URLs resolve correctly inside GitHub Pages sub-folders
  base: './',
  server: {
    fs: {
      // Allow Vite to step outside /packages/frontend/ to read core source code files
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      // Teach Vite how to translate cross-package imports into raw local files
      '@tessellate3d/core': resolve(__dirname, '../core')
    }
  }
});
