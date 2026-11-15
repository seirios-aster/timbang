import { useState } from 'react';
import { paceReport, sortByDate, trend, daysBetween } from '@/domain/progress/trend';
import { fmtShortDate } from '@/lib/date';
import { bodyToDisplay, fmtBody, fmtBodyChange, fmtBodyNumber } from '@/lib/units';
import { useUnits } from '@/state/settingsStore';
import { useProfileStore } from '@/state/profileStore';
import { useProgressStore } from '@/state/progressStore';
import { useTargets } from '@/state/useTargets';
import { Button } from '@/ui/Button';
import { ChoiceList } from '@/ui/ChoiceList';
import { Icon } from '@/ui/Icon';
import { Stamp } from '@/ui/Stamp';
import { paceCopy } from './copy';
import { CalibrationCard } from './CalibrationCard';
import { LiftsPanel } from './LiftsPanel';
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
  const { system, weight: unit } = useUnits();
  const [view, setView] = useState<'weight' | 'lifts'>('weight');

  if (!profile || !targets) return null;

  const sorted = sortByDate(entries);
  const points = trend(sorted);
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const report = paceReport(sorted, targets.weeklyChangeKg);
  const copy = paceCopy(report.status, profile.goal);

  const needsRetarget = latest && Math.abs(latest.weightKg - profile.weightKg) >= RETARGET_AFTER_KG;

  const switcher = (
    <ChoiceList
      name="progress-view"
      legend="Show progress for"
      hideLegend
      layout="cells"
      value={view}
      onChange={setView}
      choices={[
        { value: 'weight', title: 'Body weight' },
        { value: 'lifts', title: 'Lifts' },
      ]}
    />
  );

  if (view === 'lifts') {
    return (
      <div className={styles.screen}>
        {switcher}
        <LiftsPanel />
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {switcher}
      <section className={styles.hero} aria-labelledby="progress-heading">
        <h1 id="progress-heading" className="eyebrow">
          {latest ? `Last weigh-in · ${fmtShortDate(latest.date)}` : 'Progress'}
        </h1>
        {latest && first ? (
          <>
            <p className={styles.weight}>
              {fmtBodyNumber(latest.weightKg, system)}
              <span className={styles.weightUnit}>{unit}</span>
            </p>
            {latest !== first && (
              <p className={`mono ${styles.since}`}>
                {fmtBodyChange(latest.weightKg - first.weightKg, system, 1)} {unit} in {daysBetween(first.date, latest.date)} days
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
                {report.actualKgPerWeek === undefined ? '—' : fmtBodyChange(report.actualKgPerWeek, system)}
                <span className={styles.rateUnit}>{unit} / wk</span>
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Plan</dt>
              <dd className={styles.rate}>
                {fmtBodyChange(report.plannedKgPerWeek, system)}
                <span className={styles.rateUnit}>{unit} / wk</span>
              </dd>
            </div>
          </dl>
          <p>{copy.advice}</p>
          <CalibrationCard profile={profile} targets={targets} entries={sorted} />
          {needsRetarget && (
            <div className={`on-paper ${styles.retarget}`}>
              <p>
                Your target was set for {fmtBody(profile.weightKg, system)}. You are now {fmtBody(latest.weightKg, system)}.
              </p>
              <Button variant="outline" onClick={() => updateProfile({ weightKg: latest.weightKg })}>
                Update target for {fmtBody(latest.weightKg, system)}
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
          <TrendChart
            points={points.map((p) => ({ ...p, weightKg: bodyToDisplay(p.weightKg, system), trendKg: bodyToDisplay(p.trendKg, system) }))}
            plannedKgPerWeek={bodyToDisplay(targets.weeklyChangeKg, system)}
            unit={unit}
          />
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
                  <span className={styles.entryWeight}>{fmtBody(point.weightKg, system)}</span>
                  <span className={`mono ${styles.entryDelta}`}>
                    {previous ? fmtBodyChange(point.weightKg - previous.weightKg, system, 1) : 'start'}
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
