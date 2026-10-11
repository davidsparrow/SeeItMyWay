'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  allowsAutoAdvance,
  allowsParallax,
  allowsTranslucency,
  autoplayMode,
  experienceToProps,
  loadsHeavyMediaAutomatically,
  revealsOnHover,
  showCaptions,
} from '@simw/adapters';
import {
  VOCABULARY,
  type Experience,
  type ExperienceKey,
  type ExperienceSources,
  type Layer,
} from '@simw/protocol';
import {
  ARTICLE,
  ENVIRONMENTS,
  HERO,
  HOWTO,
  NAV_ITEMS,
  TONIGHT,
  type Environment,
  type Tone,
} from './content';
import { EventsCarousel } from './events';
import { Sky } from './sky';
import { Timelapse } from './timelapse';
import './northlight.css';

export type NorthlightSection =
  'nav' | 'hero' | 'tonight' | 'timelapse' | 'howto' | 'article' | 'events' | 'footer';

const ALL_SECTIONS: NorthlightSection[] = [
  'nav',
  'hero',
  'tonight',
  'timelapse',
  'howto',
  'article',
  'events',
  'footer',
];

export interface NorthlightSiteProps {
  experience: Experience;
  /** Where each value came from; enables "why" in annotations. */
  sources?: ExperienceSources;
  tone?: Tone;
  /** Show small "what adapted" notes on each section. */
  annotate?: boolean;
  sections?: NorthlightSection[];
  /** Render inside a fake browser window with its own scroll area. */
  framed?: { height: number | string; url?: string } | false;
  /** Checkup demo approximations of OS-level modes a web page can't truly simulate. */
  simulate?: { forcedColors?: boolean; invertedColors?: boolean };
  className?: string;
}

const SOURCE_WORDS: Record<Layer, string> = {
  native: 'your device',
  'site-override': 'set on this site',
  passport: 'your Passport',
  'site-default': 'site design',
  seed: 'random variation',
  'protocol-default': 'default',
};

function useNotes(exp: Experience, sources: ExperienceSources | undefined, enabled: boolean) {
  return (items: Array<[string, ExperienceKey | null]>): ReactNode => {
    if (!enabled) return null;
    return (
      <div className="nl-notes" aria-label="What adapted on this section">
        {items.map(([text, key]) => {
          const from = key && sources ? SOURCE_WORDS[sources[key]] : null;
          return (
            <span key={text} className="nl-note">
              ✨ {text}
              {from && from !== 'default' ? <span style={{ opacity: 0.7 }}>· {from}</span> : null}
            </span>
          );
        })}
      </div>
    );
  };
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="nl-brand-mark" aria-hidden>
      <path d="M4 26h24v2H4z" fill="currentColor" />
      <path d="M7 26v-6a9 9 0 0 1 18 0v6z" fill="currentColor" opacity="0.85" />
      <path d="M15 8.5 22 4l1.4 2.2-7 4.4z" fill="currentColor" />
      <circle cx="26" cy="6" r="1.4" fill="currentColor" />
    </svg>
  );
}

