import { fmtInt } from '@/lib/format';
import styles from './Barbell.module.css';

interface BarbellProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * The day's macros as plates loaded on a barbell sleeve. Each plate is as thick
 * as that macro's share of the calories, so it reads like a stacked bar.
 */
export function Barbell({ proteinG, carbsG, fatG }: BarbellProps) {
  const plates = [
    { key: 'protein', label: 'Protein', grams: proteinG, kcal: proteinG * 4 },
    { key: 'carbs', label: 'Carbs', grams: carbsG, kcal: carbsG * 4 },
    { key: 'fat', label: 'Fat', grams: fatG, kcal: fatG * 9 },
  ] as const;
  const total = plates.reduce((sum, plate) => sum + plate.kcal, 0) || 1;

  return (
    <div className={styles.wrap}>
      <div className={styles.barbell} aria-hidden="true">
        <span className={styles.collar} />
        {plates.map((plate) => (
          <span
            key={plate.key}
            className={`${styles.plate} ${styles[plate.key]}`}
            style={{ flexGrow: Math.max(plate.kcal, total * 0.04) }}
          />
        ))}
      </div>
      <dl className={styles.legend}>
        {plates.map((plate) => (
          <div key={plate.key} className={styles.item}>
            <dt className={styles.name}>
              <span className={`${styles.chip} ${styles[plate.key]}`} aria-hidden="true" />
              {plate.label}
            </dt>
            <dd className={styles.grams}>
              {fmtInt(plate.grams)}
              <span className={styles.g}>g</span>
            </dd>
            <dd className={styles.share}>
              {fmtInt(plate.kcal)} kcal · {Math.round((plate.kcal / total) * 100)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
