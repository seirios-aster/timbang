import { BAR_KG, platesPerSide } from '@/domain/training/loads';
import { fmtKg } from '@/lib/format';
import styles from './PlateStack.module.css';

interface PlateStackProps {
  totalKg: number;
}

/** How each plate is drawn: its color class and its size relative to the biggest plate. */
const PLATE_LOOK: Record<number, { tone: string; height: string; width: string }> = {
  25: { tone: 'red', height: '100%', width: '1.375rem' },
  20: { tone: 'blue', height: '100%', width: '1.25rem' },
  15: { tone: 'yellow', height: '88%', width: '1.125rem' },
  10: { tone: 'green', height: '76%', width: '1rem' },
  5: { tone: 'light', height: '58%', width: '0.8125rem' },
  2.5: { tone: 'steel', height: '46%', width: '0.625rem' },
  1.25: { tone: 'steel', height: '36%', width: '0.5rem' },
};

/**
 * Shows which plates go on each side of the bar for a given total weight,
 * in standard plate colors. Answers the question new lifters ask at every rack.
 */
export function PlateStack({ totalKg }: PlateStackProps) {
  const { perSide, leftoverKg } = platesPerSide(totalKg);

  const summary =
    perSide.length === 0
      ? `Empty ${BAR_KG} kg bar`
      : `${BAR_KG} kg bar, then on each side: ${perSide.map(fmtKg).join(' + ')} kg`;

  return (
    <figure className={styles.figure}>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.shaft} />
        <span className={styles.collar} />
        {perSide.map((plate, index) => {
          const look = PLATE_LOOK[plate]!;
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
      <figcaption className={styles.caption}>
        {summary}
        {leftoverKg > 0 && `. ${fmtKg(leftoverKg)} kg cannot be made with standard plates.`}
      </figcaption>
    </figure>
  );
}
