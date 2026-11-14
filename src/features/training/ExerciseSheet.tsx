import { useState } from 'react';
import { getExercise } from '@/domain/training/exercises';
import { adviseLoad, lastLog } from '@/domain/training/loads';
import { alternatives, swapKey } from '@/domain/training/program';
import type { Equipment, Exercise, ExerciseLog, Lifter, PlannedExercise, Workout } from '@/domain/training/types';
import { fmtShortDate } from '@/lib/date';
import { fmtRest } from '@/lib/format';
import { useTrainingStore } from '@/state/trainingStore';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { NumberField } from '@/ui/NumberField';
import { Sheet } from '@/ui/Sheet';
import { Stamp } from '@/ui/Stamp';
import { BASIS_STAMP, fmtDose, fmtLoad, loadUnit } from './copy';
import styles from './ExerciseSheet.module.css';
import { PlateStack } from './PlateStack';

interface ExerciseSheetProps {
  workout: Workout;
  /** Slot of the open exercise, or null when closed. */
  slot: number | null;
  logs: ExerciseLog[];
  lifter: Lifter;
  equipment: Equipment;
  today: string;
  onClose: () => void;
}

/** Steps for typing a weight. Finer than the suggested jumps, since gym equipment varies. */
const INPUT_STEP = { barbell: 2.5, dumbbell: 0.5, machine: 2.5, bodyweight: 1 } as const;

/** Reps on each set to start the log from: today's entry, else last session's, else the middle of the range. */
function startingReps(planned: PlannedExercise, done?: ExerciseLog, previous?: ExerciseLog): number[] {
  const fallback = Math.round((planned.repsMin + planned.repsMax) / 2);
  const source = done?.reps ?? previous?.reps ?? [];
  return Array.from({ length: planned.sets }, (_, i) => source[i] ?? source[source.length - 1] ?? fallback);
}

interface LogFormProps {
  exercise: Exercise;
  planned: PlannedExercise;
  suggestedKg: number | null;
  done?: ExerciseLog;
  previous?: ExerciseLog;
  today: string;
  onSaved: () => void;
}

function LogForm({ exercise, planned, suggestedKg, done, previous, today, onSaved }: LogFormProps) {
  const log = useTrainingStore((state) => state.log);
  const weighted = exercise.load !== 'bodyweight';
  const [weightKg, setWeightKg] = useState(done?.weightKg ?? suggestedKg ?? 0);
  const [reps, setReps] = useState(() => startingReps(planned, done, previous));

  const unit = exercise.timed ? 'sec' : 'reps';
  const step = exercise.timed ? 5 : 1;
  const changeSet = (index: number, delta: number) =>
    setReps((current) => current.map((value, i) => (i === index ? Math.max(0, value + delta) : value)));

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        log({ exerciseId: exercise.id, date: today, weightKg: weighted ? weightKg : null, reps });
        onSaved();
      }}
    >
      <h3 className={`display ${styles.heading}`}>Log today</h3>

      {weighted && (
        <>
          <NumberField
            id="log-weight"
            label={`Weight used (${loadUnit(exercise)})`}
            unit="kg"
            size="md"
            step={INPUT_STEP[exercise.load]}
            digits={1}
            min={0}
            max={500}
            value={weightKg}
            onChange={setWeightKg}
          />
          {exercise.load === 'barbell' && <PlateStack totalKg={weightKg} />}
        </>
      )}

      <fieldset className={styles.sets}>
        <legend className="eyebrow">{exercise.timed ? 'Seconds held on each set' : 'Reps on each set'}</legend>
        <div className={styles.setGrid}>
          {reps.map((value, index) => (
            <div key={index} className={styles.set}>
              <button
                type="button"
                className={styles.setStep}
                onClick={() => changeSet(index, step)}
                aria-label={`Set ${index + 1}: more ${unit}`}
              >
                <Icon name="plus" size={20} />
              </button>
              <p className={styles.setValue} aria-live="polite">
                <span className="visually-hidden">Set {index + 1}: </span>
                {value}
                <span className="visually-hidden"> {unit}</span>
              </p>
              <button
                type="button"
                className={styles.setStep}
                onClick={() => changeSet(index, -step)}
                disabled={value <= 0}
                aria-label={`Set ${index + 1}: fewer ${unit}`}
              >
                <Icon name="minus" size={20} />
              </button>
              <span className={`mono ${styles.setLabel}`} aria-hidden="true">
                Set {index + 1}
              </span>
            </div>
          ))}
        </div>
      </fieldset>

      <Button type="submit" size="lg" block>
        {done ? 'Update log' : 'Save'} <Icon name="check" />
      </Button>
    </form>
  );
}

/** Opens from a line on the workout board: how to do the lift, what to load, a log, and swaps. */
export function ExerciseSheet({ workout, slot, logs, lifter, equipment, today, onClose }: ExerciseSheetProps) {
  const swap = useTrainingStore((state) => state.swap);
  const planned = slot === null ? undefined : workout.exercises.find((candidate) => candidate.slot === slot);

  if (!planned) {
    return (
      <Sheet open={false} onClose={onClose} title="">
        {null}
      </Sheet>
    );
  }

  const exercise = getExercise(planned.exerciseId);
  const previous = lastLog(logs, exercise.id, today);
  const done = logs.find((log) => log.exerciseId === exercise.id && log.date === today);
  const advice = adviseLoad(exercise, planned, previous, lifter);
  const stamp = BASIS_STAMP[advice.basis];
  const options = alternatives(workout, planned, equipment);

  return (
    <Sheet open onClose={onClose} eyebrow={exercise.muscles} title={exercise.name}>
      <div className={styles.body}>
        <p>{exercise.cue}</p>

        <dl className={styles.facts}>
          <div>
            <dt className="eyebrow">Sets × {exercise.timed ? 'hold' : 'reps'}</dt>
            <dd className={styles.fact}>{fmtDose(planned, exercise)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Rest</dt>
            <dd className={styles.fact}>{fmtRest(planned.restSec)}</dd>
          </div>
        </dl>

        <section className={styles.advice} aria-label="What to load">
          <div className={styles.adviceHead}>
            <p className={styles.adviceLoad}>{fmtLoad(advice.weightKg, exercise)}</p>
            <Stamp tone={stamp.tone}>{stamp.label}</Stamp>
          </div>
          <p className={styles.adviceNote}>{advice.note}</p>
          {previous && (
            <p className={`mono ${styles.last}`}>
              Last time, {fmtShortDate(previous.date)}: {fmtLoad(previous.weightKg, exercise)} ×{' '}
              {previous.reps.join(', ')}
            </p>
          )}
        </section>

        <LogForm
          key={exercise.id}
          exercise={exercise}
          planned={planned}
          suggestedKg={advice.weightKg}
          done={done}
          previous={previous}
          today={today}
          onSaved={onClose}
        />

        {options.length > 0 && (
          <section className={styles.swaps} aria-labelledby="exercise-swap-heading">
            <h3 id="exercise-swap-heading" className={`display ${styles.heading}`}>
              Palitan
            </h3>
            <p className={styles.swapLead}>Swap for another lift that trains the same thing.</p>
            <ul className={styles.list}>
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={styles.option}
                    onClick={() => swap(swapKey(workout.id, planned.slot), option.id)}
                  >
                    <span className={styles.optionName}>{option.name}</span>
                    <span className={styles.optionDetail}>{option.muscles}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Sheet>
  );
}
