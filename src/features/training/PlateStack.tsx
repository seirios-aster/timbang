import { platesPerSide } from '@/domain/training/loads';
import type { WeightUnit } from '@/domain/training/units';
import { fmtKg } from '@/lib/format';
import styles from './PlateStack.module.css';

interface PlateStackProps {
  /** Total weight on the bar, in the gym's unit. */
  total: number;
  unit: WeightUnit;
  /** Draw the bar. When false, only the sentence is shown, for screens that are short on room. */
  diagram?: boolean;
}

interface PlateLook {
  tone: string;
  height: string;
  width: string;
}

/** How each plate is drawn: its color and its size relative to the biggest plate. Colors follow the usual plate colors. */
const PLATE_LOOK: Record<WeightUnit, Record<number, PlateLook>> = {
  kg: {
    25: { tone: 'red', height: '100%', width: '1.375rem' },
    20: { tone: 'blue', height: '100%', width: '1.25rem' },
    15: { tone: 'yellow', height: '88%', width: '1.125rem' },
    10: { tone: 'green', height: '76%', width: '1rem' },
    5: { tone: 'light', height: '58%', width: '0.8125rem' },
    2.5: { tone: 'steel', height: '46%', width: '0.625rem' },
    1.25: { tone: 'steel', height: '36%', width: '0.5rem' },
  },
  lb: {
    45: { tone: 'blue', height: '100%', width: '1.375rem' },
    35: { tone: 'yellow', height: '88%', width: '1.125rem' },
    25: { tone: 'green', height: '76%', width: '1rem' },
    10: { tone: 'light', height: '58%', width: '0.8125rem' },
    5: { tone: 'steel', height: '46%', width: '0.625rem' },
    2.5: { tone: 'steel', height: '36%', width: '0.5rem' },
  },
};

/**
 * Shows which plates go on each side of the bar for a given total weight.
 * Answers the question new lifters ask at every rack.
 */
export function PlateStack({ total, unit, diagram = true }: PlateStackProps) {
  const { bar, perSide, leftover } = platesPerSide(total, unit);

  const summary =
    perSide.length === 0
      ? `Empty ${bar} ${unit} bar`
      : `${bar} ${unit} bar, then on each side: ${perSide.map(fmtKg).join(' + ')} ${unit}`;

  return (
    <figure className={styles.figure}>
      {diagram && (
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.shaft} />
        <span className={styles.collar} />
        {perSide.map((plate, index) => {
          const look = PLATE_LOOK[unit][plate]!;
          return (
            <span
              key={`${plate}-${index}`}
              className={`${styles.plate} ${styles[look.tone]}`}
              style={{ height: look.height, width: look.width }}
            />
          );
        })}
        <span className={styles.sleeve} />
      </div>
      )}
      <figcaption className={styles.caption}>
        {summary}
        {leftover > 0 && `. ${fmtKg(leftover)} ${unit} cannot be made with standard plates.`}
      </figcaption>
    </figure>
  );
}
