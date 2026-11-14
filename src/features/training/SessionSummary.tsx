import { findExercise } from '@/domain/training/exercises';
import type { SessionSummary as Summary } from '@/domain/training/session';
import type { LiftRecord } from '@/domain/training/stats';
import { fromKg, type WeightUnit } from '@/domain/training/units';
import { fmtInt } from '@/lib/format';
import { fmtWeight } from './copy';
import { fmtShortDate } from '@/lib/date';
import { Button } from '@/ui/Button';
import { Stamp } from '@/ui/Stamp';
import styles from './TrainingScreen.module.css';

interface SessionSummaryProps {
  summary: Summary;
  unit: WeightUnit;
  onDismiss: () => void;
}

/** One line for a record: what was beaten, and by what. */
function describeRecord(record: LiftRecord, unit: WeightUnit): string {
  const name = findExercise(record.exerciseId)?.name ?? 'Lift';
  if (record.kind === 'weight') {
    return `${name}: ${fmtWeight(record.value, unit)} ${unit}, up from ${fmtWeight(record.previous, unit)}`;
  }
  if (record.kind === 'strength') {
    return `${name}: estimated max ${fmtInt(fromKg(record.value, unit))} ${unit}, up from ${fmtInt(fromKg(record.previous, unit))}`;
  }
  return `${name}: ${record.value} in one set, up from ${record.previous}`;
}

/** A slip shown after a session ends, with what got done. */
export function SessionSummary({ summary, unit, onDismiss }: SessionSummaryProps) {
  const records = summary.records ?? [];
  const minutes = Math.max(1, Math.round(summary.durationMs / 60000));
  const full = summary.setsDone >= summary.setsPlanned;

  return (
    <section className={`on-paper ${styles.summary}`} aria-label="Session result">
      <div className={styles.summaryHead}>
        <div>
          <p className="eyebrow">
            {summary.workoutName} · {fmtShortDate(summary.date)}
          </p>
          <h2 className={`display ${styles.summaryTitle}`}>{full ? 'Session done' : 'Session saved'}</h2>
        </div>
        <Stamp tone={records.length > 0 ? 'red' : full ? 'green' : 'blue'}>
          {records.length > 0 ? 'New PR' : full ? 'Done' : 'Logged'}
        </Stamp>
      </div>
      <p>
        {summary.setsDone} of {summary.setsPlanned} sets across {summary.liftsDone} of {summary.liftsPlanned} lifts,
        in {minutes} {minutes === 1 ? 'minute' : 'minutes'}.{' '}
        {full
          ? 'Next time the weights will move based on what you did today.'
          : 'A short session still counts. The lifts you did will shape next time.'}
      </p>
      {records.length > 0 && (
        <div className={styles.recordList}>
          <p className="eyebrow">{records.length === 1 ? 'New personal record' : 'New personal records'}</p>
          <ul>
            {records.map((record) => (
              <li key={`${record.exerciseId}-${record.kind}`}>{describeRecord(record, unit)}</li>
            ))}
          </ul>
        </div>
      )}
      <Button variant="outline" onClick={onDismiss}>
        Close
      </Button>
    </section>
  );
}
