import type { PreferenceKey } from '@simw/protocol';

/** Phrases for the shareable "My Web Wants" card (Addendum E). */
export const CARD_PHRASES: { [K in PreferenceKey]: Record<string, string> } = {
  colorScheme: { system: '🖥️ Follows my device', light: '☀️ Light', dark: '🌙 Dark' },
  motion: { full: '🎢 Full motion', reduced: '🎢 Less motion', minimal: '🧘 Keep it still' },
  density: { compact: '🗜️ Compact', standard: '▦ Standard spacing', roomy: '↔️ Roomy' },
  textSize: { standard: '🔤 Standard text', larger: '🔠 Larger text', largest: '🔠 Largest text' },
  navigation: {
    compact: '🧭 Show me everything',
    standard: '🧭 Standard menus',
    simplified: '🧭 Simple navigation',
  },
  autoplay: {
    allowed: '▶️ Autoplay is fine',
    muted: '🔈 Muted autoplay only',
    never: '🔇 No autoplay',
  },
  detail: { brief: '✂️ Just the gist', standard: '📄 Standard detail', detailed: '📖 More detail' },
  visualRichness: {
    minimal: '◻️ Minimal visuals',
    standard: '🖼️ Standard visuals',
    rich: '🎨 Rich visuals',
  },
  instructions: {
    concise: '⚡ Quick instructions',
    standard: '📝 Standard instructions',
    'step-by-step': '🪜 Step-by-step',
  },
  captions: {
    default: '💬 Captions: site default',
    prefer: '💬 Captions on',
    always: '💬 Captions, always',
  },
  controls: { standard: '👆 Standard buttons', larger: '👆 Bigger buttons' },
};

export function cardPhrase(key: PreferenceKey, value: string): string {
  return CARD_PHRASES[key][value] ?? value;
}

export const CARD_TITLE = 'My Web Wants';
export const CARD_FOOTER = 'What does yours say? · SeeItMyWay';
