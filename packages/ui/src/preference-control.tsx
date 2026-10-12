import { type PreferenceKey, type PreferenceValue, VOCABULARY } from '@simw/protocol';
import { SegmentedControl } from './controls';

export interface PreferenceControlProps<K extends PreferenceKey> {
  prefKey: K;
  value: PreferenceValue<K>;
  onChange: (value: PreferenceValue<K>) => void;
  /**
   * Values that can't be chosen at all in this context. Don't use this for
   * device constraints: let the visitor store any value, and explain the
   * constraint with `note` instead.
   */
  disabledValues?: readonly PreferenceValue<K>[];
  /** Shown under the control, e.g. why a device constraint is overriding the choice right now. */
  note?: string;
  size?: 'sm' | 'md';
  showDescription?: boolean;
}

/** A segmented control for any preference in the protocol vocabulary. */
export function PreferenceControl<K extends PreferenceKey>({
  prefKey,
  value,
  onChange,
  disabledValues = [],
  note,
  size,
  showDescription = true,
}: PreferenceControlProps<K>) {
  const def = VOCABULARY[prefKey];
  const labels = def.valueLabels as Record<string, string>;
  const options = (def.values as readonly PreferenceValue<K>[]).map((v) => ({
    value: v,
    label: labels[v] ?? v,
    disabled: disabledValues.includes(v),
  }));
  const description = [showDescription ? def.description : null, note].filter(Boolean).join(' ');
  return (
    <SegmentedControl
      label={def.label}
      value={value}
      options={options}
      onChange={onChange}
      description={description || undefined}
      size={size}
    />
  );
}
