import { useId, type CSSProperties } from 'react';
import type { Experience } from '@simw/protocol';
import type { Environment } from './content';

/** Deterministic PRNG so server and client draw the same sky. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  r: number;
  twinkle: boolean;
  delay: number;
}

const STARS: Star[] = (() => {
  const rand = mulberry32(20261011);
  return Array.from({ length: 150 }, (_, i) => ({
    x: Math.round(rand() * 1200),
    y: Math.round(rand() * 360),
    r: Math.round((0.6 + rand() * rand() * 1.9) * 10) / 10,
    twinkle: i % 4 === 0,
    delay: Math.round(rand() * 28) / 10,
  }));
})();

const CONSTELLATION = [
  [180, 90],
  [240, 70],
  [300, 105],
  [355, 95],
  [395, 140],
  [350, 175],
] as const;

const layer = (depth: number) => ({ '--depth': depth }) as CSSProperties;

export function Sky({ exp, env }: { exp: Experience; env: Environment }) {
  const rich = exp.visualRichness === 'rich';
  const starCount = rich ? STARS.length : 55;
  const desert = env === 'desert';
  // Unique per instance: several skies with different palettes can share a page.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `nl-${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg
      className="nl-sky nl-deco"
      viewBox="0 0 1200 520"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id={id('moon-glow')}>
          <stop offset="0%" stopColor="var(--nl-glow)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--nl-glow)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('aurora-grad')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--nl-accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--nl-accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('shoot-grad')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={id('blur')} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <pattern id={id('grid')} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="var(--nl-glow)"
            strokeOpacity="0.18"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {rich ? (
        <g className="nl-layer nl-drift" style={layer(0.55)}>
          <ellipse
            cx="600"
            cy="170"
            rx="560"
            ry="70"
            transform="rotate(-14 600 170)"
            fill="var(--nl-glow)"
            opacity="0.16"
            filter={url('blur')}
          />
        </g>
      ) : null}

      {env === 'blueprint' && rich ? <rect width="1200" height="520" fill={url('grid')} /> : null}

      <g className="nl-layer" style={layer(0.6)}>
        {STARS.slice(0, starCount).map((s, i) => (
          <circle
            key={i}
            className={s.twinkle ? 'nl-star nl-star-tw' : 'nl-star'}
            cx={s.x}
            cy={s.y}
            r={s.r}
            style={{ '--d': `${s.delay}s` } as CSSProperties}
          />
        ))}
        {env === 'blueprint' ? (
          <g
            className="nl-rich-only"
            stroke="var(--nl-glow)"
            strokeOpacity="0.6"
            strokeDasharray="4 6"
            fill="none"
          >
            <polyline points={CONSTELLATION.map((p) => p.join(',')).join(' ')} />
            {CONSTELLATION.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="var(--nl-glow)" stroke="none" />
            ))}
          </g>
        ) : null}
      </g>

      <g className="nl-layer" style={layer(0.5)}>
        <circle
          cx={desert ? 880 : 960}
          cy={desert ? 180 : 120}
          r={desert ? 170 : 110}
          fill={url('moon-glow')}
          className="nl-rich-only"
        />
        <circle
          cx={desert ? 880 : 960}
          cy={desert ? 180 : 120}
          r={desert ? 62 : 30}
          fill="var(--nl-glow)"
          opacity="0.92"
        />
      </g>

      {env === 'aurora' ? (
        <g className="nl-layer" style={layer(0.45)}>
          <path
            className="nl-aurora"
            d="M-40 300 C 200 140, 380 260, 600 170 S 980 120, 1240 230 L 1240 330 C 980 230, 760 300, 600 280 S 200 260, -40 380 Z"
            fill={url('aurora-grad')}
          />
          <path
            className="nl-aurora nl-rich-only"
            style={{ animationDelay: '-4s' }}
            d="M-40 250 C 260 120, 420 220, 640 140 S 1000 90, 1240 170 L 1240 230 C 1000 160, 760 230, 620 210 S 220 220, -40 300 Z"
            fill={url('aurora-grad')}
            opacity="0.7"
          />
        </g>
      ) : null}

      <line
        className="nl-shooting nl-rich-only"
        x1="1050"
        y1="40"
        x2="1150"
        y2="-10"
        stroke={url('shoot-grad')}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {desert ? (
        <>
          <g className="nl-layer" style={layer(0.3)}>
            <path
              d="M0 410 C 220 360, 420 400, 640 370 S 1000 350, 1200 390 L1200 520 L0 520 Z"
              fill="var(--nl-ridge-far)"
            />
          </g>
          <g className="nl-layer" style={layer(0.12)}>
            <path
              d="M0 460 C 260 420, 480 470, 760 440 S 1060 430, 1200 455 L1200 520 L0 520 Z"
              fill="var(--nl-ridge)"
            />
          </g>
        </>
      ) : (
        <>
          <g className="nl-layer" style={layer(0.3)}>
            <path
              d="M0 400 L120 330 L210 372 L330 300 L450 360 L560 318 L690 380 L820 322 L940 362 L1060 310 L1200 368 L1200 520 L0 520 Z"
              fill="var(--nl-ridge-far)"
            />
          </g>
          <g className="nl-layer" style={layer(0.12)}>
            <path
              d="M0 450 L160 404 L300 436 L470 386 L640 430 L760 408 L900 440 L1040 398 L1200 432 L1200 520 L0 520 Z"
              fill="var(--nl-ridge)"
            />
            {/* The observatory dome on the ridge */}
            <g transform="translate(456 352)">
              <rect x="-22" y="20" width="44" height="22" fill="var(--nl-ridge)" />
              <path d="M-30 22 A30 30 0 0 1 30 22 Z" fill="var(--nl-ridge)" />
              <rect
                x="-4"
                y="-8"
                width="8"
                height="26"
                fill="var(--nl-glow)"
                opacity="0.75"
                transform="rotate(-18)"
              />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}
