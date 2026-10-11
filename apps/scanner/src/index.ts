import { createApp } from './app';
import { scanWithBrowserRun } from './browser-run';
import { resolveHost } from './dns';

export default createApp({
  scan: scanWithBrowserRun,
  resolve: (hostname) => resolveHost(hostname),
  now: () => Date.now(),
});
