import type { NativeSignalId, NativeSignals, SignalNature } from '@simw/types';

/**
 * Plain-English copy for every signal the Browser Checkup reveals.
 *
 * Tone rules (PRD A.3, Addendum C): "Wait, websites already know this?",
 * never "here is your media-query output". Describe what the browser says,
 * never why the visitor might want it (PRD §4: personalize behavior, not
 * identity).
 */

export type TopicId =
  | 'appearance'
  | 'motion'
  | 'contrast'
  | 'transparency'
  | 'forced-colors'
  | 'inverted-colors'
  | 'text-size'
  | 'data'
  | 'interaction'
  | 'privacy';

export type DemoKind =
  | 'motion'
  | 'appearance'
  | 'contrast'
  | 'transparency'
  | 'forced-colors'
  | 'inverted-colors'
  | 'text-size'
  | 'data'
  | 'interaction';

export interface TopicState {
  headline: string;
  body: string;
  /** Short phrase for "Your web currently says:" */
  summary: string;
  /** Shown when the visitor changes a setting and lands on this value. */
  celebrate?: string;
}

export interface Topic {
  id: TopicId;
  /** The signal used for events and change detection. */
  signal: NativeSignalId;
  icon: string;
  title: string;
  nature: SignalNature;
  /** Can the visitor change this somewhere (OS/browser settings)? */
  changeable: boolean;
  meaning: string;
  sitesCanDo: string[];
  technical: string;
  demo: DemoKind | null;
  /** What to search for in Settings if the menus look different. */
  searchHint?: string;
  /** Hide the card entirely when unsupported (instead of listing it as unavailable). */
  hideWhenUnsupported?: boolean;
  unsupported: string;
  state(signals: NativeSignals): TopicState | null;
}

const fontPx = (signals: NativeSignals) =>
  typeof signals['default-font-size'].raw === 'number'
    ? Math.round(signals['default-font-size'].raw)
    : null;

