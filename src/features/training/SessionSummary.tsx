import { findExercise, getExercise } from '@/domain/training/exercises';
import { nextSessionPreview, sessionVerdict } from '@/domain/training/progression';
import type { SessionSummary as Summary } from '@/domain/training/session';
import type { LiftRecord } from '@/domain/training/stats';
import type { ExerciseLog, Lifter, LoadBasis } from '@/domain/training/types';
import { fromKg, type WeightUnit } from '@/domain/training/units';
import { fmtShortDate } from '@/lib/date';
import { fmtInt } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Stamp } from '@/ui/Stamp';
import { fmtLoad, fmtWeight } from './copy';
import { useDeloadActive } from './useProgram';
import styles from './TrainingScreen.module.css';

interface SessionSummaryProps {
  summary: Summary;
  unit: WeightUnit;
  logs: ExerciseLog[];
  lifter: Lifter;
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

const NEXT_WORD: Record<LoadBasis, string> = {
  start: 'Start',
  up: 'Heavier',
  hold: 'Same',
  down: 'Lighter',
  deload: 'Easy',
};

/** A slip shown after a session ends: how it went, any records, and what each lift does next time. */
export function SessionSummary({ summary, unit, logs, lifter, onDismiss }: SessionSummaryProps) {
  const records = summary.records ?? [];
  const deload = useDeloadActive();
  const minutes = Math.max(1, Math.round(summary.durationMs / 60000));
  const full = summary.setsDone >= summary.setsPlanned;
  const next = nextSessionPreview(summary.lifts ?? [], logs, lifter, unit);
  const verdict = sessionVerdict(next, logs, summary.date);

  return (
    <section className={`on-paper ${styles.summary}`} aria-label="Session result">
      <div className={styles.summaryHead}>
        <div>
          <p className="eyebrow">
            {summary.workoutName} · {fmtShortDate(summary.date)}
          </p>
          <h2 className={`display ${styles.summaryTitle}`}>{records.length > 0 ? 'New record' : full ? 'Session done' : 'Session saved'}</h2>
        </div>
        <Stamp tone={records.length > 0 ? 'red' : full ? 'green' : 'blue'}>
          {records.length > 0 ? 'New PR' : full ? 'Done' : 'Logged'}
        </Stamp>
      </div>
      <p>
        {summary.setsDone} of {summary.setsPlanned} sets across {summary.liftsDone} of {summary.liftsPlanned} lifts, in{' '}
        {minutes} {minutes === 1 ? 'minute' : 'minutes'}.
      </p>

      {records.length > 0 && (
        <div className={styles.recordList}>
          <p className="eyebrow">{records.length === 1 ? 'Personal record' : 'Personal records'}</p>
          <ul>
            {records.map((record) => (
              <li key={`${record.exerciseId}-${record.kind}`}>{describeRecord(record, unit)}</li>
            ))}
          </ul>
        </div>
      )}

      {next.length > 0 && (
        <div className={styles.nextList}>
          <p className="eyebrow">{deload ? 'After your easy week' : 'Next time'}</p>
          <p className={styles.verdict}>
            <strong>{verdict.headline}.</strong> {verdict.detail}
          </p>
          <ul>
            {next.map((item) => {
              const exercise = getExercise(item.exerciseId);
              return (
                <li key={item.exerciseId} className={styles.nextItem}>
                  <span className={styles.nextName}>{exercise.name}</span>
                  <span className={`mono ${styles.nextLoad}`}>
                    {fmtLoad(item.advice.weightKg, exercise, unit)}
                    {item.advice.targetReps !== undefined && !exercise.timed ? ` × ${item.advice.targetReps}` : ''}
                  </span>
                  <span className={`mono ${styles.nextBasis} ${styles[item.advice.basis]}`}>{NEXT_WORD[item.advice.basis]}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Button variant="outline" onClick={onDismiss}>
        Close
      </Button>
    </section>
  );
}
