import { useState } from 'react';
import { roundLoad } from '@/domain/training/loads';
import {
  allLiftStats,
  RICE_SACK_KG,
  trainingTotals,
  weightForReps,
  type LiftSession,
  type LiftStats,
} from '@/domain/training/stats';
import { fromKg, toKg, type WeightUnit } from '@/domain/training/units';
import { fmtLoad, fmtWeight, loadUnit } from '@/features/training/copy';
import { fmtShortDate } from '@/lib/date';
import { fmtDecimal, fmtInt } from '@/lib/format';
import { useTrainingStore } from '@/state/trainingStore';
import { Sheet } from '@/ui/Sheet';
import { LiftChart } from './LiftChart';
import styles from './LiftsPanel.module.css';

/** Rep counts shown in the "what you can lift for reps" table. */
const REP_TARGETS = [1, 3, 5, 8, 10, 12];

const fmtSet = (session: LiftSession, stats: LiftStats, unit: WeightUnit) =>
  session.weightKg === null
    ? `${session.topReps} ${stats.exercise.timed ? 'sec' : 'reps'}`
    : `${fmtLoad(session.weightKg, stats.exercise, unit)} × ${session.topReps}`;

/** A tiny line of a lift's history, to show its direction at a glance. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className={styles.sparkEmpty} aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => 3 + (i / (values.length - 1)) * 58;
  const y = (value: number) => 21 - ((value - min) / (max - min || 1)) * 18;
  return (
    <svg className={styles.spark} viewBox="0 0 64 24" aria-hidden="true">
      <polyline points={values.map((value, i) => `${x(i)},${y(value)}`).join(' ')} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1]!)} r={2.5} />
    </svg>
  );
}

function LiftDetail({ stats, unit }: { stats: LiftStats; unit: WeightUnit }) {
  const { exercise, strongest, heaviest, mostReps, sessions } = stats;
  const weighted = strongest !== null && strongest.oneRepMaxKg !== null;
  const unitLabel = loadUnit(exercise, unit);

  const points = sessions.map((session) => ({
    date: session.date,
    value: weighted ? fromKg(session.oneRepMaxKg ?? 0, unit) : session.topReps,
    detail:
      session.weightKg === null
        ? session.reps.join(', ')
        : `${fmtWeight(session.weightKg, unit)} ${unit} × ${session.reps.join(', ')}`,
  }));

  return (
    <div className={styles.detail}>
      {weighted ? (
        <section className={styles.hero}>
          <p className="eyebrow">Estimated one-rep max</p>
          <p className={styles.heroValue}>
            {fmtInt(fromKg(strongest.oneRepMaxKg!, unit))}
            <span className={styles.heroUnit}>{unitLabel}</span>
          </p>
          <p className={styles.note}>
            Worked out from your best set, {fmtSet(strongest, stats, unit)} on {fmtShortDate(strongest.date)}. It is an
            estimate for tracking progress. You do not need to test a real one-rep max.
          </p>
        </section>
      ) : (
        <section className={styles.hero}>
          <p className="eyebrow">{exercise.timed ? 'Longest hold' : 'Most reps in one set'}</p>
          <p className={styles.heroValue}>
            {mostReps.topReps}
            <span className={styles.heroUnit}>{exercise.timed ? 'sec' : 'reps'}</span>
          </p>
          <p className={styles.note}>Set on {fmtShortDate(mostReps.date)}.</p>
        </section>
      )}

      <dl className={styles.records}>
        {heaviest && (
          <div>
            <dt className="eyebrow">Heaviest</dt>
            <dd>
              {fmtSet(heaviest, stats, unit)}
              <span className={styles.when}>{fmtShortDate(heaviest.date)}</span>
            </dd>
          </div>
        )}
        <div>
          <dt className="eyebrow">Sessions</dt>
          <dd>{sessions.length}</dd>
        </div>
        {stats.totalVolumeKg > 0 && (
          <div>
            <dt className="eyebrow">Total lifted</dt>
            <dd>
              {fmtInt(fromKg(stats.totalVolumeKg, unit))} {unit}
            </dd>
          </div>
        )}
      </dl>

      {points.length >= 2 && (
        <section className={styles.block}>
          <h3 className={`display ${styles.heading}`}>{weighted ? 'Strength over time' : 'Reps over time'}</h3>
          <LiftChart points={points} measure={weighted ? 'est. max' : 'best set'} unit={weighted ? unit : ''} />
        </section>
      )}

      {weighted && (
        <section className={styles.block}>
          <h3 className={`display ${styles.heading}`}>What that means in reps</h3>
          <p className={styles.note}>
            Roughly what you could lift for each rep count, rounded to weights your gym can load. Use it to pick a
            weight when a program asks for a rep count you have not tried.
          </p>
          <table className={styles.reps}>
            <thead>
              <tr>
                <th scope="col">Reps</th>
                <th scope="col">Weight</th>
              </tr>
            </thead>
            <tbody>
              {REP_TARGETS.map((reps) => {
                const estimate = fromKg(weightForReps(strongest.oneRepMaxKg!, reps), unit);
                const loadable = toKg(roundLoad(estimate, exercise.load, unit), unit);
                return (
                  <tr key={reps}>
                    <th scope="row">{reps}</th>
                    <td>{fmtLoad(loadable, exercise, unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className={styles.block}>
        <h3 className={`display ${styles.heading}`}>History</h3>
        <ul className={styles.history}>
          {[...sessions].reverse().map((session) => (
            <li key={session.date}>
              <span className={`mono ${styles.when}`}>{fmtShortDate(session.date)}</span>
              <span>
                {session.weightKg === null ? '' : `${fmtLoad(session.weightKg, exercise, unit)} × `}
                {session.reps.join(', ')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Lift history: totals, a list of every lift with its best, and a detail sheet per lift. */
