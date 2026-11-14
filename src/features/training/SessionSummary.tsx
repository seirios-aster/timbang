import type { SessionSummary as Summary } from '@/domain/training/session';
import { fmtShortDate } from '@/lib/date';
import { Button } from '@/ui/Button';
import { Stamp } from '@/ui/Stamp';
import styles from './TrainingScreen.module.css';

interface SessionSummaryProps {
  summary: Summary;
  onDismiss: () => void;
}

/** A slip shown after a session ends, with what got done. */
export function SessionSummary({ summary, onDismiss }: SessionSummaryProps) {
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
        <Stamp tone={full ? 'green' : 'blue'}>{full ? 'Done' : 'Logged'}</Stamp>
      </div>
      <p>
        {summary.setsDone} of {summary.setsPlanned} sets across {summary.liftsDone} of {summary.liftsPlanned} lifts,
        in {minutes} {minutes === 1 ? 'minute' : 'minutes'}.{' '}
        {full
          ? 'Next time the weights will move based on what you did today.'
          : 'A short session still counts. The lifts you did will shape next time.'}
      </p>
      <Button variant="outline" onClick={onDismiss}>
        Close
      </Button>
    </section>
  );
}
