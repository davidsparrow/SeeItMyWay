/**
 * Copy for Northlight Observatory, the fictional participating website used
 * in every demo. Content-detail and instruction preferences pick between
 * genuinely different versions of the same material. They're equivalent
 * experiences, not a "lite" punishment.
 */

export type Tone = 'serious' | 'balanced' | 'playful';

export const ENVIRONMENTS = ['observatory', 'blueprint', 'aurora', 'desert'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  observatory: 'Brass observatory',
  blueprint: 'Blueprint workshop',
  aurora: 'Aurora night',
  desert: 'Desert moonrise',
};

export const ENVIRONMENT_SHORT: Record<Environment, string> = {
  observatory: 'Brass',
  blueprint: 'Blueprint',
  aurora: 'Aurora',
  desert: 'Desert',
};

export const HERO = {
  eyebrow: 'Northlight Observatory · Open tonight, 7pm to midnight',
  title: {
    serious: 'The sky is open tonight.',
    balanced: 'The sky is open tonight.',
    playful: 'Come say hi to Saturn.',
  },
  lede: {
    brief: 'Clear skies, a bright Moon and Saturn rising. Telescopes open at 7.',
    standard:
      'Clear skies are forecast until midnight. Saturn rises in the south-east just after 7:40pm, and our big refractor will be pointed at it all evening.',
    detailed:
      'Clear skies are forecast until midnight, with steady air after 9pm, which is the best seeing we’ve had all month. Saturn rises in the south-east just after 7:40pm. Our 1910 refractor will follow it all evening, and volunteers will be on the roof with smaller telescopes for the Moon and the Pleiades.',
  },
};

export const NAV_ITEMS = {
  compact: ['Visit', 'Tonight', 'Exhibits', 'Events', 'Learn', 'Shop', 'Members'],
  standard: ['Visit', 'Tonight’s sky', 'Exhibits', 'Events'],
  simplified: ['Plan a visit', 'What’s on'],
} as const;

export interface TonightItem {
  icon: string;
  playfulIcon: string;
  label: string;
  value: string;
  line: string;
  why: string;
  tip: string;
}

export const TONIGHT: TonightItem[] = [
  {
    icon: '◐',
    playfulIcon: '🌔',
    label: 'Moon',
    value: 'Waxing gibbous · 78%',
    line: 'Sets at 2:14am',
    why: 'A bright Moon washes out faint galaxies but makes craters along its shadow line pop in a telescope.',
    tip: 'Look along the terminator, the line between light and shadow.',
  },
  {
    icon: '♄',
    playfulIcon: '🪐',
    label: 'Saturn',
    value: 'Rises 7:42pm',
    line: 'South-east, steady pale gold',
    why: 'Even a small telescope shows the rings. Their tilt changes over a 15-year cycle, so they never look quite the same two years running.',
    tip: 'Planets don’t twinkle; that’s how to tell Saturn from a star.',
  },
  {
    icon: '◎',
    playfulIcon: '🔭',
    label: 'Seeing',
    value: 'Good · 4 of 5',
    line: 'Steady air after 9pm',
    why: '"Seeing" measures how still the air is. Steadier air means sharper detail at high magnification.',
    tip: 'Fine detail is clearest after the ground has cooled.',
  },
  {
    icon: '◷',
    playfulIcon: '⏰',
    label: 'Best window',
    value: '9:30–11:00pm',
    line: 'Darkest sky before moonset glare',
    why: 'Between twilight ending and the Moon climbing high, the sky is at its darkest and Saturn is well clear of the horizon.',
    tip: 'Arrive 20 minutes early to let your eyes adjust to the dark.',
  },
];

