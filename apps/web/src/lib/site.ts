/** Storage namespace for SeeItMyWay's own site (its local Tune settings, boot snapshot). */
export const SITE_ID = 'seeitmyway';

/** Northlight is the fictional "participating website" used in demos. It gets its own namespace. */
export const NORTHLIGHT_SITE_ID = 'northlight.example';

/** Local-only keys used by the Checkup itself. Never sent anywhere. */
export const CHECKUP_KEYS = {
  lastSnapshot: 'simw:checkup:last-snapshot',
  research: 'simw:checkup:research',
  wishlist: 'simw:wishlist:votes',
  suggestions: 'simw:wishlist:suggestions',
  cardChoices: 'simw:card:choices',
  northlightTone: 'simw:site:northlight.example:tone',
} as const;
