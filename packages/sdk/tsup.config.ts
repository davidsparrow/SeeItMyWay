import { defineConfig } from 'tsup';

// Workspace packages are private, so the SDK bundles them in.
const noExternal = [/^@simw\//];

export default defineConfig([
  {
    entry: { index: 'src/index.ts', react: 'src/react.tsx' },
    format: ['esm'],
    target: 'es2020',
    noExternal,
    external: ['react'],
    sourcemap: true,
    clean: true,
  },
  {
    // <script src=".../simw.global.js" data-simw-auto></script>
    entry: { simw: 'src/global.ts' },
    format: ['iife'],
    target: 'es2017',
    noExternal,
    minify: true,
    sourcemap: true,
  },
]);