function Nav({ exp, notes }: { exp: Experience; notes: ReturnType<typeof useNotes> }) {
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS[exp.navigation];
  return (
    <header className="nl-nav">
      <div className="nl-wrap">
        <div className="nl-nav-inner">
          <a href="#nl-top" className="nl-brand" onClick={(e) => e.preventDefault()}>
            <BrandMark />
            Northlight Observatory
          </a>
          <ul className="nl-links">
            {items.map((item) => (
              <li key={item}>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  {item}
                </a>
              </li>
            ))}
          </ul>
          {exp.navigation === 'compact' ? (
            <a
              href="#"
              className="nl-btn nl-btn-primary nl-nav-cta"
              onClick={(e) => e.preventDefault()}
            >
              Tickets
            </a>
          ) : exp.navigation === 'standard' ? (
            <a
              href="#"
              className="nl-btn nl-btn-primary nl-nav-cta"
              onClick={(e) => e.preventDefault()}
            >
              Plan a visit
            </a>
          ) : null}
          <button
            type="button"
            className="nl-icon-btn nl-menu-btn"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            ☰ <span style={{ marginLeft: '0.35em' }}>Menu</span>
          </button>
        </div>
        <nav className="nl-menu-panel" data-open={open} aria-label="Northlight menu">
          {items.map((item) => (
            <a key={item} href="#" onClick={(e) => e.preventDefault()}>
              {item}
            </a>
          ))}
        </nav>
        {notes([
          [`${VOCABULARY.navigation.valueLabels[exp.navigation]} navigation`, 'navigation'],
          [
            allowsTranslucency(exp) ? 'Glass menu bar' : 'Solid menu bar',
            allowsTranslucency(exp) ? null : 'transparency',
          ],
        ])}
      </div>
    </header>
  );
}

