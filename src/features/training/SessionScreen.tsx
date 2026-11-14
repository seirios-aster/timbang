import { useEffect, useRef, useState } from 'react';
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
  skipExercise,
  summarize,
  type Session,
} from '@/domain/training/session';
import type { Equipment, Exercise, ExerciseLog, Lifter, PlannedExercise, Workout } from '@/domain/training/types';
import { displayWeight, toKg, UNIT_SYSTEMS, type WeightUnit } from '@/domain/training/units';
import { signalTimerDone, useWakeLock } from '@/lib/device';
import { useNow } from '@/lib/useNow';
import { useTrainingStore } from '@/state/trainingStore';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { NumberField } from '@/ui/NumberField';
import { Sheet } from '@/ui/Sheet';
import { Stamp } from '@/ui/Stamp';
import { fmtClock, fmtLoad, fmtRange, loadUnit } from './copy';
import { ExerciseGuide } from './ExerciseGuide';
import { ExercisePicker } from './ExercisePicker';
import { PlateStack } from './PlateStack';
import styles from './SessionScreen.module.css';

interface SessionScreenProps {
  workout: Workout;
  session: Session;
  logs: ExerciseLog[];
  lifter: Lifter;
  equipment: Equipment;
  unit: WeightUnit;
}

const SECOND = 1000;

interface WorkPanelProps {
  exercise: Exercise;
  planned: PlannedExercise;
  /** Sets already done for this exercise in this session. */
  done: Session['sets'][number];
  suggestedKg: number | null;
  previous?: ExerciseLog;
  unit: WeightUnit;
  onDone: (entry: { weightKg: number | null; reps: number }) => void;
}

/** The set in front of the person: what to load, how many reps, and one big button when it is done. */
function WorkPanel({ exercise, planned, done, suggestedKg, previous, unit, onDone }: WorkPanelProps) {
  const weighted = exercise.load !== 'bodyweight';
  const lastSet = done[done.length - 1];
  const middle = Math.round((planned.repsMin + planned.repsMax) / 2);

  // Start from the last set of this session, then last session, then the suggestion.
  const [weight, setWeight] = useState(() => displayWeight(lastSet?.weightKg ?? suggestedKg ?? 0, unit));
  const [reps, setReps] = useState(lastSet?.reps ?? previous?.reps[done.length] ?? middle);

  return (
    <div className={styles.work}>
      {exercise.load !== 'bodyweight' && (
        <>
          <NumberField
            id="session-weight"
            label={`Weight (${loadUnit(exercise, unit)})`}
            unit={unit}
            size="md"
            step={UNIT_SYSTEMS[unit].inputStep[exercise.load]}
            digits={1}
            min={0}
            max={1200}
            value={weight}
            onChange={setWeight}
          />
          {exercise.load === 'barbell' && <PlateStack total={weight} unit={unit} />}
        </>
      )}
      <NumberField
        id="session-reps"
        label={exercise.timed ? 'Seconds you held' : 'Reps you got'}
        unit={exercise.timed ? 'sec' : 'reps'}
        size="md"
        step={exercise.timed ? 5 : 1}
        min={0}
        max={exercise.timed ? 600 : 100}
        value={reps}
        onChange={setReps}
      />
      <Button size="lg" block onClick={() => onDone({ weightKg: weighted ? toKg(weight, unit) : null, reps })}>
        Set done <Icon name="check" />
      </Button>
    </div>
  );
}

/**
 * A guided workout: one set at a time with a rest timer between sets.
 * The session can be paused, reordered when equipment is taken, and finished early.
 */
