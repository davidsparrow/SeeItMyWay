import { createSeeItMyWay } from '@simw/sdk';
import { renderStatus } from './status';
import './site.css';

/**
 * The npm install path: one call, no framework. Level 1 safe adapters calm
 * the ticker and spinning badge for reduced-motion visitors and stop the
 * video autoplaying, with no changes to the site's own CSS or markup.
 */
const simw = createSeeItMyWay({
  site: 'bramble.example',
  safeAdapters: ['motion', 'autoplay', 'touch-targets'],
});
simw.start();
simw.subscribe(renderStatus);
