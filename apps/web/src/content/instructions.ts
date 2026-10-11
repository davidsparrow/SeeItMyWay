import type { PlatformInfo } from '@simw/types';
import type { TopicId } from './topics';

/**
 * "Show Me How" instructions (PRD A.5): short, visual, platform-specific.
 *
 * Each set records how it was verified. `mdn` sets were checked against the
 * MDN source (github.com/mdn/content) in October 2026. `needs-review` sets
 * come from product knowledge and must be checked against the vendor's own
 * help pages before launch; vendors move these menus between versions.
 * See docs/instructions-review.md.
 */

export type InstructionPlatform =
  | 'ios'
  | 'ipados'
  | 'macos'
  | 'windows'
  | 'android'
  | 'chromeos'
  | 'linux'
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'safari';

export interface InstructionSet {
  platform: InstructionPlatform;
  label: string;
  /** Menu path, one step per item. */
  steps: string[];
  /** Then: what to do at the end of the path. */
  action?: string;
  note?: string;
  alternatives?: Array<{ label: string; steps: string[]; action?: string }>;
  verified: 'mdn' | 'needs-review';
  source?: string;
}

const MDN = {
  motion:
    'https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/at-rules/@media/prefers-reduced-motion/index.md',
  transparency:
    'https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/at-rules/@media/prefers-reduced-transparency/index.md',
};

export const PLATFORM_LABELS: Record<InstructionPlatform, string> = {
  ios: 'iPhone',
  ipados: 'iPad',
  macos: 'Mac',
  windows: 'Windows',
  android: 'Android',
  chromeos: 'ChromeOS',
  linux: 'Linux',
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  safari: 'Safari',
};

