import { type ReactNode, useId } from 'react';

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export interface ChoiceOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  label: ReactNode;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
  description?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

/** A radio group drawn as a pill switcher. Real radio inputs, so arrow keys and screen readers just work. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel,
  description,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  const descriptionId = `${name}-desc`;
  return (
    <fieldset
      className={cx('min-w-0', className)}
      aria-describedby={description ? descriptionId : undefined}
    >
      <legend className={hideLabel ? 'sr-only' : 'mb-2 text-sm font-semibold text-ink'}>
        {label}
      </legend>
      <div className="flex flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
        {options.map((option) => (
          <label key={option.value} className="relative min-w-0 flex-1">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cx(
                'flex min-h-[var(--simw-target-size,36px)] cursor-pointer select-none items-center justify-center rounded-xl px-3 text-center font-medium text-muted transition-colors duration-[var(--simw-duration,200ms)]',
                'hover:text-ink peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-line',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                'peer-disabled:cursor-not-allowed peer-disabled:opacity-40',
                size === 'sm' ? 'text-xs' : 'text-sm',
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {description ? (
        <p id={descriptionId} className="mt-2 text-xs text-muted">
          {description}
        </p>
      ) : null}
    </fieldset>
  );
}

export interface ScaleControlProps<T extends string> {
  label: ReactNode;
  value: T;
  options: readonly ChoiceOption<T>[];
  /** Words at each end of the scale, e.g. ["Calmer", "Livelier"]. */
  poles: readonly [ReactNode, ReactNode];
  onChange: (value: T) => void;
  note?: ReactNode;
}

/**
 * `CALMER ○────●────○ LIVELIER`: a stepped scale between two poles (PRD §18).
 * Implemented as a radio group, one stop per value.
 */
export function ScaleControl<T extends string>({
  label,
  value,
  options,
  poles,
  onChange,
  note,
}: ScaleControlProps<T>) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-right text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
          {poles[0]}
        </span>
        <div className="relative flex flex-1 items-center justify-between">
          <span
            aria-hidden
            className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded bg-line"
          />
          {options.map((option) => (
            <label
              key={option.value}
              className="relative z-10 flex min-h-[var(--simw-target-size,36px)] min-w-[var(--simw-target-size,36px)] cursor-pointer items-center justify-center"
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <span className="sr-only">{option.label}</span>
              <span
                aria-hidden
                className={cx(
                  'block size-4 rounded-full border-2 border-line bg-surface transition-transform duration-[var(--simw-duration,200ms)]',
                  'peer-checked:size-5 peer-checked:border-accent peer-checked:bg-accent',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                  'peer-disabled:opacity-30',
                )}
              />
            </label>
          ))}
        </div>
        <span className="w-20 shrink-0 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
          {poles[1]}
        </span>
      </div>
      {note ? <p className="mt-1 text-center text-xs text-muted">{note}</p> : null}
    </fieldset>
  );
}

export interface SwitchProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: ReactNode;
}

export function Switch({ label, checked, onChange, description }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-line transition-colors duration-[var(--simw-duration,200ms)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          checked ? 'bg-accent' : 'bg-surface-2',
        )}
      >
        <span
          aria-hidden
          className={cx(
            'inline-block size-5 rounded-full bg-surface shadow transition-transform duration-[var(--simw-duration,200ms)]',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

export type BadgeTone = 'neutral' | 'accent' | 'good' | 'warn';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted ring-line',
  accent: 'bg-accent-soft text-accent ring-accent/30',
  good: 'bg-good-soft text-good ring-good/30',
  warn: 'bg-warn-soft text-warn ring-warn/30',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  onOpen?: () => void;
  className?: string;
}

/** Native `<details>`, styled. */
export function Disclosure({ summary, children, defaultOpen, onOpen, className }: DisclosureProps) {
  return (
    <details
      className={cx('group rounded-2xl border border-line bg-surface', className)}
      open={defaultOpen}
      onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open) onOpen?.();
      }}
    >
      <summary className="flex min-h-[var(--simw-target-size,36px)] cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span
          aria-hidden
          className="text-muted transition-transform duration-[var(--simw-duration,200ms)] group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
