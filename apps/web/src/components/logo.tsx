export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="11" cy="16" r="6" fill="currentColor" />
      <path
        d="M19.5 9.5a9 9 0 0 1 0 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M24 5.5a15 15 0 0 1 0 21"
        fill="none"
        stroke="var(--glow)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink">
      <LogoMark className="size-7 text-accent" />
      <span>
        SeeIt<span className="text-accent">MyWay</span>
      </span>
    </span>
  );
}
