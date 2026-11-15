import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import styles from './NumberField.module.css';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Decimal places shown and kept. */
  digits?: number;
  unit?: string;
  /** Leave the unit out of the box, for tight layouts where the label already names it. */
  hideUnit?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A big number with minus and plus buttons. The number can also be typed directly. */
export function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  digits = 0,
  unit,
  hideUnit = false,
  size = 'lg',
}: NumberFieldProps) {
  const format = (n: number) => n.toFixed(digits);
  const [draft, setDraft] = useState(format(value));

  // Keep the text in sync when the value changes from outside (the buttons, a reset).
  useEffect(() => setDraft(value.toFixed(digits)), [value, digits]);

  const commit = (next: number) => {
    const safe = Number(clamp(next, min, max).toFixed(digits));
    onChange(safe);
    setDraft(format(safe));
  };

  const commitDraft = () => {
    const parsed = Number.parseFloat(draft.replace(',', '.'));
    commit(Number.isFinite(parsed) ? parsed : value);
  };

  return (
    <div className={`${styles.field} ${styles[size]}`}>
      <label className={`eyebrow ${styles.label}`} htmlFor={id}>
        {label}
      </label>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.step}
          onClick={() => commit(value - step)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Icon name="minus" />
        </button>
        <div className={styles.value}>
          <input
            id={id}
            className={styles.input}
            type="text"
            inputMode={digits > 0 ? 'decimal' : 'numeric'}
            autoComplete="off"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            onFocus={(event) => event.currentTarget.select()}
          />
          {unit && !hideUnit && <span className={styles.unit}>{unit}</span>}
        </div>
        <button
          type="button"
          className={styles.step}
          onClick={() => commit(value + step)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}
