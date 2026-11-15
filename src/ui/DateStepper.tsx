import { fmtDayLabel, shiftDate, todayIso } from '@/lib/date';
import { Icon } from './Icon';
import styles from './DateStepper.module.css';

interface DateStepperProps {
  id: string;
  label: string;
  /** YYYY-MM-DD. */
  value: string;
  onChange: (date: string) => void;
  /** The latest date allowed. Defaults to today. */
  max?: string;
}

/**
 * A date with arrows to step a day at a time. Tapping the date opens the phone's
 * own date picker, for jumping further back. Looks the same on every device.
 */
export function DateStepper({ id, label, value, onChange, max = todayIso() }: DateStepperProps) {
  const next = shiftDate(value, 1);

  return (
    <div className={styles.field}>
      <label className="eyebrow" htmlFor={id}>
        {label}
      </label>
      <div className={styles.row}>
        <button type="button" className={styles.step} onClick={() => onChange(shiftDate(value, -1))} aria-label="Previous day">
          <Icon name="arrowLeft" size={20} />
        </button>
        <div className={styles.value}>
          <span className={styles.text}>{fmtDayLabel(value)}</span>
          {/* The real input sits invisibly over the text, so a tap opens the native picker. */}
          <input
            id={id}
            className={styles.native}
            type="date"
            value={value}
            max={max}
            required
            onChange={(event) => event.target.value && onChange(event.target.value)}
          />
        </div>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChange(next)}
          disabled={next > max}
          aria-label="Next day"
        >
          <Icon name="arrowRight" size={20} />
        </button>
      </div>
    </div>
  );
}