export function SessionScreen({ workout, session, logs, lifter, equipment, unit }: SessionScreenProps) {
  const update = useTrainingStore((state) => state.updateSession);
  const finish = useTrainingStore((state) => state.finishSession);
  const discard = useTrainingStore((state) => state.discardSession);
  const swap = useTrainingStore((state) => state.swap);

  const paused = isPaused(session);
  const now = useNow(!paused);
  useWakeLock(!paused);

  const [sheet, setSheet] = useState<'picker' | 'finish' | null>(null);
  // Remembers that a sheet paused the session, so closing it resumes. A pause the person chose stays.
  const pausedBySheet = useRef(false);

  const planned = workout.exercises.find((candidate) => candidate.slot === session.slot) ?? workout.exercises[0]!;
  const exercise = getExercise(planned.exerciseId);
  const done = session.sets[planned.slot] ?? [];
  const liftNumber = workout.exercises.indexOf(planned) + 1;
  const resting = session.phase === 'rest';
  const remaining = restRemaining(session, now);

  const previous = lastLog(logs, exercise.id, session.date);
  const advice = adviseLoad(exercise, planned, previous, lifter, unit);
  const nextWeightKg = done[done.length - 1]?.weightKg ?? advice.weightKg;

  // The rest timer ran out.
  useEffect(() => {
    if (resting && !paused && remaining <= 0) {
      signalTimerDone();
      update(endRest);
    }
  }, [resting, paused, remaining, update]);

  // Every set of every lift is done.
  useEffect(() => {
    if (isComplete(session, workout)) finish(workout);
  }, [session, workout, finish]);

  const openSheet = (which: 'picker' | 'finish') => {
    if (!paused) {
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
    const next = skipExercise(session, workout);
    // Nothing else is left, so skipping the last lift ends the session.
    if (next) update(() => next);
    else openSheet('finish');
  };

  const soFar = summarize(session, workout, now);

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <div className={styles.barInfo}>
          <p className="eyebrow">{workout.name} · session</p>
          <p className={styles.clock} aria-label="Time training">
            {fmtClock(elapsed(session, now))}
          </p>
        </div>
        <div className={styles.barActions}>
          {paused ? (
            <Button onClick={() => update((current) => resume(current, Date.now()))}>Resume</Button>
          ) : (
            <Button variant="outline" onClick={() => update((current) => pause(current, Date.now()))}>
              Pause
            </Button>
          )}
          <Button variant="outline" onClick={() => openSheet('finish')}>
            Finish
          </Button>
        </div>
      </header>

      {/* One cell per lift. Tap one to do it now, for when the equipment for the current lift is taken. */}
      <ol className={styles.lifts} aria-label="Lifts in this session">
        {workout.exercises.map((lift, index) => {
          const setsDone = Math.min(lift.sets, session.sets[lift.slot]?.length ?? 0);
          const name = getExercise(lift.exerciseId).name;
          return (
            <li key={lift.slot}>
              <button
                type="button"
                className={styles.lift}
                aria-current={lift.slot === session.slot ? 'step' : undefined}
                aria-label={`Lift ${index + 1}, ${name}, ${setsDone} of ${lift.sets} sets done. Do this now.`}
                onClick={() => update((current) => jumpTo(current, workout, lift.slot))}
                disabled={paused || lift.slot === session.slot}
              >
                <span className={styles.liftNo}>{index + 1}</span>
                <span className={styles.tally} aria-hidden="true">
                  {Array.from({ length: lift.sets }, (_, i) => (
                    <span key={i} className={i < setsDone ? styles.tick : styles.tickTodo} />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <section className={`on-board ${styles.card}`} aria-label="Current lift">
        {paused && sheet === null && (
          <div className={styles.paused}>
            <Stamp tone="blue">Paused</Stamp>
            <p>Timers are stopped. Take the time you need.</p>
            <Button size="lg" block onClick={() => update((current) => resume(current, Date.now()))}>
              Resume
            </Button>
          </div>
        )}

        <div className={styles.cardBody} inert={paused}>
          <p className={`mono ${styles.position}`}>
            {resting ? 'Up next · ' : ''}Lift {liftNumber} of {workout.exercises.length} · Set {done.length + 1} of{' '}
            {planned.sets}
          </p>
          <h1 className={`display ${styles.name}`}>{exercise.name}</h1>
          <p className={styles.target}>
            {fmtLoad(nextWeightKg, exercise, unit)} × {fmtRange(planned, exercise)}
            {exercise.timed ? '' : ' reps'}
          </p>

          {resting ? (
            <div className={styles.rest}>
              <p className="eyebrow">Rest</p>
              <p className={remaining <= 10 * SECOND ? styles.countdownEnding : styles.countdown} role="timer">
                {fmtClock(remaining)}
              </p>
              <div className={styles.restActions}>
                <Button variant="outline" onClick={() => update((c) => extendRest(c, -15 * SECOND, Date.now()))}>
                  −15 sec
                </Button>
                <Button variant="outline" onClick={() => update((c) => extendRest(c, 30 * SECOND, Date.now()))}>
                  +30 sec
                </Button>
                <Button onClick={() => update(endRest)}>Skip rest</Button>
              </div>
            </div>
          ) : (
            <WorkPanel
              key={`${planned.slot}:${done.length}:${exercise.id}:${unit}`}
              exercise={exercise}
              planned={planned}
              done={done}
              suggestedKg={advice.weightKg}
              previous={previous}
              unit={unit}
              onDone={(entry) => update((current) => completeSet(current, workout, entry, Date.now()))}
            />
          )}

          <ExerciseGuide key={exercise.id} exercise={exercise} />

          <div className={styles.links}>
            <Button variant="quiet" onClick={() => openSheet('picker')}>
              Change this lift
            </Button>
            <Button variant="quiet" onClick={skip}>
              Skip this lift
            </Button>
          </div>
        </div>
      </section>

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
              update((current) => jumpTo(clearSlot(current, planned.slot), workout, planned.slot));
              closeSheet();
            }}
          />
        </div>
      </Sheet>

      <Sheet open={sheet === 'finish'} onClose={closeSheet} eyebrow="Session paused" title="Finish now?">
        <div className={styles.sheetBody}>
          <p className={styles.sheetLead}>
            You have done {soFar.setsDone} of {soFar.setsPlanned} sets across {soFar.liftsDone} of{' '}
            {soFar.liftsPlanned} lifts. A short session still counts. What you did is saved and shapes next time's
            weights.
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