export function LiftsPanel() {
  const logs = useTrainingStore((state) => state.logs);
  const unit = useTrainingStore((state) => state.unit);
  const [openId, setOpenId] = useState<string | null>(null);

  const lifts = allLiftStats(logs);
  const totals = trainingTotals(logs);
  const open = lifts.find((lift) => lift.exercise.id === openId);

  if (lifts.length === 0) {
    return (
      <section className={styles.empty}>
        <p className={`display ${styles.emptyTitle}`}>No lifts logged yet</p>
        <p className={styles.note}>
          Finish a session or log a lift in Training. Your records, estimated maxes and history for every lift will
          build up here.
        </p>
        <a className={styles.link} href="#training">
          Go to Training
        </a>
      </section>
    );
  }

  const sacks = totals.volumeKg / RICE_SACK_KG;

  return (
    <div className={styles.panel}>
      <section className={styles.hero} aria-label="Totals">
        <p className="eyebrow">Total lifted</p>
        <p className={styles.heroValue}>
          {fmtInt(fromKg(totals.volumeKg, unit))}
          <span className={styles.heroUnit}>{unit}</span>
        </p>
        {sacks >= 1 && (
          <p className={styles.note}>
            That is {sacks < 10 ? fmtDecimal(sacks, 1) : fmtInt(sacks)} sacks of rice, moved one rep at a time.
          </p>
        )}
      </section>

      <dl className={styles.records}>
        <div>
          <dt className="eyebrow">Training days</dt>
          <dd>{totals.days}</dd>
        </div>
        <div>
          <dt className="eyebrow">Sets</dt>
          <dd>{fmtInt(totals.sets)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Lifts</dt>
          <dd>{totals.lifts}</dd>
        </div>
      </dl>

      <section className={styles.block}>
        <h2 className={`display ${styles.heading}`}>Your lifts</h2>
        <ul className={styles.list}>
          {lifts.map((lift) => {
            const weighted = lift.strongest !== null && lift.heaviest !== null;
            return (
              <li key={lift.exercise.id}>
                <button type="button" className={styles.lift} onClick={() => setOpenId(lift.exercise.id)}>
                  <span className={styles.liftName}>{lift.exercise.name}</span>
                  <Sparkline
                    values={lift.sessions.map((session) => (weighted ? (session.oneRepMaxKg ?? 0) : session.topReps))}
                  />
                  <span className={`mono ${styles.liftBest}`}>
                    {weighted
                      ? `Best ${fmtSet(lift.heaviest!, lift, unit)} · est. max ${fmtInt(fromKg(lift.strongest!.oneRepMaxKg!, unit))}`
                      : `Best ${fmtSet(lift.mostReps, lift, unit)}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Sheet
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        eyebrow={open?.exercise.muscles}
        title={open?.exercise.name ?? ''}
      >
        {open && <LiftDetail stats={open} unit={unit} />}
      </Sheet>
    </div>
  );
}
