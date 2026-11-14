import { paceReport, sortByDate, trend, daysBetween } from '@/domain/progress/trend';
import { fmtShortDate } from '@/lib/date';
import { fmtDecimal, fmtSigned } from '@/lib/format';
import { useProfileStore } from '@/state/profileStore';
import { useProgressStore } from '@/state/progressStore';
import { useTargets } from '@/state/useTargets';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Stamp } from '@/ui/Stamp';
import { paceCopy } from './copy';
import styles from './ProgressScreen.module.css';
import { TrendChart } from './TrendChart';
import { WeighInForm } from './WeighInForm';

/** Offer to recalculate the target once body weight has moved this far from the profile. */
const RETARGET_AFTER_KG = 1;

export function ProgressScreen() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const entries = useProgressStore((state) => state.entries);
  const remove = useProgressStore((state) => state.remove);
  const targets = useTargets();

  if (!profile || !targets) return null;

  const sorted = sortByDate(entries);
  const points = trend(sorted);
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const report = paceReport(sorted, targets.weeklyChangeKg);
  const copy = paceCopy(report.status, profile.goal);

  const needsRetarget = latest && Math.abs(latest.weightKg - profile.weightKg) >= RETARGET_AFTER_KG;

  return (
    <div className={styles.screen}>
      <section className={styles.hero} aria-labelledby="progress-heading">
        <h1 id="progress-heading" className="eyebrow">
          {latest ? `Last weigh-in · ${fmtShortDate(latest.date)}` : 'Progress'}
        </h1>
        {latest && first ? (
          <>
            <p className={styles.weight}>
              {fmtDecimal(latest.weightKg)}
              <span className={styles.weightUnit}>kg</span>
            </p>
            {latest !== first && (
              <p className={`mono ${styles.since}`}>
                {fmtSigned(latest.weightKg - first.weightKg, 1)} kg in {daysBetween(first.date, latest.date)} days
              </p>
            )}
          </>
        ) : (
          <>
            <p className={`display ${styles.emptyTitle}`}>No weigh-ins yet</p>
            <p className={styles.emptyText}>
              Log your weight below. After a week you will see your trend line here, and whether you are on pace for
              your goal.
            </p>
          </>
        )}
      </section>

      <WeighInForm key={latest?.id ?? 'first'} defaultWeightKg={latest?.weightKg ?? profile.weightKg} />

      {latest && (
        <section className={styles.pace} aria-labelledby="pace-heading">
          <div className={styles.paceHead}>
            <h2 id="pace-heading" className={`display ${styles.heading}`}>
              Pace check
            </h2>
            <Stamp tone={copy.tone}>{copy.stamp}</Stamp>
          </div>
          <dl className={styles.rates}>
            <div>
              <dt className="eyebrow">You</dt>
              <dd className={styles.rate}>
                {report.actualKgPerWeek === undefined ? '—' : fmtSigned(report.actualKgPerWeek, 2)}
                <span className={styles.rateUnit}>kg / wk</span>
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Plan</dt>
              <dd className={styles.rate}>
                {fmtSigned(report.plannedKgPerWeek, 2)}
                <span className={styles.rateUnit}>kg / wk</span>
              </dd>
            </div>
          </dl>
          <p>{copy.advice}</p>
          {needsRetarget && (
            <div className={`on-paper ${styles.retarget}`}>
              <p>
                Your target was set for {fmtDecimal(profile.weightKg)} kg. You are now {fmtDecimal(latest.weightKg)} kg.
              </p>
              <Button variant="outline" onClick={() => updateProfile({ weightKg: latest.weightKg })}>
                Update target for {fmtDecimal(latest.weightKg)} kg
              </Button>
            </div>
          )}
        </section>
      )}

      {points.length >= 2 && (
        <section className={styles.section} aria-labelledby="trend-heading">
          <h2 id="trend-heading" className={`display ${styles.heading}`}>
            Trend
          </h2>
          <TrendChart points={points} plannedKgPerWeek={targets.weeklyChangeKg} />
        </section>
      )}

      {sorted.length > 0 && (
        <section className={styles.section} aria-labelledby="history-heading">
          <h2 id="history-heading" className={`display ${styles.heading}`}>
            History
          </h2>
          <ul className={styles.history}>
            {[...points].reverse().map((point, index, list) => {
              const previous = list[index + 1];
              const entry = sorted.find((e) => e.date === point.date);
              return (
                <li key={point.date} className={styles.entry}>
                  <span className={`mono ${styles.entryDate}`}>{fmtShortDate(point.date)}</span>
                  <span className={styles.entryWeight}>{fmtDecimal(point.weightKg)} kg</span>
                  <span className={`mono ${styles.entryDelta}`}>
                    {previous ? fmtSigned(point.weightKg - previous.weightKg, 1) : 'start'}
                  </span>
                  <button
                    type="button"
                    className={styles.delete}
                    onClick={() => entry && remove(entry.id)}
                    aria-label={`Delete weigh-in from ${fmtShortDate(point.date)}`}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
