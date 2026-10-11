import type { ConstraintId, PreferenceKey, Resolution } from '@simw/protocol';
import { VOCABULARY } from '@simw/protocol';

export interface ConstraintNoteOptions {
  /** "Saved as" for stored choices, "Set to" for drafts and previews. */
  lead?: 'Saved as' | 'Set to';
  /** Who is asking: "Your device", or e.g. "This preview’s device" in a simulation. */
  device?: string;
}

function label(key: PreferenceKey, value: string): string {
  return (VOCABULARY[key].valueLabels as Record<string, string>)[value] ?? value;
}

/**
 * A plain-language note for a preference control when a device constraint
 * (or another stated preference) stops the choice from taking effect right
 * now. Undefined when the choice applies as stated. The choice itself is
 * always stored as made; this only explains the effective behavior.
 */
export function constraintNote(
  key: PreferenceKey,
  resolution: Pick<Resolution, 'stated' | 'experience' | 'constraints'>,
  { lead = 'Saved as', device = 'Your device' }: ConstraintNoteOptions = {},
): string | undefined {
  const { stated, experience, constraints } = resolution;
  const has = (id: ConstraintId) => constraints.some((c) => c.id === id);
  const intro = `${lead} ${label(key, stated[key])}.`;

  switch (key) {
    case 'motion':
      if (experience.motion === stated.motion) return undefined;
      return `${intro} ${device} is asking for reduced motion right now, so this site plays it calm. Your choice still applies on devices that don’t.`;

    case 'autoplay': {
      if (stated.autoplay === 'never') return undefined;
      const reasons: string[] = [];
      if (experience.motion !== 'full') {
        reasons.push(
          has('os-reduced-motion')
            ? `${device} is asking for reduced motion right now, so videos and other moving media wait for you. Sound-only media can still start.`
            : `With motion set to ${label('motion', experience.motion)}, videos and other moving media wait for you. Sound-only media can still start.`,
        );
      }
      if (experience.data === 'reduced') {
        reasons.push(
          `${device} is asking to save data, so large media waits until you ask for it.`,
        );
      }
      if (reasons.length === 0) return undefined;
      const fromDevice = has('os-reduced-motion') || experience.data === 'reduced';
      return [
        intro,
        ...reasons,
        fromDevice ? 'Your choice still applies on devices that don’t.' : '',
      ]
        .filter(Boolean)
        .join(' ');
    }

    case 'colorScheme':
      if (!has('forced-colors') || stated.colorScheme === 'system') return undefined;
      return `${intro} ${device} is using forced colors right now, so its own colors win. Your choice still applies when forced colors are off.`;

    default:
      return undefined;
  }
}
