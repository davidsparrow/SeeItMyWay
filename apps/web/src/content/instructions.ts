import type { PlatformInfo } from '@simw/types';
import type { TopicId } from './topics';

/**
 * "Show Me How" instructions (PRD A.5): short, visual, platform-specific.
 *
 * Each set records how it was verified. `mdn` sets were checked against the
 * MDN source (github.com/mdn/content) and `vendor` sets against the vendor's
 * own help pages (or, where those are silent, its source code), both in
 * October 2026; `source` names the page. `needs-review` sets come from
 * product knowledge and must be checked before launch; vendors move these
 * menus between versions. See docs/instructions-review.md.
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
  verified: 'mdn' | 'vendor' | 'needs-review';
  /** Where the steps were checked. Required unless `needs-review`. */
  source?: string;
}

const MDN = {
  motion:
    'https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/at-rules/@media/prefers-reduced-motion/index.md',
  transparency:
    'https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/at-rules/@media/prefers-reduced-transparency/index.md',
};

const VENDOR = {
  appleDarkMode: 'https://support.apple.com/en-us/108350',
  appleMacAppearance:
    'https://support.apple.com/guide/mac-help/use-a-light-or-dark-appearance-mchl52e1c2d2/mac',
  appleMacDisplay:
    'https://support.apple.com/guide/mac-help/change-display-settings-for-accessibility-unac089/mac',
  appleMacColors:
    'https://support.apple.com/guide/mac-help/adjust-the-display-colors-mchl11ddd4b3/mac',
  appleIphoneColors: 'https://support.apple.com/guide/iphone/change-display-colors-iph3e2e1fb0/ios',
  appleDisplayTextSize: 'https://support.apple.com/en-us/111773',
  safariZoom: 'https://support.apple.com/guide/safari/zoom-in-on-webpages-ibrw1068/mac',
  windowsColors:
    'https://support.microsoft.com/en-us/windows/experience/personalization/personalize-your-colors-in-windows',
  windowsContrast:
    'https://support.microsoft.com/en-us/accessibility/windows/change-color-contrast-in-windows',
  edgeTextSize:
    'https://support.microsoft.com/en-us/edge/increase-default-text-size-in-microsoft-edge',
  androidDarkTheme: 'https://support.google.com/android/answer/9730472',
  pixelDataSaver: 'https://support.google.com/pixelphone/answer/7055392',
  chromeTextSize: 'https://support.google.com/chrome/answer/96810',
  // Chrome Help documents only the New Tab route; the Settings labels come from Chromium's strings.
  chromeMode:
    'https://chromium.googlesource.com/chromium/src/+/main/chrome/app/settings_strings.grdp',
  gnomeAppearance: 'https://help.gnome.org/gnome-help/look-background.html',
  chromebookAccessibility: 'https://support.google.com/chromebook/answer/177893',
  chromebookDarkTheme: 'https://support.google.com/chromebook/answer/9145848',
  // Firefox 152 redesigned Settings; these pages give both the 152+ and the older paths.
  firefoxAppearance: 'https://support.mozilla.org/kb/change-website-appearance-settings-firefox',
  firefoxContrast: 'https://support.mozilla.org/kb/firefox-contrast-control',
  firefoxFontSize: 'https://support.mozilla.org/kb/font-size-and-zoom-increase-size-of-web-pages',
  firefoxGpc: 'https://support.mozilla.org/kb/global-privacy-control',
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
      platform: 'chromeos',
      label: 'Reduced animations on a Chromebook',
      steps: ['Settings', 'Accessibility', 'Display and magnification', 'Reduced animations'],
      action: 'Turn it on.',
      verified: 'vendor',
      source: VENDOR.chromebookAccessibility,
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
      steps: ['Settings', 'Appearance'],
      action: 'Choose Dark, or Automatic to switch on a schedule.',
      note: 'This is for iOS 27 and later.',
      alternatives: [
        {
          label: 'iOS 26 and earlier',
          steps: ['Settings', 'Display & Brightness'],
          action: 'Choose Dark, or Automatic to switch on a schedule.',
        },
      ],
      verified: 'vendor',
      source: VENDOR.appleDarkMode,
    },
    {
      platform: 'ipados',
      label: 'Dark mode on iPad',
      steps: ['Settings', 'Appearance'],
      action: 'Choose Dark, or Automatic to switch on a schedule.',
      note: 'This is for iPadOS 27 and later.',
      alternatives: [
        {
          label: 'iPadOS 26 and earlier',
          steps: ['Settings', 'Display & Brightness'],
          action: 'Choose Dark, or Automatic to switch on a schedule.',
        },
      ],
      verified: 'vendor',
      source: VENDOR.appleDarkMode,
    },
    {
      platform: 'macos',
      label: 'Dark mode on a Mac',
      steps: ['System Settings', 'Appearance'],
      action: 'Choose Dark, or Auto.',
      verified: 'vendor',
      source: VENDOR.appleMacAppearance,
    },
    {
      platform: 'windows',
      label: 'Dark mode on Windows',
      steps: ['Settings', 'Personalization', 'Colors', 'Choose your mode'],
      action: 'Choose Dark.',
      note: 'The same on Windows 11 and Windows 10.',
      verified: 'vendor',
      source: VENDOR.windowsColors,
    },
    {
      platform: 'android',
      label: 'Dark theme on Android',
      steps: ['Settings', 'Display', 'Dark theme'],
      action: 'Turn it on.',
      alternatives: [
        {
          label: 'Pixel',
          steps: ['Settings', 'Display & touch', 'Dark theme'],
          action: 'Turn it on.',
        },
      ],
      verified: 'vendor',
      source: VENDOR.androidDarkTheme,
    },
    {
      platform: 'chromeos',
      label: 'Dark theme on a Chromebook',
      steps: ['Right-click the desktop', 'Set wallpaper & style', 'Theme'],
      action: 'Choose Dark, or Auto to switch on a schedule.',
      note: 'If Chrome’s own Appearance is set to Light or Dark, websites follow that instead.',
      verified: 'vendor',
      source: VENDOR.chromebookDarkTheme,
    },
    {
      platform: 'linux',
      label: 'Dark style on Linux (GNOME)',
      steps: ['Settings', 'Appearance'],
      action: 'Choose Dark.',
      verified: 'vendor',
      source: VENDOR.gnomeAppearance,
    },
    {
      platform: 'firefox',
      label: 'Website appearance in Firefox',
      steps: ['Settings', 'Appearance', 'Website appearance'],
      action: 'Choose System to follow your device and Firefox theme, or pick Light or Dark.',
      note: 'This is for Firefox 152 and later.',
      alternatives: [
        {
          label: 'Firefox 151 and earlier',
          steps: ['Settings', 'General', 'Language and Appearance', 'Website appearance'],
          action: 'Choose Automatic, or pick Light or Dark.',
        },
      ],
      verified: 'vendor',
      source: VENDOR.firefoxAppearance,
    },
    {
      platform: 'chrome',
      label: 'Chrome’s own mode setting',
      steps: ['Settings', 'Appearance', 'Mode'],
      action: 'Choose "Device" to follow your system, or pick Light or Dark.',
      note: 'Since Chrome 136 websites see this choice too, except in Incognito windows.',
      verified: 'vendor',
      source: VENDOR.chromeMode,
    },
  ],
  contrast: [
    {
      platform: 'macos',
      label: 'Increase contrast on a Mac',
      steps: ['System Settings', 'Accessibility', 'Display', 'Increase contrast'],
      action: 'Turn it on.',
      verified: 'vendor',
      source: VENDOR.appleMacDisplay,
    },
    {
      platform: 'ios',
      label: 'Increase contrast on iPhone',
      steps: ['Settings', 'Accessibility', 'Display & Text Size', 'Increase Contrast'],
      action: 'Turn it on.',
      verified: 'vendor',
      source: VENDOR.appleDisplayTextSize,
    },
    {
      platform: 'ipados',
      label: 'Increase contrast on iPad',
      steps: ['Settings', 'Accessibility', 'Display & Text Size', 'Increase Contrast'],
      action: 'Turn it on.',
      verified: 'vendor',
      source: VENDOR.appleDisplayTextSize,
    },
    {
      platform: 'windows',
      label: 'Contrast themes on Windows 11',
      steps: ['Settings', 'Accessibility', 'Contrast themes'],
      action: 'Pick a theme and apply it.',
      note: 'This also turns on forced colors, which replaces most website colors with your theme’s.',
      verified: 'vendor',
      source: VENDOR.windowsContrast,
    },
  ],
  'forced-colors': [
    {
      platform: 'windows',
      label: 'Contrast themes on Windows 11',
      steps: ['Settings', 'Accessibility', 'Contrast themes'],
      action: 'Pick a theme and apply it.',
      alternatives: [
        {
          label: 'Windows 10',
          steps: ['Settings', 'Ease of Access', 'High contrast'],
          action: 'Turn on "Turn on high contrast", then pick a theme under "Choose a theme".',
        },
      ],
      verified: 'vendor',
      source: VENDOR.windowsContrast,
    },
    {
      platform: 'firefox',
      label: 'Override colors in Firefox',
      steps: ['Settings', 'Accessibility', 'Website contrast'],
      action: 'Set "Override colors" to Custom. "Manage colors" picks the colors.',
      note: 'This is for Firefox 152 and later.',
      alternatives: [
        {
          label: 'Firefox 138 to 151',
          steps: ['Settings', 'General', 'Language and Appearance', 'Contrast Control'],
          action: 'Choose Custom. Firefox 148 to 151 call it "Website contrast".',
        },
      ],
      verified: 'vendor',
      source: VENDOR.firefoxContrast,
    },
  ],
  'inverted-colors': [
    {
      platform: 'ios',
      label: 'Invert colors on iPhone',
      steps: ['Settings', 'Accessibility', 'Display & Text Size', 'Classic Invert'],
      action: 'Turn it on.',
      note: 'Websites can only tell when Classic Invert is on: iPhone browsers don’t pass on Smart Invert.',
      verified: 'vendor',
      source: VENDOR.appleIphoneColors,
    },
    {
      platform: 'macos',
      label: 'Invert colors on a Mac',
      steps: ['System Settings', 'Accessibility', 'Display', 'Invert colors'],
      action: 'Turn it on.',
      verified: 'vendor',
      source: VENDOR.appleMacColors,
    },
  ],
  'text-size': [
    {
      platform: 'chrome',
      label: 'Default text size in Chrome',
      steps: ['Settings', 'Appearance', 'Font size'],
      action: 'Pick Large or Very large.',
      verified: 'vendor',
      source: VENDOR.chromeTextSize,
    },
    {
      platform: 'edge',
      label: 'Default text size in Edge',
      steps: ['Settings', 'Appearance', 'Fonts', 'Font size'],
      action: 'Pick a larger size.',
      verified: 'vendor',
      source: VENDOR.edgeTextSize,
    },
    {
      platform: 'chromeos',
      label: 'Website text size on a Chromebook',
      steps: [
        'Settings',
        'Accessibility',
        'Display and magnification',
        'Website text size and font',
        'Font size',
      ],
      action: 'Pick Large or Very large.',
      note: 'Some websites fix their text size. For those, zoom in with Ctrl and +.',
      verified: 'vendor',
      source: VENDOR.chromebookAccessibility,
    },
    {
      platform: 'firefox',
      label: 'Default text size in Firefox',
      steps: ['Settings', 'Accessibility', 'Fonts', 'Font size'],
      action: 'Pick a larger size.',
      note: 'This is for Firefox 152 and later.',
      alternatives: [
        {
          label: 'Firefox 151 and earlier',
          steps: ['Settings', 'General', 'Language and Appearance', 'Fonts', 'Size'],
          action: 'Pick a larger size.',
        },
      ],
      verified: 'vendor',
      source: VENDOR.firefoxFontSize,
    },
    {
      platform: 'safari',
      label: 'Safari',
      steps: ['Safari', 'Settings', 'Websites', 'Page Zoom', 'When visiting other websites'],
      action: 'Safari has no default text size setting; page zoom enlarges everything instead.',
      note: 'Zoom works well, but websites see a smaller window rather than a text size preference.',
      verified: 'vendor',
      source: VENDOR.safariZoom,
    },
  ],
  data: [
    {
      platform: 'android',
      label: 'Data Saver on Android',
      steps: ['Settings', 'Network & internet', 'Data Saver'],
      action: 'Turn it on.',
      note: 'Chrome passes this on to websites while you’re on mobile data or another metered connection, except in Incognito. Other browsers vary.',
      verified: 'vendor',
      source: VENDOR.pixelDataSaver,
    },
  ],
  privacy: [
    {
      platform: 'firefox',
      label: 'Global Privacy Control in Firefox',
      steps: ['Settings', 'Privacy and security', 'Additional protections'],
      action: 'Tick "Tell websites not to sell or share my data".',
      note: 'This is for Firefox 152 and later.',
      alternatives: [
        {
          label: 'Firefox 120 to 151',
          steps: ['Settings', 'Privacy & Security', 'Website Privacy Preferences'],
          action: 'Tick "Tell websites not to sell or share my data".',
        },
      ],
      verified: 'vendor',
      source: VENDOR.firefoxGpc,
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