export const INSTRUCTIONS: Partial<Record<TopicId, InstructionSet[]>> = {
  motion: [
    {
      platform: 'ios',
      label: 'Reduce Motion on iPhone',
      steps: ['Settings', 'Accessibility', 'Motion', 'Reduce Motion'],
      action: 'Turn it on.',
      verified: 'mdn',
      source: MDN.motion,
    },
    {
      platform: 'ipados',
      label: 'Reduce Motion on iPad',
      steps: ['Settings', 'Accessibility', 'Motion', 'Reduce Motion'],
      action: 'Turn it on.',
      verified: 'mdn',
      source: MDN.motion,
    },
    {
      platform: 'macos',
      label: 'Reduce motion on a Mac',
      steps: ['System Settings', 'Accessibility', 'Motion', 'Reduce motion'],
      action: 'Turn it on.',
      note: 'This is for macOS 26 Tahoe and later.',
      alternatives: [
        {
          label: 'macOS 15 Sequoia and earlier',
          steps: ['System Settings', 'Accessibility', 'Display', 'Reduce motion'],
          action: 'Turn it on.',
        },
      ],
      verified: 'mdn',
      source: MDN.motion,
    },
    {
      platform: 'windows',
      label: 'Turn off animation effects on Windows 11',
      steps: ['Settings', 'Accessibility', 'Visual effects', 'Animation effects'],
      action: 'Turn it off.',
      alternatives: [
        {
          label: 'Windows 10',
          steps: ['Settings', 'Ease of Access', 'Display', 'Show animations in Windows'],
          action: 'Turn it off.',
        },
      ],
      verified: 'mdn',
      source: MDN.motion,
    },
    {
      platform: 'android',
      label: 'Remove animations on Android',
      steps: ['Settings', 'Accessibility', 'Remove animations'],
      action: 'Turn it on.',
      note: 'Android 9 and later. Some phones put it one level deeper, under "Color and motion" or "Visibility enhancements".',
      verified: 'mdn',
      source: MDN.motion,
    },
    {
      platform: 'linux',
      label: 'Reduce animation on Linux (GNOME)',
      steps: ['Settings', 'Accessibility', 'Seeing', 'Reduced animation'],
      action: 'Turn it on.',
      alternatives: [
        {
          label: 'KDE Plasma',
          steps: ['System Settings', 'Workspace Behavior', 'General Behavior', 'Animation speed'],
          action: 'Set it to "Instant".',
        },
      ],
      verified: 'mdn',
      source: MDN.motion,
    },
    {
      platform: 'firefox',
      label: 'Override it in Firefox only',
      steps: ['about:config', 'ui.prefersReducedMotion'],
      action: 'Add it as a Number set to 1. Changes take effect immediately.',
      note: 'An advanced setting. Changing your device setting is easier and works in every browser.',
      verified: 'mdn',
      source: MDN.motion,
    },
  ],
  transparency: [
    {
      platform: 'windows',
      label: 'Turn off transparency on Windows',
      steps: ['Settings', 'Personalization', 'Colors', 'Transparency effects'],
      action: 'Turn it off.',
      note: 'Chrome and Edge pass this on to websites.',
      verified: 'mdn',
      source: MDN.transparency,
    },
    {
      platform: 'macos',
      label: 'Reduce transparency on a Mac',
      steps: ['System Settings', 'Accessibility', 'Display', 'Reduce transparency'],
      action: 'Turn it on.',
      note: 'Chrome and Edge pass this on to websites; Safari doesn’t yet.',
      verified: 'mdn',
      source: MDN.transparency,
    },
    {
      platform: 'ios',
      label: 'Reduce transparency on iPhone',
      steps: ['Settings', 'Accessibility', 'Display & Text Size', 'Reduce Transparency'],
      action: 'Turn it on.',
      note: 'iPhone browsers don’t pass this on to websites yet, but it still calms down the rest of your phone.',
      verified: 'mdn',
      source: MDN.transparency,
    },
    {
      platform: 'ipados',
      label: 'Reduce transparency on iPad',
      steps: ['Settings', 'Accessibility', 'Display & Text Size', 'Reduce Transparency'],
      action: 'Turn it on.',
      note: 'iPad browsers don’t pass this on to websites yet.',
      verified: 'mdn',
      source: MDN.transparency,
    },
  ],
  appearance: [
    {
      platform: 'ios',
      label: 'Dark mode on iPhone',
      steps: ['Settings', 'Display & Brightness'],
      action: 'Choose Dark, or Automatic to switch at sunset.',
      verified: 'needs-review',
    },
    {
      platform: 'ipados',
      label: 'Dark mode on iPad',
      steps: ['Settings', 'Display & Brightness'],
      action: 'Choose Dark, or Automatic to switch at sunset.',
      verified: 'needs-review',
    },
    {
      platform: 'macos',
      label: 'Dark mode on a Mac',
      steps: ['System Settings', 'Appearance'],
      action: 'Choose Dark, or Auto.',
      verified: 'needs-review',
    },
    {
      platform: 'windows',
      label: 'Dark mode on Windows 11',
      steps: ['Settings', 'Personalization', 'Colors', 'Choose your mode'],
      action: 'Choose Dark.',
      verified: 'needs-review',
    },
    {
      platform: 'android',
      label: 'Dark theme on Android',
      steps: ['Settings', 'Display', 'Dark theme'],
      action: 'Turn it on.',
      verified: 'needs-review',
    },
    {
      platform: 'linux',
      label: 'Dark style on Linux (GNOME)',
      steps: ['Settings', 'Appearance'],
      action: 'Choose Dark.',
      verified: 'needs-review',
    },
    {
      platform: 'firefox',
      label: 'Website appearance in Firefox',
      steps: ['Settings', 'General', 'Website appearance'],
      action: 'Choose Automatic to follow your device, or pick Light or Dark.',
      verified: 'needs-review',
    },
    {
      platform: 'chrome',
      label: 'Chrome’s own mode setting',
      steps: ['Settings', 'Appearance', 'Mode'],
      action: 'Choose "Device" to follow your system, or pick Light or Dark.',
      verified: 'needs-review',
    },
  ],
  contrast: [
    {
      platform: 'macos',
      label: 'Increase contrast on a Mac',
      steps: ['System Settings', 'Accessibility', 'Display', 'Increase contrast'],
      action: 'Turn it on.',
      verified: 'needs-review',
    },
    {
      platform: 'ios',
      label: 'Increase contrast on iPhone',
      steps: ['Settings', 'Accessibility', 'Display & Text Size', 'Increase Contrast'],
      action: 'Turn it on.',
      verified: 'needs-review',
    },
    {
      platform: 'ipados',
      label: 'Increase contrast on iPad',
      steps: ['Settings', 'Accessibility', 'Display & Text Size', 'Increase Contrast'],
      action: 'Turn it on.',
      verified: 'needs-review',
    },
    {
      platform: 'windows',
      label: 'Contrast themes on Windows 11',
      steps: ['Settings', 'Accessibility', 'Contrast themes'],
      action: 'Pick a theme and apply it.',
      note: 'This also turns on forced colors, which replaces website colors with your theme’s.',
      verified: 'needs-review',
    },
  ],
  'forced-colors': [
    {
      platform: 'windows',
      label: 'Contrast themes on Windows 11',
      steps: ['Settings', 'Accessibility', 'Contrast themes'],
      action: 'Pick a theme and apply it.',
      alternatives: [
        { label: 'Windows 10', steps: ['Settings', 'Ease of Access', 'High contrast'] },
      ],
      verified: 'needs-review',
    },
    {
      platform: 'firefox',
      label: 'Override colors in Firefox',
      steps: ['Settings', 'General', 'Colors', 'Manage Colors…'],
      action: 'Set "Override the colors specified by the page" to Always.',
      verified: 'needs-review',
    },
  ],
  'inverted-colors': [
    {
      platform: 'ios',
      label: 'Invert colors on iPhone',
      steps: ['Settings', 'Accessibility', 'Display & Text Size', 'Smart Invert'],
      action: 'Turn it on.',
      verified: 'needs-review',
    },
    {
      platform: 'macos',
      label: 'Invert colors on a Mac',
      steps: ['System Settings', 'Accessibility', 'Display', 'Invert colors'],
      action: 'Turn it on.',
      verified: 'needs-review',
    },
  ],
  'text-size': [
    {
      platform: 'chrome',
      label: 'Default text size in Chrome',
      steps: ['Settings', 'Appearance', 'Font size'],
      action: 'Pick Large or Very large.',
      verified: 'needs-review',
    },
    {
      platform: 'edge',
      label: 'Default text size in Edge',
      steps: ['Settings', 'Appearance', 'Fonts', 'Font size'],
      action: 'Pick a larger size.',
      verified: 'needs-review',
    },
    {
      platform: 'firefox',
      label: 'Default text size in Firefox',
      steps: ['Settings', 'General', 'Fonts', 'Size'],
      action: 'Pick a larger size.',
      verified: 'needs-review',
    },
    {
      platform: 'safari',
      label: 'Safari',
      steps: ['Safari', 'Settings', 'Websites', 'Page Zoom'],
      action: 'Safari has no default text size setting; page zoom enlarges everything instead.',
      note: 'Zoom works well, but websites can’t tell it apart from a bigger screen.',
      verified: 'needs-review',
    },
  ],
  data: [
    {
      platform: 'android',
      label: 'Data Saver on Android',
      steps: ['Settings', 'Network & internet', 'Data Saver'],
      action: 'Turn it on.',
      note: 'Whether your browser passes this on to websites depends on the browser.',
      verified: 'needs-review',
    },
  ],
  privacy: [
    {
      platform: 'firefox',
      label: 'Global Privacy Control in Firefox',
      steps: ['Settings', 'Privacy & Security', 'Website Privacy Preferences'],
      action: 'Tick "Tell websites not to sell or share my data".',
      verified: 'needs-review',
    },
  ],
};

