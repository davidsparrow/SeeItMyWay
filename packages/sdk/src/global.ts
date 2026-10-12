/**
 * Script-tag build: `<script src=".../simw.global.js" data-simw-auto></script>`.
 *
 * Exposes `window.SeeItMyWay`. With `data-simw-auto`, it also starts a
 * runtime immediately (place it in `<head>` to adapt before first paint).
 * Optional attributes: `data-simw-site`, `data-simw-variants`,
 * `data-simw-adapters="motion autoplay touch-targets"`.
 */
import type { SafeAdapterName } from '@simw/adapters';
import * as api from './index';
import type { SeeItMyWay } from './runtime';

type GlobalApi = typeof api & { instance?: SeeItMyWay };

declare global {
  interface Window {
    SeeItMyWay?: GlobalApi;
  }
}

const script = document.currentScript as HTMLScriptElement | null;
const ns: GlobalApi = { ...api };
window.SeeItMyWay = ns;

if (script && script.dataset.simwAuto !== undefined) {
  const { simwSite, simwVariants, simwAdapters } = script.dataset;
  const options: api.SeeItMyWayOptions = {};
  if (simwSite) options.site = simwSite;
  if (simwVariants) options.variants = Number(simwVariants) || 0;
  if (simwAdapters !== undefined) {
    options.safeAdapters = simwAdapters.split(/\s+/).filter(Boolean) as SafeAdapterName[];
  }
  ns.instance = api.createSeeItMyWay(options);
  ns.instance.start();
}