export const TOPICS: Topic[] = [
  {
    id: 'appearance',
    signal: 'prefers-color-scheme',
    icon: '🌙',
    title: 'Appearance',
    nature: 'preference',
    changeable: true,
    meaning:
      'Your device has a light or dark appearance setting, and your browser passes it on to every website you visit. A site that listens can switch to a matching theme automatically, so you never have to hunt for its little moon icon.',
    sitesCanDo: [
      'Open in dark mode straight away: no bright "flashbang" at night',
      'Pick images and illustrations that suit a dark background',
      'Follow along live when your device switches at sunset',
    ],
    technical: 'CSS media feature prefers-color-scheme (Media Queries Level 5).',
    demo: 'appearance',
    searchHint: 'Dark mode',
    unsupported: 'This browser doesn’t tell websites about light or dark mode.',
    state(signals) {
      const v = signals['prefers-color-scheme'].value;
      if (v === 'dark')
        return {
          headline: 'Dark mode preferred',
          body: 'Websites can detect that you prefer a dark interface.',
          summary: 'Prefer dark',
          celebrate: 'Your browser now asks websites for dark mode.',
        };
      if (v === 'light')
        return {
          headline: 'Light (or no preference)',
          body: 'Your device isn’t asking for dark mode, so websites assume light.',
          summary: 'Light',
          celebrate: 'Your browser now asks websites for a light interface.',
        };
      return null;
    },
  },
  {
    id: 'motion',
    signal: 'prefers-reduced-motion',
    icon: '🎢',
    title: 'Motion',
    nature: 'preference',
    changeable: true,
    meaning:
      'There’s a setting that tells websites to stop moving so much. It lives in your device’s accessibility settings, but it’s for anyone who’d rather things didn’t slide, spin, zoom and parallax-scroll everywhere. About half of all web pages already contain code that listens for it.',
    sitesCanDo: [
      'Swap sliding, spinning and zooming effects for gentle fades',
      'Turn off parallax scrolling',
      'Stop carousels and background videos from moving on their own',
    ],
    technical: 'CSS media feature prefers-reduced-motion (Media Queries Level 5).',
    demo: 'motion',
    searchHint: 'Reduce motion',
    unsupported: 'This browser doesn’t pass on a motion preference.',
    state(signals) {
      const v = signals['prefers-reduced-motion'].value;
      if (v === 'reduce')
        return {
          headline: 'Reduced motion requested',
          body: 'Compatible websites can tone down animations, parallax and auto-playing effects for you.',
          summary: 'Less motion',
          celebrate: 'Your browser now asks websites for reduced motion.',
        };
      if (v === 'no-preference')
        return {
          headline: 'Full motion currently allowed',
          body: 'Compatible websites may show animations, parallax effects and animated transitions.',
          summary: 'Motion allowed',
          celebrate: 'Your browser now allows websites full motion again.',
        };
      return null;
    },
  },
  {
    id: 'contrast',
    signal: 'prefers-contrast',
    icon: '◐',
    title: 'Contrast',
    nature: 'preference',
    changeable: true,
    meaning:
      'Your device can ask websites for stronger contrast: darker text, clearer edges, fewer pale greys. Few sites listen yet (about 1% of pages), which is exactly the kind of gap SeeItMyWay exists to close.',
    sitesCanDo: [
      'Darken pale grey text and thin borders',
      'Make buttons and links stand out clearly',
      'Drop see-through and low-contrast decorative effects',
    ],
    technical: 'CSS media feature prefers-contrast: no-preference | more | less | custom.',
    demo: 'contrast',
    searchHint: 'Increase contrast',
    unsupported: 'This browser doesn’t pass on a contrast preference.',
    state(signals) {
      const v = signals['prefers-contrast'].value;
      if (v === 'more')
        return {
          headline: 'More contrast requested',
          body: 'Compatible websites can use stronger colors and clearer edges for you.',
          summary: 'More contrast',
          celebrate: 'Your browser now asks websites for more contrast.',
        };
      if (v === 'less')
        return {
          headline: 'Less contrast requested',
          body: 'Compatible websites can soften harsh contrast for you.',
          summary: 'Softer contrast',
          celebrate: 'Your browser now asks websites for softer contrast.',
        };
      if (v === 'custom')
        return {
          headline: 'Custom colors in use',
          body: 'Your device is using its own color palette, and websites can tell.',
          summary: 'Custom colors',
        };
      if (v === 'no-preference')
        return {
          headline: 'Standard',
          body: 'You have not requested increased contrast.',
          summary: 'Standard contrast',
          celebrate: 'Your browser is back to standard contrast.',
        };
      return null;
    },
  },
  {
    id: 'transparency',
    signal: 'prefers-reduced-transparency',
    icon: '🪟',
    title: 'Transparency',
    nature: 'preference',
    changeable: true,
    meaning:
      'Even all that glassy, see-through UI can be a preference. Your device can ask for solid backgrounds instead of frosted glass, so text never sits on top of a blurry mess.',
    sitesCanDo: [
      'Replace frosted-glass menus with solid ones',
      'Keep text off busy, see-through backgrounds',
    ],
    technical: 'CSS media feature prefers-reduced-transparency (supported in Chrome and Edge).',
    demo: 'transparency',
    searchHint: 'Reduce transparency',
    unsupported:
      'This browser doesn’t pass on a transparency preference yet. Chrome and Edge do; Safari and Firefox don’t.',
    state(signals) {
      const v = signals['prefers-reduced-transparency'].value;
      if (v === 'reduce')
        return {
          headline: 'Reduced transparency requested',
          body: 'Compatible websites can use solid surfaces instead of see-through glass.',
          summary: 'Solid, not glassy',
          celebrate: 'Your browser now asks websites for less transparency.',
        };
      if (v === 'no-preference')
        return {
          headline: 'Standard',
          body: 'Your device is not currently requesting reduced transparency.',
          summary: 'Transparency allowed',
          celebrate: 'Your browser now allows see-through effects again.',
        };
      return null;
    },
  },
  {
    id: 'forced-colors',
    signal: 'forced-colors',
    icon: '🎨',
    title: 'Forced colors',
    nature: 'preference',
    changeable: true,
    meaning:
      'Some devices can replace every website’s colors with a palette you choose, like Windows contrast themes. When it’s on, your device takes over, and good websites make small tweaks so nothing important disappears.',
    sitesCanDo: [
      'Keep icons, focus rings and borders visible in your palette',
      'Avoid hiding meaning in color alone',
    ],
    technical: 'CSS media feature forced-colors: none | active.',
    demo: 'forced-colors',
    searchHint: 'Contrast themes',
    unsupported: 'This browser doesn’t report forced-colors mode.',
    state(signals) {
      const v = signals['forced-colors'].value;
      if (v === 'active')
        return {
          headline: 'Forced colors on',
          body: 'Your device is replacing website colors with its own palette.',
          summary: 'Forced colors',
          celebrate: 'Your device is now forcing its own colors on websites.',
        };
      if (v === 'none')
        return {
          headline: 'Off',
          body: 'Websites are showing their own colors.',
          summary: 'Site colors',
          celebrate: 'Websites are back to their own colors.',
        };
      return null;
    },
  },
  {
    id: 'inverted-colors',
    signal: 'inverted-colors',
    icon: '🔄',
    title: 'Inverted colors',
    nature: 'preference',
    changeable: true,
    hideWhenUnsupported: true,
    meaning:
      'Apple devices can invert every color on screen. Safari tells websites when that’s happening, so a careful site can flip photos back so faces don’t look like film negatives.',
    sitesCanDo: [
      'Re-invert photos and videos so they look normal',
      'Tone down shadows that would turn into glows',
    ],
    technical: 'CSS media feature inverted-colors (Safari only).',
    demo: 'inverted-colors',
    searchHint: 'Invert colors',
    unsupported: 'Only Safari tells websites about inverted colors.',
    state(signals) {
      const v = signals['inverted-colors'].value;
      if (v === 'inverted')
        return {
          headline: 'Colors inverted',
          body: 'Websites can tell your screen colors are inverted.',
          summary: 'Inverted colors',
          celebrate: 'Your browser now tells websites your colors are inverted.',
        };
      if (v === 'none')
        return {
          headline: 'Off',
          body: 'Your screen colors are not inverted.',
          summary: 'Normal colors',
        };
      return null;
    },
  },
  {
    id: 'text-size',
    signal: 'default-font-size',
    icon: '🔠',
    title: 'Text size',
    nature: 'preference',
    changeable: true,
    meaning:
      'Many browsers let you choose a default text size. Websites built the considerate way size everything relative to it, so turning it up makes their text larger everywhere, without zooming the whole page.',
    sitesCanDo: [
      'Scale text from your chosen default instead of a fixed size',
      'Reflow layouts so larger text still fits',
    ],
    technical:
      'The computed size of font-size: medium, which browsers map to your default font size.',
    demo: 'text-size',
    searchHint: 'Font size',
    unsupported: 'We couldn’t measure your browser’s default text size.',
    state(signals) {
      const v = signals['default-font-size'].value;
      const px = fontPx(signals);
      const size = px ? ` (${px}px)` : '';
      if (v === 'standard')
        return {
          headline: `Standard${size}`,
          body: 'Your browser uses the usual default text size.',
          summary: 'Standard text',
          celebrate: 'Your browser’s default text size is back to standard.',
        };
      if (v === 'larger' || v === 'largest')
        return {
          headline: `${v === 'largest' ? 'Much larger' : 'Larger'} default text${size}`,
          body: 'Websites that size text relative to your default will show it larger.',
          summary: 'Larger text',
          celebrate: 'Your browser now asks websites for larger text.',
        };
      if (v === 'smaller')
        return {
          headline: `Smaller default text${size}`,
          body: 'Websites that size text relative to your default will show it smaller.',
          summary: 'Smaller text',
          celebrate: 'Your browser now asks websites for smaller text.',
        };
      return null;
    },
  },
  {
    id: 'data',
    signal: 'save-data',
    icon: '📶',
    title: 'Data saver',
    nature: 'preference',
    changeable: true,
    meaning:
      'Some browsers can ask websites to go easy on your data: smaller images, no auto-playing video, fewer extras. It’s handy on a slow or expensive connection.',
    sitesCanDo: [
      'Send smaller images',
      'Hold videos until you tap play',
      'Skip optional downloads like background animations',
    ],
    technical:
      'Save-Data client hint (navigator.connection.saveData). The prefers-reduced-data media query is still experimental.',
    demo: 'data',
    searchHint: 'Data Saver',
    unsupported: 'This browser doesn’t tell websites about data-saving preferences.',
    state(signals) {
      const v = signals['save-data'].value;
      if (v === 'on')
        return {
          headline: 'Data saver on',
          body: 'Websites can send you lighter pages.',
          summary: 'Save my data',
          celebrate: 'Your browser now asks websites to save your data.',
        };
      if (v === 'off')
        return {
          headline: 'Off',
          body: 'Your browser isn’t asking websites to save data.',
          summary: 'Full data',
          celebrate: 'Your browser stopped asking websites to save data.',
        };
      return null;
    },
  },
  {
    id: 'interaction',
    signal: 'pointer',
    icon: '👆',
    title: 'Interaction',
    nature: 'environment',
    changeable: false,
    meaning:
      'Websites can tell whether you’re mostly tapping a touchscreen or pointing with a mouse or trackpad, and whether hovering is possible. That’s a fact about your device, not a preference, and SeeItMyWay never treats it as one.',
    sitesCanDo: [
      'Make buttons big enough for fingers on touchscreens',
      'Avoid hiding things behind hover where you can’t hover',
    ],
    technical: 'CSS media features pointer and hover (plus any-pointer and any-hover).',
    demo: 'interaction',
    unsupported: 'This browser doesn’t report how you point at things.',
    state(signals) {
      const pointer = signals.pointer.value;
      const hover = signals.hover.value;
      if (pointer === 'coarse')
        return {
          headline: 'Touch-first',
          body: 'This device primarily uses touch.',
          summary: 'Touch interface',
        };
      if (pointer === 'fine')
        return {
          headline: hover === 'hover' ? 'Mouse or trackpad' : 'Precise pointer, no hover',
          body:
            hover === 'hover'
              ? 'Your device can point precisely and hover over things.'
              : 'Your device points precisely but can’t hover.',
          summary: hover === 'hover' ? 'Mouse & hover' : 'Precise pointer',
        };
      if (pointer === 'none')
        return {
          headline: 'No pointer',
          body: 'This device is used without a pointer, for example by keyboard or remote.',
          summary: 'Keyboard or remote',
        };
      return null;
    },
  },
  {
    id: 'privacy',
    signal: 'global-privacy-control',
    icon: '🛡️',
    title: 'Privacy signal',
    nature: 'preference',
    changeable: true,
    meaning:
      'Global Privacy Control is the closest thing the web has to what SeeItMyWay proposes: you set one preference in your browser, and every participating website receives it. It’s about privacy rather than experience, but it proves the idea works.',
    sitesCanDo: [
      'Treat the signal as a request not to sell or share your personal data',
      'Honor it automatically, without asking you again',
    ],
    technical: 'navigator.globalPrivacyControl and the Sec-GPC request header (W3C Working Draft).',
    demo: null,
    searchHint: 'Tell websites not to sell or share my data',
    unsupported:
      'This browser doesn’t send a Global Privacy Control signal. Firefox, Brave and DuckDuckGo can.',
    state(signals) {
      const v = signals['global-privacy-control'].value;
      if (v === 'on')
        return {
          headline: 'Privacy signal on',
          body: 'Your browser asks websites not to sell or share your personal data.',
          summary: 'Don’t sell my data',
          celebrate: 'Your browser now asks websites not to sell or share your data.',
        };
      if (v === 'off')
        return {
          headline: 'Off',
          body: 'Your browser can send this signal but isn’t right now.',
          summary: 'No privacy signal',
        };
      return null;
    },
  },
];

export function topicForSignal(id: NativeSignalId): Topic | undefined {
  return TOPICS.find((t) => t.signal === id);
}

export function isTopicSupported(topic: Topic, signals: NativeSignals): boolean {
  return signals[topic.signal].supported;
}
