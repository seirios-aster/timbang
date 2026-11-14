import type { Totals } from '@/domain/mealplan/types';
import type { MacroTargets } from '@/domain/nutrition/types';
import { fmtInt, fmtSigned } from '@/lib/format';
import styles from './DaySummary.module.css';

interface DaySummaryProps {
  totals: Totals;
  targets: MacroTargets;
}

/** The meter runs to 125% of target, so going over is visible. */
const METER_MAX = 1.25;

const position = (ratio: number) => `${(Math.min(ratio, METER_MAX) / METER_MAX) * 100}%`;

/** How the selected day compares with the targets: calories up top, then one meter per macro. */
export function DaySummary({ totals, targets }: DaySummaryProps) {
  const macros = [
    { key: 'protein', label: 'Protein', actual: totals.protein, target: targets.proteinG },
    { key: 'carbs', label: 'Carbs', actual: totals.carbs, target: targets.carbsG },
    { key: 'fat', label: 'Fat', actual: totals.fat, target: targets.fatG },
  ] as const;
  const difference = Math.round(totals.kcal - targets.calories);

  return (
    <section className={styles.summary} aria-label="Day totals against your target">
      <div className={styles.calories}>
        <p className={styles.kcal}>
          {fmtInt(totals.kcal)}
          <span className={styles.kcalUnit}>kcal</span>
        </p>
        <p className={`mono ${styles.against}`}>
          target {fmtInt(targets.calories)}
          <br />
          {difference === 0 ? 'right on it' : `${fmtSigned(difference)} kcal`}
        </p>
      </div>

      <dl className={styles.meters}>
        {macros.map((macro) => (
          <div key={macro.key} className={styles.meter}>
            <dt className={`eyebrow ${styles.meterLabel}`}>{macro.label}</dt>
            <dd className={`mono ${styles.meterValue}`}>
              <strong>{fmtInt(macro.actual)}</strong> / {fmtInt(macro.target)} g
            </dd>
            <dd className={styles.track} aria-hidden="true">
              <span
                className={`${styles.fill} ${styles[macro.key]}`}
                style={{ width: position(macro.target > 0 ? macro.actual / macro.target : 0) }}
              />
              <span className={styles.goal} style={{ left: position(1) }} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
