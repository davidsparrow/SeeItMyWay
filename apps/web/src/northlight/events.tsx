'use client';

import { allowsAutoAdvance, transitionStyle } from '@simw/adapters';
import type { Experience } from '@simw/protocol';
import { useEffect, useState } from 'react';
import { EVENTS } from './content';

const INTERVAL_MS = 5000;

/**
 * A carousel that only moves on its own with full motion AND autoplay
 * allowed. It always has visible controls and a pause button, and it slides,
 * fades or cuts depending on the motion preference.
 */
export function EventsCarousel({ exp }: { exp: Experience }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const canAuto = allowsAutoAdvance(exp);
  const running = canAuto && !paused && !hovering;
  const style = transitionStyle(exp);
  const count = EVENTS.length;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % EVENTS.length), INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [running]);

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <section
      className="nl-carousel"
      aria-roledescription="carousel"
      aria-label="Upcoming events"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <div className="nl-car-viewport" aria-live={running ? 'off' : 'polite'}>
        <div
          className="nl-car-track"
          data-style={style}
          style={style === 'slide' ? { transform: `translateX(-${index * 100}%)` } : undefined}
        >
          {EVENTS.map((event, i) => (
            // biome-ignore lint/a11y/useSemanticElements: APG carousel pattern; slides are role=group with aria-roledescription=slide, and a fieldset would imply a form.
            <div
              key={event.title}
              className="nl-car-slide"
              data-active={i === index}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== index}
            >
              <article className="nl-event">
                <span className="nl-event-when">{event.when}</span>
                <h3>{event.title}</h3>
                <p className="nl-muted">{event.blurb}</p>
                <span className="nl-tag">{event.tag}</span>
              </article>
            </div>
          ))}
        </div>
      </div>
      <div className="nl-car-controls">
        <button
          type="button"
          className="nl-icon-btn"
          onClick={() => go(index - 1)}
          aria-label="Previous event"
        >
          ←
        </button>
        <div className="nl-dots">
          {EVENTS.map((event, i) => (
            <button
              key={event.title}
              type="button"
              className="nl-dot"
              aria-label={`Show ${event.title}`}
              aria-current={i === index}
              onClick={() => go(i)}
            >
              <span />
            </button>
          ))}
        </div>
        {canAuto ? (
          <button
            type="button"
            className="nl-icon-btn"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Resume auto-advance' : 'Pause auto-advance'}
          >
            {paused ? '▶' : '❚❚'}
          </button>
        ) : null}
        <button
          type="button"
          className="nl-icon-btn"
          onClick={() => go(index + 1)}
          aria-label="Next event"
        >
          →
        </button>
      </div>
    </section>
  );
}
