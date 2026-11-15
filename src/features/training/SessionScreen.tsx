import { useEffect, useRef, useState } from 'react';
import { EFFORTS } from '@/domain/training/effort';
import { getExercise } from '@/domain/training/exercises';
import { adviseLoad, lastLog } from '@/domain/training/loads';
import { swapKey } from '@/domain/training/program';
import {
  clearSlot,
  completeSet,
  elapsed,
  endRest,
  extendRest,
  isComplete,
  isPaused,
  jumpTo,
  pause,
  restRemaining,
  resume,
  setElapsed,
  skipExercise,
  summarize,
  type Session,
} from '@/domain/training/session';
import type { Equipment, Exercise, ExerciseLog, Lifter, LoadAdvice, PlannedExercise, Workout } from '@/domain/training/types';
import { displayWeight, toKg, UNIT_SYSTEMS, type WeightUnit } from '@/domain/training/units';
import { signalTimerDone, useWakeLock } from '@/lib/device';
import { useNow } from '@/lib/useNow';
import { useTrainingStore } from '@/state/trainingStore';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { NumberField } from '@/ui/NumberField';
import { Sheet } from '@/ui/Sheet';
import { Stamp } from '@/ui/Stamp';
import { fmtClock, fmtLoad, fmtRange, fmtStopwatch, loadUnit } from './copy';
import { ExerciseGuide } from './ExerciseGuide';
import { ExercisePicker } from './ExercisePicker';
import { PlateStack } from './PlateStack';
import styles from './SessionScreen.module.css';
import { useDeloadActive } from './useProgram';

interface SessionScreenProps {
  workout: Workout;
  session: Session;
  logs: ExerciseLog[];
  lifter: Lifter;
  equipment: Equipment;
  unit: WeightUnit;
}

const SECOND = 1000;

type Sheets = 'menu' | 'picker' | 'finish' | 'how';

interface WorkPanelProps {
  exercise: Exercise;
  planned: PlannedExercise;
  /** Sets already done for this exercise in this session. */
  done: Session['sets'][number];
  advice: LoadAdvice;
  previous?: ExerciseLog;
  unit: WeightUnit;
  /** Time on this set so far, not counting pauses. */
  setMs: number;
  /** Active session time. Holds are timed against it, so they stop when the session is paused. */
  activeMs: number;
  onDone: (entry: { weightKg: number | null; reps: number; rir: number }) => void;
}

