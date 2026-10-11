import { siteKeys } from './storage';

export interface BootSnapshot {
  attrs: Record<string, string>;
  tokens: Record<string, string>;
  /** True when the color scheme follows the device, so boot re-reads it live. */
  followsSystemScheme: boolean;
}

/**
 * A tiny inline script for `<head>` that applies the last known experience
 * before first paint, so visitors who asked for dark or for less motion are
 * never flashed with the opposite. Runs before the SDK loads; the SDK then
 * takes over and corrects anything that changed.
 *
 * Without a snapshot (first visit) it falls back to the native media queries.
 * Device constraints always win over the snapshot: reduced motion raises
 * motion to at least `reduced`, and forced colors follow the device's scheme
 * even when the visitor chose a theme explicitly.
 */
export function bootScript(site: string): string {
  const key = JSON.stringify(siteKeys(site).applied);
  return `(function(){try{var d=document.documentElement,mm=window.matchMedia,s=null;
try{s=JSON.parse(localStorage.getItem(${key})||"null")}catch(e){}
var q=function(m){return !!(mm&&mm(m).matches)},dark=q("(prefers-color-scheme: dark)"),reduce=q("(prefers-reduced-motion: reduce)"),fc=q("(forced-colors: active)");
if(s&&s.attrs){for(var k in s.attrs){if(k.indexOf("data-simw-")===0)d.setAttribute(k,String(s.attrs[k]))}
if(s.tokens){for(var t in s.tokens){if(t.indexOf("--simw-")===0)d.style.setProperty(t,String(s.tokens[t]))}}
if(s.followsSystemScheme)d.setAttribute("data-simw-color-scheme",dark?"dark":"light");
if(reduce&&d.getAttribute("data-simw-motion")==="full")d.setAttribute("data-simw-motion","reduced")}
else{d.setAttribute("data-simw-color-scheme",dark?"dark":"light");d.setAttribute("data-simw-motion",reduce?"reduced":"full")}
if(fc){d.setAttribute("data-simw-color-scheme",dark?"dark":"light");d.setAttribute("data-simw-forced-colors","active");d.setAttribute("data-simw-transparency","reduced")}
d.style.colorScheme=d.getAttribute("data-simw-color-scheme")||"light"}catch(e){}})();`;
}