export const HOWTO = {
  title: 'How to spot Saturn tonight',
  concise:
    'Look south-east after 9pm: Saturn is the steady, pale-gold point of light that doesn’t twinkle.',
  standard: [
    'Face south-east after 9pm.',
    'Find the brightest steady, pale-gold point about a fist-width above the horizon.',
    'Hold binoculars still against a wall: you’ll see it’s an oval, not a dot. Those are the rings.',
  ],
  stepByStep: [
    {
      step: 'Wait until after 9pm',
      detail: 'Saturn will be about 15° up: roughly one and a half fist-widths at arm’s length.',
    },
    {
      step: 'Find south-east',
      detail: 'If you can see where the Sun set, turn so it’s behind your right shoulder.',
    },
    {
      step: 'Let your eyes adjust',
      detail: 'Put your phone away for 10 minutes. Even a quick glance resets your night vision.',
    },
    {
      step: 'Look for a light that doesn’t twinkle',
      detail: 'Stars shimmer; planets shine steadily. Saturn is pale gold, not white or blue.',
    },
    {
      step: 'Steady your binoculars',
      detail: 'Rest your elbows on a car roof or wall. Shaky hands turn Saturn into a smear.',
    },
    {
      step: 'Spot the rings',
      detail:
        'At 10x you’ll see an oval instead of a dot. At our telescopes, you’ll see the gap between ring and planet.',
    },
  ],
};

export const ARTICLE = {
  title: 'Why do stars twinkle, but planets don’t?',
  brief: [
    'Starlight arrives as a single point, so every ripple in our atmosphere makes it flicker. Planets are close enough to be tiny discs, and the flickers average out.',
  ],
  standard: [
    'Every star except the Sun is so far away that its light reaches us as a single point. On its way down, that point passes through layers of air at different temperatures, each bending the light slightly differently. The star seems to jump and change color: it twinkles.',
    'Planets are much closer. Through the air they’re still tiny, but they’re discs, not points. Each part of the disc twinkles on its own, and together the flickers cancel out. That’s why Saturn shines with a steady, calm light.',
  ],
  detailed: [
    'Every star except the Sun is so far away that its light reaches us as a single point. On its way down, that point passes through layers of air at different temperatures, each bending the light slightly differently. The star seems to jump and change color: it twinkles. Astronomers call this scintillation.',
    'Planets are much closer. Through the air they’re still tiny, but they’re discs, not points. Each part of the disc twinkles on its own, and together the flickers cancel out. That’s why Saturn shines with a steady, calm light.',
    'Twinkling is worst near the horizon, where light travels through the most air. A star low in the south-east can flash red, green and white like a beacon. People regularly report it as a UFO.',
    'It’s also why observatories are built on mountains, and why the largest telescopes use adaptive optics: deformable mirrors that can change shape up to a thousand times a second to undo the atmosphere’s blur.',
  ],
  facts: [
    {
      value: '1,000×',
      label: 'a second: how often adaptive optics can reshape a telescope mirror',
    },
    {
      value: '~280,000 km',
      label: 'across Saturn\u2019s main rings, which are mostly only tens of metres thick',
    },
    { value: '2,500 m+', label: 'altitude of many of the world\u2019s major observatories' },
  ],
};

export const EVENTS = [
  {
    when: 'Fri · 8pm',
    title: 'Saturn Night',
    blurb: 'Rings, moons and hot chocolate on the observation deck.',
    tag: 'All ages',
  },
  {
    when: 'Sat · 11am',
    title: 'Little Astronomers',
    blurb: 'A 30-minute planetarium show for under-8s, lights half-up.',
    tag: 'Families',
  },
  {
    when: 'Oct 21 · 11pm',
    title: 'Orionids Meteor Watch',
    blurb: 'Bring a blanket. We’ll bring the sky and the flasks.',
    tag: 'Outdoors',
  },
  {
    when: 'Sun · 2pm',
    title: 'Telescope 101',
    blurb: 'Bring yours, or borrow ours, and learn to find anything.',
    tag: 'Workshop',
  },
];

export const TIMELAPSE_CAPTIONS = [
  'Every star you can see is circling one point: Polaris, the North Star.',
  'It isn’t the stars moving. It’s us: Earth turns once a day.',
  'This timelapse squeezes four hours above our dome into twenty seconds.',
];