/** The four effort buttons. Tapping one logs the set, so rating each set costs no extra taps. */
function EffortButtons({ onPick }: { onPick: (rir: number) => void }) {
  return (
    <div className={styles.effort} role="group" aria-label="Log this set. How many more reps could you have done?">
      <p className={styles.effortAsk}>Set done. How many more could you have done?</p>
      <div className={styles.effortRow}>
        {EFFORTS.map((effort) => (
          <button key={effort.rir} type="button" className={effort.rir === 2 ? styles.effortMain : styles.effortButton} onClick={() => onPick(effort.rir)}>
            <span className={styles.effortLabel}>{effort.label}</span>
            <span className={styles.effortDetail}>{effort.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type Hold =
  | { phase: 'idle' }
  | { phase: 'ready'; at: number }
  | { phase: 'running'; at: number }
  | { phase: 'done'; seconds: number };

/** A few seconds to get into position before the clock starts. */
const READY_MS = 3000;

/**
 * A timed hold, like a plank. Start, a short get-ready count, then the clock counts up toward the
 * target and beeps when it is reached. Stop, and the seconds are filled in. They can still be changed.
 */
function HoldPanel({ planned, advice, activeMs, onDone }: Pick<WorkPanelProps, 'planned' | 'advice' | 'activeMs' | 'onDone'>) {
  const target = advice.targetReps ?? planned.repsMin;
  const [hold, setHold] = useState<Hold>({ phase: 'idle' });
  const [seconds, setSeconds] = useState(target);
  const beeped = useRef(false);

  // Get-ready becomes the hold itself once the count is over.
  useEffect(() => {
    if (hold.phase === 'ready' && activeMs - hold.at >= READY_MS) setHold({ phase: 'running', at: hold.at + READY_MS });
  }, [activeMs, hold]);

  const held = hold.phase === 'running' ? Math.max(0, Math.floor((activeMs - hold.at) / 1000)) : 0;
  const reached = hold.phase === 'running' && held >= target;

  useEffect(() => {
    if (reached && !beeped.current) {
      beeped.current = true;
      signalTimerDone();
    }
  }, [reached]);

  const stop = () => {
    setSeconds(Math.max(1, held));
    setHold({ phase: 'done', seconds: held });
  };

  if (hold.phase === 'done') {
    return (
      <div className={styles.holdWork}>
        <div className={styles.holdClock}>
          <div className={styles.setClock}>
            <p className="eyebrow">You held</p>
            <p className={styles.setTime}>{fmtStopwatch(seconds * 1000)}</p>
          </div>
        </div>
        <div className={styles.holdActions}>
          <NumberField id="session-reps" label="Seconds you held" unit="sec" size="md" step={5} min={1} max={600} value={seconds} onChange={setSeconds} />
          <EffortButtons onPick={(rir) => onDone({ weightKg: null, reps: seconds, rir })} />
          <Button variant="quiet" onClick={() => { beeped.current = false; setHold({ phase: 'idle' }); }}>
            Hold again
          </Button>
        </div>
      </div>
    );
  }

  const readyLeft = hold.phase === 'ready' ? Math.max(1, Math.ceil((READY_MS - (activeMs - hold.at)) / 1000)) : 0;

  return (
    <div className={styles.holdWork}>
      <div className={styles.holdClock}>
        <p className="eyebrow">{hold.phase === 'ready' ? 'Get ready' : hold.phase === 'running' ? 'Hold' : `Hold for ${target} sec`}</p>
        <p className={reached ? styles.setTimeReached : styles.setTime} role="timer">
          {hold.phase === 'ready' ? readyLeft : fmtStopwatch(held * 1000)}
        </p>
        {hold.phase === 'running' && (
          <>
            <div className={styles.holdBar} aria-hidden="true">
              <span style={{ width: `${Math.min(100, (held / target) * 100)}%` }} />
            </div>
            <p className={styles.setNote}>{reached ? 'Target reached. Keep going, or stop when you need to.' : `Aim for ${target} seconds.`}</p>
          </>
        )}
      </div>

      <div className={styles.holdActions}>
      {hold.phase === 'idle' && (
        <>
          <Button size="lg" block onClick={() => { beeped.current = false; setHold({ phase: 'ready', at: activeMs }); }}>
            Start hold
          </Button>
          <Button variant="quiet" onClick={() => setHold({ phase: 'done', seconds: target })}>
            Enter the seconds myself
          </Button>
        </>
      )}
      {hold.phase === 'ready' && (
        <Button variant="outline" size="lg" block onClick={() => setHold({ phase: 'idle' })}>
          Cancel
        </Button>
      )}
      {hold.phase === 'running' && (
        <Button size="lg" block onClick={stop}>
          Stop
        </Button>
      )}
      </div>
    </div>
  );
}

/**
 * The set in front of the person: a clock counting up from when it began, then weight and reps side by
 * side, then how it felt. Tapping an effort button logs the set.
 */
function WorkPanel({ exercise, planned, done, advice, previous, unit, setMs, activeMs, onDone }: WorkPanelProps) {
  const weighted = exercise.load !== 'bodyweight';
  const lastSet = done[done.length - 1];
  const middle = Math.round((planned.repsMin + planned.repsMax) / 2);

  // Start from the last set of this session, then the plan's target, then last session.
  const [weight, setWeight] = useState(() => displayWeight(lastSet?.weightKg ?? advice.weightKg ?? 0, unit));
  const [reps, setReps] = useState(lastSet?.reps ?? advice.targetReps ?? previous?.reps[done.length] ?? middle);

  if (exercise.timed) return <HoldPanel planned={planned} advice={advice} activeMs={activeMs} onDone={onDone} />;

  return (
    <div className={styles.work}>
      <div className={styles.setClock}>
        <p className="eyebrow">Set time</p>
        <p className={styles.setTime} role="timer" aria-live="off">
          {fmtStopwatch(setMs)}
        </p>
      </div>

      <div className={weighted ? styles.inputs : styles.inputsOne}>
        {weighted && (
          <NumberField
            id="session-weight"
            label={`Weight (${loadUnit(exercise, unit)})`}
            unit={unit}
            hideUnit
            size="sm"
            step={UNIT_SYSTEMS[unit].inputStep[exercise.load as Exclude<Exercise['load'], 'bodyweight'>]}
            digits={1}
            min={0}
            max={1200}
            value={weight}
            onChange={setWeight}
          />
        )}
        <NumberField id="session-reps" label="Reps you got" unit="reps" hideUnit size={weighted ? 'sm' : 'md'} step={1} min={0} max={100} value={reps} onChange={setReps} />
      </div>
      {weighted && exercise.load === 'barbell' && <PlateStack total={weight} unit={unit} diagram={false} />}

      <EffortButtons onPick={(rir) => onDone({ weightKg: weighted ? toKg(weight, unit) : null, reps, rir })} />
    </div>
  );
}

/**
 * A guided workout, with nothing on screen but the set at hand. The tab bar and header are gone.
 * Rest is a big countdown. The session can be paused, reordered when equipment is taken, and finished early.
 */
export function SessionScreen({ workout, session, logs, lifter, equipment, unit }: SessionScreenProps) {
  const update = useTrainingStore((state) => state.updateSession);
  const finish = useTrainingStore((state) => state.finishSession);
  const discard = useTrainingStore((state) => state.discardSession);
  const swap = useTrainingStore((state) => state.swap);
  const deload = useDeloadActive();

  const paused = isPaused(session);
  const now = useNow(!paused);
  useWakeLock(!paused);

  const [sheet, setSheet] = useState<Sheets | null>(null);
  // Remembers that a sheet paused the session, so closing it resumes. A pause the person chose stays.
  const pausedBySheet = useRef(false);

  const planned = workout.exercises.find((candidate) => candidate.slot === session.slot) ?? workout.exercises[0]!;
  const exercise = getExercise(planned.exerciseId);
  const done = session.sets[planned.slot] ?? [];
  const liftNumber = workout.exercises.indexOf(planned) + 1;
  const resting = session.phase === 'rest';
  const remaining = restRemaining(session, now);

  const previous = lastLog(logs, exercise.id, session.date);
  const advice = adviseLoad(exercise, planned, previous, lifter, unit, { deload });
  const nextWeightKg = done[done.length - 1]?.weightKg ?? advice.weightKg;

  // The rest timer ran out.
  useEffect(() => {
    if (resting && !paused && remaining <= 0) {
      signalTimerDone();
      // The set clock starts at the moment the rest ended, not when this check happened to run.
      update((current) => endRest(current, current.restEndsAt ?? Date.now()));
    }
  }, [resting, paused, remaining, update]);

  // Every set of every lift is done.
  useEffect(() => {
    if (isComplete(session, workout)) finish(workout);
  }, [session, workout, finish]);

  /** Opens a sheet that needs the person's attention, so the clocks stop while it is open. */
  const openSheet = (which: Sheets) => {
    if (which !== 'how' && !paused) {
      update((current) => pause(current, Date.now()));
      pausedBySheet.current = true;
    }
    setSheet(which);
  };

  const closeSheet = () => {
    if (pausedBySheet.current) {
      update((current) => resume(current, Date.now()));
      pausedBySheet.current = false;
    }
    setSheet(null);
  };

  const skip = () => {
    const next = skipExercise(session, workout, Date.now());
    if (next) {
      update(() => next);
      closeSheet();
    } else {
      // Nothing else is left, so skipping the last lift means finishing.
      setSheet('finish');
    }
  };

  const soFar = summarize(session, workout, now);
  const targetLine = `${fmtLoad(nextWeightKg, exercise, unit)} × ${fmtRange(planned, exercise)}${exercise.timed ? '' : ' reps'}`;

  return (
    <div className={`on-board ${styles.session}`}>
      <header className={styles.top}>
        <div className={styles.topInfo}>
          <p className="eyebrow">
            {workout.name}
            {deload ? ' · easy week' : ''}
          </p>
          <p className={`mono ${styles.clock}`} aria-label="Time training">
            {fmtClock(elapsed(session, now))}
          </p>
        </div>
        <div className={styles.topActions}>
          {paused && sheet === null ? null : (
            <Button variant="outline" onClick={() => update((current) => pause(current, Date.now()))} disabled={paused}>
              Pause
            </Button>
          )}
          <button type="button" className={styles.more} onClick={() => openSheet('menu')} aria-label="More options">
            <Icon name="more" />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <p className={`mono ${styles.position}`}>
          {resting ? 'Up next · ' : ''}Lift {liftNumber} of {workout.exercises.length} · Set {done.length + 1} of {planned.sets}
        </p>
        <h1 className={`display ${styles.name}`}>{exercise.name}</h1>
        <p className={styles.target}>
          {targetLine}
          {advice.targetReps !== undefined && advice.basis !== 'start' && !exercise.timed && (
            <span className={styles.aim}> · aim for {advice.targetReps}</span>
          )}
        </p>

        {resting ? (
          <div className={styles.rest}>
            <p className="eyebrow">Rest</p>
            <p className={remaining <= 10 * SECOND ? styles.countdownEnding : styles.countdown} role="timer">
              {fmtClock(remaining)}
            </p>
            <div className={styles.restActions}>
              <Button variant="outline" onClick={() => update((c) => extendRest(c, -15 * SECOND, Date.now()))}>
                −15
              </Button>
              <Button variant="outline" onClick={() => update((c) => extendRest(c, 30 * SECOND, Date.now()))}>
                +30
              </Button>
              <Button size="lg" onClick={() => update((current) => endRest(current, Date.now()))}>
                Skip rest
              </Button>
            </div>
          </div>
        ) : (
          <WorkPanel
            key={`${planned.slot}:${done.length}:${exercise.id}:${unit}`}
            exercise={exercise}
            planned={planned}
            done={done}
            advice={advice}
            previous={previous}
            unit={unit}
            setMs={setElapsed(session, now)}
            activeMs={elapsed(session, now)}
            onDone={(entry) => update((current) => completeSet(current, workout, entry, Date.now()))}
          />
        )}
      </main>

      <footer className={styles.bottom}>
        <Button variant="quiet" onClick={() => openSheet('how')}>
          How to do it
        </Button>
      </footer>

      {paused && sheet === null && (
        <div className={styles.pausedLayer} role="dialog" aria-label="Session paused">
          <div className={styles.pausedCard}>
            <Stamp tone="blue">Paused</Stamp>
            <p>The clock and the rest timer are stopped. Take the time you need.</p>
            <Button size="lg" block onClick={() => update((current) => resume(current, Date.now()))}>
              Resume
            </Button>
            <Button variant="outline" block onClick={() => openSheet('finish')}>
              Finish now
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheet === 'how'} onClose={closeSheet} eyebrow={exercise.muscles} title={exercise.name}>
        <ExerciseGuide exercise={exercise} />
      </Sheet>

      <Sheet open={sheet === 'menu'} onClose={closeSheet} eyebrow="Session paused" title="Options">
        <div className={styles.sheetBody}>
          <Button variant="outline" size="lg" block onClick={() => setSheet('picker')}>
            Change this lift
          </Button>
          <Button variant="outline" size="lg" block onClick={skip}>
            Skip this lift
          </Button>

          <section className={styles.jump} aria-labelledby="jump-heading">
            <h3 id="jump-heading" className="eyebrow">
              Do a different lift now
            </h3>
            <p className={styles.sheetLead}>If the equipment is taken, start another and come back to this one.</p>
            <ol className={styles.lifts}>
              {workout.exercises.map((lift, index) => {
                const setsDone = Math.min(lift.sets, session.sets[lift.slot]?.length ?? 0);
                const current = lift.slot === session.slot;
                return (
                  <li key={lift.slot}>
                    <button
                      type="button"
                      className={styles.liftRow}
                      aria-current={current ? 'step' : undefined}
                      onClick={() => {
                        update((s) => jumpTo(s, workout, lift.slot, Date.now()));
                        closeSheet();
                      }}
                    >
                      <span className={`mono ${styles.liftNo}`}>{String(index + 1).padStart(2, '0')}</span>
                      <span className={styles.liftName}>{getExercise(lift.exerciseId).name}</span>
                      <span className={`mono ${styles.liftSets}`}>
                        {setsDone}/{lift.sets}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <Button variant="quiet" onClick={() => setSheet('finish')}>
            Finish the session
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'picker'} onClose={closeSheet} eyebrow="Session paused" title="Change this lift">
        <div className={styles.sheetBody}>
          <p className={styles.sheetLead}>
            The timer is paused while you choose. Sets already done for {exercise.name} will be dropped.
          </p>
          <ExercisePicker
            workout={workout}
            planned={planned}
            equipment={equipment}
            onPick={(exerciseId) => {
              swap(swapKey(workout.id, planned.slot), exerciseId);
              update((current) => jumpTo(clearSlot(current, planned.slot), workout, planned.slot, Date.now()));
              closeSheet();
            }}
          />
        </div>
      </Sheet>

      <Sheet open={sheet === 'finish'} onClose={closeSheet} eyebrow="Session paused" title="Finish now?">
        <div className={styles.sheetBody}>
          <p className={styles.sheetLead}>
            You have done {soFar.setsDone} of {soFar.setsPlanned} sets across {soFar.liftsDone} of {soFar.liftsPlanned}{' '}
            lifts. A short session still counts. What you did is saved and shapes next time's weights.
          </p>
          <Button size="lg" block onClick={() => finish(workout)}>
            Save and finish <Icon name="check" />
          </Button>
          <Button variant="outline" size="lg" block onClick={closeSheet}>
            Keep going
          </Button>
          <Button variant="quiet" onClick={discard}>
            Discard this session
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
