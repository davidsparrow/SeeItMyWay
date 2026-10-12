import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Serves the SDK's script-tag build at /simw.global.js (run `pnpm --filter @simw/sdk build` first).
  publicDir: resolve(here, '../../packages/sdk/dist'),
  build: {
    rollupOptions: {
      input: {
        npm: resolve(here, 'index.html'),
        scriptTag: resolve(here, 'script-tag.html'),
        plain: resolve(here, 'plain.html'),
      },
    },
  },
});
