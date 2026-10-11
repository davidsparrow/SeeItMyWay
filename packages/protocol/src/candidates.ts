/**
 * Candidate future preferences (PRD Addendum D).
 *
 * The vocabulary should grow from demonstrated demand rather than be
 * invented by the company. Visitors vote on these; the results feed future
 * protocol design. Ids are stable because votes are counted against them.
 */
export const WISHLIST_CANDIDATES = [
  { id: 'never-autoplay-video', label: 'Never autoplay video', emoji: '🎬' },
  { id: 'never-autoplay-audio', label: 'Never autoplay audio', emoji: '🔇' },
  { id: 'larger-controls', label: 'Prefer larger controls', emoji: '👆' },
  { id: 'roomy-layouts', label: 'Prefer roomy layouts', emoji: '↔️' },
  { id: 'compact-layouts', label: 'Prefer compact layouts', emoji: '🗜️' },
  { id: 'step-by-step', label: 'Prefer step-by-step instructions', emoji: '🪜' },
  { id: 'concise', label: 'Prefer concise explanations', emoji: '✂️' },
  { id: 'more-visual', label: 'Prefer more visual explanations', emoji: '🖼️' },
  { id: 'fewer-popups', label: 'Prefer fewer popups', emoji: '🚫' },
  { id: 'simplified-navigation', label: 'Prefer simplified navigation', emoji: '🧭' },
  { id: 'captions', label: 'Prefer captions', emoji: '💬' },
  { id: 'low-data', label: 'Prefer low-data experiences', emoji: '📶' },
] as const;

export type WishlistCandidateId = (typeof WISHLIST_CANDIDATES)[number]['id'];

export const WISHLIST_CANDIDATE_IDS: readonly WishlistCandidateId[] = WISHLIST_CANDIDATES.map(
  (c) => c.id,
);
