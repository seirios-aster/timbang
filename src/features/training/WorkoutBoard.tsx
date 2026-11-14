import { getExercise } from '@/domain/training/exercises';
import { adviseLoad, lastLog } from '@/domain/training/loads';
import { estimateMinutes } from '@/domain/training/program';
import type { ExerciseLog, Lifter, Workout } from '@/domain/training/types';
import type { WeightUnit } from '@/domain/training/units';
import { fmtRest } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { fmtDose, fmtWeight, loadUnit } from './copy';
import styles from './WorkoutBoard.module.css';

interface WorkoutBoardProps {
  workout: Workout;
  logs: ExerciseLog[];
  lifter: Lifter;
  unit: WeightUnit;
  /** Today's date, YYYY-MM-DD. Exercises logged today show as done. */
  today: string;
  onSelect: (slot: number) => void;
  onStart: () => void;
}

/**
 * The day's workout, written up like a gym board: each exercise with its sets,
 * reps, rest and the weight to load. Tapping a line opens the exercise.
 */
export function WorkoutBoard({ workout, logs, lifter, unit, today, onSelect, onStart }: WorkoutBoardProps) {
  const doneCount = workout.exercises.filter((planned) =>
    logs.some((log) => log.exerciseId === planned.exerciseId && log.date === today),
  ).length;
  const allDone = doneCount === workout.exercises.length;

  return (
    <article className={`on-board ${styles.board}`} aria-label={`${workout.name} workout`}>
      <header className={styles.head}>
        <div>
          <h2 className={`display ${styles.name}`}>{workout.name}</h2>
          <p className={styles.focus}>{workout.focus}</p>
        </div>
        <p className={`mono ${styles.meta}`}>
          {workout.exercises.length} lifts
          <br />
          about {estimateMinutes(workout)} min
          {doneCount > 0 && (
            <>
              <br />
              {doneCount} of {workout.exercises.length} logged
            </>
          )}
        </p>
      </header>

      <div className={styles.start}>
        <Button size="lg" block onClick={onStart}>
          {allDone ? 'Run it again' : doneCount > 0 ? 'Continue as a session' : 'Start session'}
          <Icon name="arrowRight" />
        </Button>
        <p className={styles.startNote}>Walks you through set by set, with a rest timer.</p>
      </div>

      <ol className={styles.list}>
        {workout.exercises.map((planned, index) => {
          const exercise = getExercise(planned.exerciseId);
          const done = logs.find((log) => log.exerciseId === planned.exerciseId && log.date === today);
          const advice = adviseLoad(exercise, planned, lastLog(logs, planned.exerciseId, today), lifter, unit);
          const weightKg = done ? done.weightKg : advice.weightKg;
          const unitLabel = loadUnit(exercise, unit);

          return (
            <li key={planned.slot}>
              <button
                type="button"
                className={styles.row}
                onClick={() => onSelect(planned.slot)}
                aria-label={`${exercise.name}, ${planned.sets} sets of ${planned.repsMin} to ${planned.repsMax}${exercise.timed ? ' seconds' : ''}${weightKg === null ? '' : `, ${fmtWeight(weightKg, unit)} ${unitLabel}`}${done ? ', logged today' : ''}. Open to see how, log or change it.`}
              >
                <span className={`mono ${styles.index}`}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.exercise}>
                  <span className={styles.exerciseName}>{exercise.name}</span>
                  <span className={`mono ${styles.dose}`}>
                    {fmtDose(planned, exercise)} · rest {fmtRest(planned.restSec)}
                  </span>
                </span>
                <span className={styles.load}>
                  {weightKg === null ? (
                    <span className={styles.loadWord}>
                      {exercise.load !== 'bodyweight' ? 'Pick' : exercise.timed ? 'Hold' : 'BW'}
                    </span>
                  ) : (
                    <>
                      <span className={styles.loadValue}>{fmtWeight(weightKg, unit)}</span>
                      <span className={`mono ${styles.loadUnit}`}>{unitLabel}</span>
                    </>
                  )}
                </span>
                <span className={done ? styles.done : styles.todo}>{done && <Icon name="check" size={16} />}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
