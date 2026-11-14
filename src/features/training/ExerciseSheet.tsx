import { useState } from 'react';
import { getExercise } from '@/domain/training/exercises';
import { adviseLoad, lastLog } from '@/domain/training/loads';
import { swapKey } from '@/domain/training/program';
import type { Equipment, Exercise, ExerciseLog, Lifter, PlannedExercise, Workout } from '@/domain/training/types';
import { displayWeight, toKg, UNIT_SYSTEMS, type WeightUnit } from '@/domain/training/units';
import { fmtShortDate } from '@/lib/date';
import { fmtRest } from '@/lib/format';
import { useTrainingStore } from '@/state/trainingStore';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { NumberField } from '@/ui/NumberField';
import { Sheet } from '@/ui/Sheet';
import { Stamp } from '@/ui/Stamp';
import { BASIS_STAMP, fmtDose, fmtLoad, loadUnit } from './copy';
import { ExerciseGuide } from './ExerciseGuide';
import { ExercisePicker } from './ExercisePicker';
import styles from './ExerciseSheet.module.css';
import { PlateStack } from './PlateStack';
import { SetCounters } from './SetCounters';

interface ExerciseSheetProps {
  workout: Workout;
  /** Slot of the open exercise, or null when closed. */
  slot: number | null;
  logs: ExerciseLog[];
  lifter: Lifter;
  equipment: Equipment;
  unit: WeightUnit;
  today: string;
  onClose: () => void;
}

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
  unit: WeightUnit;
  today: string;
  onSaved: () => void;
}

function LogForm({ exercise, planned, suggestedKg, done, previous, unit, today, onSaved }: LogFormProps) {
  const log = useTrainingStore((state) => state.log);
  const weighted = exercise.load !== 'bodyweight';
  // The field works in the gym's unit. It is converted to kg when saved.
  const [weight, setWeight] = useState(() => displayWeight(done?.weightKg ?? suggestedKg ?? 0, unit));
  const [reps, setReps] = useState(() => startingReps(planned, done, previous));

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        log({ exerciseId: exercise.id, date: today, weightKg: weighted ? toKg(weight, unit) : null, reps });
        onSaved();
      }}
    >
      <h3 className={`display ${styles.heading}`}>Log today</h3>

      {exercise.load !== 'bodyweight' && (
        <>
          <NumberField
            id="log-weight"
            label={`Weight used (${loadUnit(exercise, unit)})`}
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

      <SetCounters
        legend={exercise.timed ? 'Seconds held on each set' : 'Reps on each set'}
        unit={exercise.timed ? 'sec' : 'reps'}
        step={exercise.timed ? 5 : 1}
        values={reps}
        onChange={setReps}
      />

      <Button type="submit" size="lg" block>
        {done ? 'Update log' : 'Save'} <Icon name="check" />
      </Button>
    </form>
  );
}

/** Opens from a line on the workout board: how to do the lift, what to load, a log, and swaps. */
export function ExerciseSheet({ workout, slot, logs, lifter, equipment, unit, today, onClose }: ExerciseSheetProps) {
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
  const advice = adviseLoad(exercise, planned, previous, lifter, unit);
  const stamp = BASIS_STAMP[advice.basis];

  return (
    <Sheet open onClose={onClose} eyebrow={exercise.muscles} title={exercise.name}>
      <div className={styles.body}>
        <ExerciseGuide key={exercise.id} exercise={exercise} />

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
            <p className={styles.adviceLoad}>{fmtLoad(advice.weightKg, exercise, unit)}</p>
            <Stamp tone={stamp.tone}>{stamp.label}</Stamp>
          </div>
          <p className={styles.adviceNote}>{advice.note}</p>
          {previous && (
            <p className={`mono ${styles.last}`}>
              Last time, {fmtShortDate(previous.date)}: {fmtLoad(previous.weightKg, exercise, unit)} ×{' '}
              {previous.reps.join(', ')}
            </p>
          )}
        </section>

        <LogForm
          key={`${exercise.id}-${unit}`}
          exercise={exercise}
          planned={planned}
          suggestedKg={advice.weightKg}
          done={done}
          previous={previous}
          unit={unit}
          today={today}
          onSaved={onClose}
        />

        <section className={styles.swaps} aria-labelledby="exercise-swap-heading">
          <h3 id="exercise-swap-heading" className={`display ${styles.heading}`}>
            Change this lift
          </h3>
          <p className={styles.swapLead}>
            No machine for it, or it is taken? Pick another. Your choice stays for next week too.
          </p>
          <ExercisePicker
            key={exercise.id}
            workout={workout}
            planned={planned}
            equipment={equipment}
            onPick={(exerciseId) => swap(swapKey(workout.id, planned.slot), exerciseId)}
          />
        </section>
      </div>
    </Sheet>
  );
}