function Hero({
  exp,
  tone,
  env,
  notes,
}: {
  exp: Experience;
  tone: Tone;
  env: Environment;
  notes: ReturnType<typeof useNotes>;
}) {
  return (
    <section className="nl-hero" aria-labelledby="nl-hero-title">
      <Sky exp={exp} env={env} />
      <div className="nl-wrap nl-hero-content">
        {notes([
          [
            `${VOCABULARY.visualRichness.valueLabels[exp.visualRichness]} visuals`,
            'visualRichness',
          ],
          [allowsParallax(exp) ? 'Parallax & twinkling stars' : 'Still sky, no parallax', 'motion'],
        ])}
        <div className="nl-hero-panel">
          <p className="nl-kicker" style={{ color: 'inherit', opacity: 0.85 }}>
            {HERO.eyebrow}
          </p>
          <h1 id="nl-hero-title">
            {HERO.title[tone]}
            {tone === 'playful' ? ' 🪐' : ''}
          </h1>
          <p className="nl-lede">{HERO.lede[exp.detail]}</p>
          <div className="nl-hero-ctas">
            <a href="#" className="nl-btn nl-btn-primary" onClick={(e) => e.preventDefault()}>
              Plan a visit
            </a>
            <a
              href="#nl-tonight"
              className="nl-btn nl-btn-ghost"
              onClick={(e) => e.preventDefault()}
            >
              Tonight&rsquo;s sky
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tonight({
  exp,
  tone,
  notes,
}: {
  exp: Experience;
  tone: Tone;
  notes: ReturnType<typeof useNotes>;
}) {
  const hoverTips = revealsOnHover(exp);
  return (
    <section className="nl-section nl-enter" id="nl-tonight" aria-labelledby="nl-tonight-title">
      <div className="nl-wrap">
        {notes([
          [`${VOCABULARY.density.valueLabels[exp.density]} layout`, 'density'],
          [hoverTips ? 'Tips on hover' : 'Tips shown inline (no hover here)', 'pointer'],
          [`${VOCABULARY.detail.valueLabels[exp.detail]} detail`, 'detail'],
        ])}
        <p className="nl-kicker">Tonight</p>
        <h2 className="nl-h2" id="nl-tonight-title">
          Tonight&rsquo;s sky {tone === 'playful' ? '✨' : ''}
        </h2>
        <div className="nl-grid">
          {TONIGHT.map((item) => (
            <article key={item.label} className="nl-card">
              <span className="nl-card-icon" aria-hidden>
                {tone === 'playful' ? item.playfulIcon : item.icon}
              </span>
              <p className="nl-card-label">{item.label}</p>
              <p className="nl-card-value">{item.value}</p>
              {exp.detail !== 'brief' ? <p className="nl-card-line">{item.line}</p> : null}
              {exp.detail === 'detailed' ? <p className="nl-card-why">{item.why}</p> : null}
              {hoverTips ? (
                <>
                  <button
                    type="button"
                    className="nl-tip-trigger"
                    aria-label={`Tip: ${item.label}`}
                  >
                    i
                  </button>
                  <span className="nl-tip" role="tooltip">
                    {item.tip}
                  </span>
                </>
              ) : (
                <p className="nl-tip-inline">💡 {item.tip}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelapseSection({ exp, notes }: { exp: Experience; notes: ReturnType<typeof useNotes> }) {
  const mode = autoplayMode(exp);
  return (
    <section className="nl-section nl-enter" aria-labelledby="nl-tl-title">
      <div className="nl-wrap">
        {notes([
          [
            mode === 'off'
              ? 'Video waits for you'
              : mode === 'play-muted'
                ? 'Autoplays muted'
                : 'Autoplays',
            'autoplay',
          ],
          [showCaptions(exp) ? 'Captions on' : 'Captions off by default', 'captions'],
          ...(loadsHeavyMediaAutomatically(exp)
            ? []
            : [['Held back to save data', 'data'] as [string, ExperienceKey]]),
        ])}
        <p className="nl-kicker">From the roof</p>
        <h2 className="nl-h2" id="nl-tl-title">
          Four hours of sky in twenty seconds
        </h2>
        <Timelapse exp={exp} />
      </div>
    </section>
  );
}

function HowTo({ exp, notes }: { exp: Experience; notes: ReturnType<typeof useNotes> }) {
  const [done, setDone] = useState<boolean[]>(() => HOWTO.stepByStep.map(() => false));
  const completed = done.filter(Boolean).length;
  return (
    <section className="nl-section nl-enter" aria-labelledby="nl-howto-title">
      <div className="nl-wrap nl-measure">
        {notes([
          [`${VOCABULARY.instructions.valueLabels[exp.instructions]} instructions`, 'instructions'],
        ])}
        <p className="nl-kicker">Do it yourself</p>
        <h2 className="nl-h2" id="nl-howto-title">
          {HOWTO.title}
        </h2>
        {exp.instructions === 'concise' ? (
          <p className="nl-callout">{HOWTO.concise}</p>
        ) : exp.instructions === 'standard' ? (
          <ol className="nl-steps">
            {HOWTO.standard.map((step) => (
              <li key={step}>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <div
              className="nl-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={done.length}
              aria-valuenow={completed}
              aria-label="Steps completed"
            >
              <span style={{ width: `${(completed / done.length) * 100}%` }} />
            </div>
            <ol className="nl-steps">
              {HOWTO.stepByStep.map((s, i) => (
                <li key={s.step}>
                  <label className="nl-step-check">
                    <input
                      type="checkbox"
                      checked={done[i]}
                      onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
                    />
                    {s.step}
                  </label>
                  <span className="nl-muted">{s.detail}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}

function Article({ exp, notes }: { exp: Experience; notes: ReturnType<typeof useNotes> }) {
  const paragraphs = ARTICLE[exp.detail];
  return (
    <section className="nl-section nl-enter" aria-labelledby="nl-article-title">
      <div className="nl-wrap nl-measure nl-article">
        {notes([
          [`${VOCABULARY.detail.valueLabels[exp.detail]} version of this article`, 'detail'],
        ])}
        <p className="nl-kicker">Ask an astronomer</p>
        <h2 className="nl-h2" id="nl-article-title">
          {ARTICLE.title}
        </h2>
        {paragraphs.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
        {exp.detail === 'detailed' ? (
          <div className="nl-facts">
            {ARTICLE.facts.map((f) => (
              <div key={f.value} className="nl-fact">
                <strong>{f.value}</strong>
                <span className="nl-muted">{f.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Events({ exp, notes }: { exp: Experience; notes: ReturnType<typeof useNotes> }) {
  return (
    <section className="nl-section nl-enter" aria-labelledby="nl-events-title">
      <div className="nl-wrap">
        {notes([
          [
            allowsAutoAdvance(exp) ? 'Carousel advances on its own' : 'Carousel waits for you',
            'motion',
          ],
        ])}
        <p className="nl-kicker">What&rsquo;s on</p>
        <h2 className="nl-h2" id="nl-events-title">
          Upcoming events
        </h2>
        <EventsCarousel exp={exp} />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="nl-footer">
      <div className="nl-wrap nl-footer-inner">
        <span className="nl-brand">
          <BrandMark /> Northlight Observatory
        </span>
        <span className="nl-muted">
          A fictional site, built to show what preference-aware design can feel like.
        </span>
      </div>
    </footer>
  );
}

/** Parallax: track the nearest scroll position into --nl-scroll (full motion only). */
function useParallax(
  rootRef: RefObject<HTMLDivElement | null>,
  /** The scrolling element, or null to follow the window. */
  scrollRef: RefObject<HTMLDivElement | null> | null,
  enabled: boolean,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!enabled) {
      root.style.removeProperty('--nl-scroll');
      return;
    }
    const target: HTMLElement | Window = scrollRef?.current ?? window;
    let frame = 0;
    const read = () =>
      target instanceof Window ? Math.max(0, -root.getBoundingClientRect().top) : target.scrollTop;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        root.style.setProperty('--nl-scroll', String(Math.min(read(), 700))),
      );
    };
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener('scroll', onScroll);
    };
  }, [rootRef, scrollRef, enabled]);
}

export function NorthlightSite({
  experience: exp,
  sources,
  tone = 'balanced',
  annotate = false,
  sections = ALL_SECTIONS,
  framed = false,
  simulate,
  className,
}: NorthlightSiteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const env: Environment =
    exp.variant === null
      ? 'observatory'
      : (ENVIRONMENTS[exp.variant % ENVIRONMENTS.length] ?? 'observatory');
  const notes = useNotes(exp, sources, annotate);
  useParallax(rootRef, framed ? scrollRef : null, allowsParallax(exp) && sections.includes('hero'));

  const { style, ...attrs } = experienceToProps(exp);
  const has = (s: NorthlightSection) => sections.includes(s);

  const site = (
    <div
      ref={rootRef}
      className={`nl ${className ?? ''}`}
      {...attrs}
      style={{
        ...(style as CSSProperties),
        ...(simulate?.invertedColors ? { filter: 'invert(1) hue-rotate(180deg)' } : null),
      }}
      data-nl-env={env}
      data-nl-tone={tone}
      data-nl-simulate-forced={simulate?.forcedColors ? 'true' : undefined}
      // Our own site's motion guard must not flatten a preview the visitor asked to see.
      data-simw-essential-motion=""
    >
      {has('nav') ? <Nav exp={exp} notes={notes} /> : null}
      {has('hero') ? <Hero exp={exp} tone={tone} env={env} notes={notes} /> : null}
      {has('tonight') ? <Tonight exp={exp} tone={tone} notes={notes} /> : null}
      {has('timelapse') ? <TimelapseSection exp={exp} notes={notes} /> : null}
      {has('howto') ? <HowTo exp={exp} notes={notes} /> : null}
      {has('article') ? <Article exp={exp} notes={notes} /> : null}
      {has('events') ? <Events exp={exp} notes={notes} /> : null}
      {has('footer') ? <Footer /> : null}
    </div>
  );

  if (!framed) return site;
  return (
    <div
      className="nl-frame"
      role="region"
      aria-label="Preview of Northlight Observatory, a demo website"
    >
      <div className="nl-frame-bar" aria-hidden>
        <span className="nl-frame-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="nl-frame-url">🔒 {framed.url ?? 'northlight.example'}</span>
      </div>
      <div className="nl-frame-scroll" ref={scrollRef} style={{ height: framed.height }}>
        {site}
      </div>
    </div>
  );
}
