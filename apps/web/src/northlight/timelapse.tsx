'use client';

import { autoplayMode, loadsHeavyMediaAutomatically, showCaptions } from '@simw/adapters';
import type { Experience } from '@simw/protocol';
import { useEffect, useRef, useState } from 'react';
import { TIMELAPSE_CAPTIONS } from './content';

interface TrailStar {
  radius: number;
  angle: number;
  size: number;
  hue: number;
}

function makeStars(count: number): TrailStar[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () => ({
    radius: Math.sqrt(rand()) * 1.15,
    angle: rand() * Math.PI * 2,
    size: 0.5 + rand() * rand() * 1.8,
    hue: 30 + rand() * 200,
  }));
}

const STARS = makeStars(260);

function drawSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#020309';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.86);
  ctx.lineTo(w * 0.18, h * 0.8);
  ctx.lineTo(w * 0.32, h * 0.86);
  ctx.lineTo(w * 0.5, h * 0.78);
  ctx.lineTo(w * 0.7, h * 0.85);
  ctx.lineTo(w * 0.86, h * 0.79);
  ctx.lineTo(w, h * 0.84);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // Dome
  const dx = w * 0.62;
  const dy = h * 0.8;
  const r = Math.min(w, h) * 0.07;
  ctx.beginPath();
  ctx.arc(dx, dy, r, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(dx - r * 0.8, dy, r * 1.6, r * 0.6);
}

/** A long-exposure still: short arcs instead of points. Used as the poster frame. */
function drawPoster(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#04060d';
  ctx.fillRect(0, 0, w, h);
  const cx = w * 0.5;
  const cy = h * 0.18;
  const scale = Math.max(w, h);
  for (const s of STARS) {
    ctx.strokeStyle = `hsla(${s.hue}, 70%, 85%, 0.75)`;
    ctx.lineWidth = s.size * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, s.radius * scale, s.angle, s.angle + 0.55);
    ctx.stroke();
  }
  drawSilhouette(ctx, w, h);
}

export function Timelapse({ exp }: { exp: Experience }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mode = autoplayMode(exp);
  const heavyOk = loadsHeavyMediaAutomatically(exp);
  const [loaded, setLoaded] = useState(heavyOk);
  const [playing, setPlaying] = useState(false);
  const [userStarted, setUserStarted] = useState(false);
  const [ccOverride, setCcOverride] = useState<boolean | null>(null);
  const [inView, setInView] = useState(false);
  const [captionIndex, setCaptionIndex] = useState(0);
  const captionsOn = ccOverride ?? showCaptions(exp);

  // Data saver turned on/off: honor it unless the visitor already chose to load.
  useEffect(() => {
    if (!userStarted) setLoaded(heavyOk);
  }, [heavyOk, userStarted]);

  // Autoplay follows the preference, but never overrides what the visitor did by hand.
  useEffect(() => {
    if (userStarted) return;
    setPlaying(loaded && inView && mode !== 'off');
  }, [mode, loaded, inView, userStarted]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !captionsOn) return;
    const t = window.setInterval(
      () => setCaptionIndex((i) => (i + 1) % TIMELAPSE_CAPTIONS.length),
      4500,
    );
    return () => window.clearInterval(t);
  }, [playing, captionsOn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !loaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!playing) drawPoster(ctx, w, h);
      else {
        ctx.fillStyle = '#04060d';
        ctx.fillRect(0, 0, w, h);
      }
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);

    if (!playing) return () => ro?.disconnect();

    let frame = 0;
    let rotation = 0;
    const tick = () => {
      rotation += 0.0032;
      ctx.fillStyle = 'rgba(4, 6, 13, 0.07)';
      ctx.fillRect(0, 0, w, h);
      const cx = w * 0.5;
      const cy = h * 0.18;
      const scale = Math.max(w, h);
      for (const s of STARS) {
        const a = s.angle + rotation;
        ctx.fillStyle = `hsla(${s.hue}, 70%, 88%, 0.9)`;
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(a) * s.radius * scale,
          cy + Math.sin(a) * s.radius * scale,
          s.size * 0.7,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      drawSilhouette(ctx, w, h);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
    };
  }, [playing, loaded]);

  const toggle = () => {
    setUserStarted(true);
    setLoaded(true);
    setPlaying((p) => !p);
  };

  return (
    <div className="nl-media" ref={wrapRef}>
      {loaded ? <canvas ref={canvasRef} aria-hidden /> : null}
      {!loaded ? (
        <div className="nl-media-overlay">
          <div>
            <p style={{ fontWeight: 700 }}>Star trails over the dome</p>
            <p style={{ opacity: 0.8, fontSize: '0.88em' }}>
              Timelapse · 18 MB · held back to save your data
            </p>
          </div>
          <button type="button" className="nl-play" onClick={toggle}>
            ▶ Load and play
          </button>
        </div>
      ) : !playing ? (
        <div className="nl-media-overlay">
          <button
            type="button"
            className="nl-play"
            onClick={toggle}
            aria-label="Play timelapse: star trails over the dome"
          >
            ▶ Play timelapse
          </button>
        </div>
      ) : null}

      {playing && captionsOn ? (
        <p className="nl-captions" aria-live="off">
          {TIMELAPSE_CAPTIONS[captionIndex]}
        </p>
      ) : null}

      <div className="nl-media-bar">
        {loaded ? (
          <button
            type="button"
            className="nl-icon-btn"
            onClick={toggle}
            aria-label={playing ? 'Pause timelapse' : 'Play timelapse'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
        ) : null}
        <button
          type="button"
          className="nl-icon-btn"
          aria-pressed={captionsOn}
          onClick={() => setCcOverride(!captionsOn)}
          aria-label="Captions"
        >
          CC
        </button>
        <span style={{ marginLeft: 'auto' }} />
        {mode === 'play-muted' && playing && !userStarted ? (
          <span className="nl-media-badge">🔇 Muted</span>
        ) : null}
        {mode === 'off' && !userStarted ? (
          <span className="nl-media-badge">Waits for you</span>
        ) : null}
        <span className="nl-media-badge">0:20</span>
      </div>
    </div>
  );
}
