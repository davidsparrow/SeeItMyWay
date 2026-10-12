// Serves the SDK's script-tag build from this app (/sdk/simw.global.js), so the
// /listen snippet works on any deployment without a CDN. The copy is
// git-ignored and cached by Turborepo as part of this app's build output.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../../../packages/sdk/dist/', import.meta.url));
const to = fileURLToPath(new URL('../public/sdk/', import.meta.url));

if (!existsSync(`${from}simw.global.js`)) {
  console.error('[copy-sdk] packages/sdk/dist/simw.global.js is missing. Run `pnpm build` first.');
  process.exit(1);
}
mkdirSync(to, { recursive: true });
for (const file of ['simw.global.js', 'simw.global.js.map']) {
  if (existsSync(from + file)) copyFileSync(from + file, to + file);
}
console.log('[copy-sdk] copied the SDK script-tag build to public/sdk/');
