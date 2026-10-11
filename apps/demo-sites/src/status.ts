/** Shows what SeeItMyWay applied, so the fixture is easy to eyeball and to assert on in tests. */
export function renderStatus(): void {
  const html = document.documentElement;
  const applied = Array.from(html.attributes)
    .filter((a) => a.name.startsWith('data-simw-'))
    .map((a) => `${a.name}="${a.value}"`)
    .join('\n');
  const pre = document.getElementById('applied');
  if (pre) pre.textContent = applied || '(nothing yet)';
  const video = document.querySelector('video');
  const status = document.getElementById('video-status');
  if (video && status) {
    status.textContent = video.autoplay
      ? 'Autoplay: allowed by this visitor’s preferences.'
      : 'Autoplay: stopped by SeeItMyWay, because this visitor asked for no autoplay or less motion.';
  }
}

renderStatus();
new MutationObserver(renderStatus).observe(document.documentElement, { attributes: true });