/** Which instruction platforms suit this visitor, best first: their browser first where the setting lives there, then their OS. */
function preferredPlatforms(platform: PlatformInfo): InstructionPlatform[] {
  const out: InstructionPlatform[] = [];
  if (platform.os !== 'unknown') out.push(platform.os);
  if (platform.browser === 'chrome' || platform.browser === 'brave') out.push('chrome');
  if (platform.browser === 'edge') out.push('edge');
  if (platform.browser === 'firefox') out.push('firefox');
  if (platform.browser === 'safari') out.push('safari');
  return out;
}

/** Settings that live in the browser rather than the OS. */
const BROWSER_FIRST: ReadonlySet<TopicId> = new Set(['text-size', 'privacy']);

export function instructionsFor(
  topic: TopicId,
  platform: PlatformInfo,
): { recommended: InstructionSet[]; others: InstructionSet[] } {
  const all = INSTRUCTIONS[topic] ?? [];
  let order = preferredPlatforms(platform);
  if (BROWSER_FIRST.has(topic)) order = [...order.slice(1), ...order.slice(0, 1)];
  const recommended = order
    .map((p) => all.find((set) => set.platform === p))
    .filter((set): set is InstructionSet => Boolean(set));
  const others = all.filter((set) => !recommended.includes(set));
  return { recommended, others };
}
