import { Icon } from '@/ui/Icon';
import styles from './SetCounters.module.css';

interface SetCountersProps {
  legend: string;
  /** What is being counted, for screen readers: "reps" or "sec". */
  unit: string;
  step?: number;
  values: number[];
  onChange: (values: number[]) => void;
}

/** One tally counter per set, side by side: plus on top, the count, minus below. */
export function SetCounters({ legend, unit, step = 1, values, onChange }: SetCountersProps) {
  const change = (index: number, delta: number) =>
    onChange(values.map((value, i) => (i === index ? Math.max(0, value + delta) : value)));

  return (
    <fieldset className={styles.sets}>
      <legend className="eyebrow">{legend}</legend>
      <div className={styles.grid}>
        {values.map((value, index) => (
          <div key={index} className={styles.set}>
            <button
              type="button"
              className={styles.step}
              onClick={() => change(index, step)}
              aria-label={`Set ${index + 1}: more ${unit}`}
            >
              <Icon name="plus" size={20} />
            </button>
            <p className={styles.value} aria-live="polite">
              <span className="visually-hidden">Set {index + 1}: </span>
              {value}
              <span className="visually-hidden"> {unit}</span>
            </p>
            <button
              type="button"
              className={styles.step}
              onClick={() => change(index, -step)}
              disabled={value <= 0}
              aria-label={`Set ${index + 1}: fewer ${unit}`}
            >
              <Icon name="minus" size={20} />
            </button>
            <span className={`mono ${styles.label}`} aria-hidden="true">
              Set {index + 1}
            </span>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
