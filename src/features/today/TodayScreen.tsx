import { useState } from 'react';
import type { Route } from '@/app/router';
import { estimateMinutes, nextWorkout } from '@/domain/training/program';
import { sortByDate } from '@/domain/progress/trend';
import { GOAL_LABEL } from '@/features/target/copy';
import { EatBlock } from './EatBlock';
import { InstallCard } from './InstallCard';
import { StepsSheet } from './StepsSheet';
import { useProgram } from '@/features/training/useProgram';
import { DAYS, todayIndex, todayIso } from '@/lib/date';
import { fmtBody, fmtWater } from '@/lib/units';
import { useUnits } from '@/state/settingsStore';
import { useProfileStore } from '@/state/profileStore';
import { useProgressStore } from '@/state/progressStore';
import { useStepsStore } from '@/state/stepsStore';
import { useTargets } from '@/state/useTargets';
import { useTrainingStore } from '@/state/trainingStore';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Stamp } from '@/ui/Stamp';
import styles from './TodayScreen.module.css';

interface TodayScreenProps {
  go: (route: Route) => void;
}

/** Home. What to do today in three parts: train, eat, weigh in. */
export function TodayScreen({ go }: TodayScreenProps) {
  const profile = useProfileStore((state) => state.profile);
  const entries = useProgressStore((state) => state.entries);
  const logs = useTrainingStore((state) => state.logs);
  const session = useTrainingStore((state) => state.session);
  const beginSession = useTrainingStore((state) => state.beginSession);
  const targets = useTargets();
  const stepDays = useStepsStore((state) => state.days);
  const stepGoal = useStepsStore((state) => state.goal);
  const [stepsOpen, setStepsOpen] = useState(false);
  const { system } = useUnits();
  const { program } = useProgram();

  if (!profile || !targets) return null;

  const dayIndex = todayIndex();
  const today = todayIso();

  // Train
  const workout = program?.week[dayIndex] ?? null;
  const upNext = program && !workout ? nextWorkout(program, dayIndex) : null;
  const loggedCount = workout
    ? workout.exercises.filter((planned) =>
        logs.some((log) => log.exerciseId === planned.exerciseId && log.date === today),
      ).length
    : 0;
  const trained = workout !== null && loggedCount === workout.exercises.length;

  // Weigh in
  const weighIns = sortByDate(entries);
  const lastWeighIn = weighIns[weighIns.length - 1];
  const weighedToday = lastWeighIn?.date === today;

  return (
    <div className={styles.screen}>
      <header className={styles.hero}>
        <p className="eyebrow">
          {DAYS[dayIndex]?.long} · {GOAL_LABEL[profile.goal]}
        </p>
        <h1 className={`display ${styles.title}`}>Today</h1>
      </header>

      {/* Train */}
      <section className={`on-board ${styles.train}`} aria-labelledby="today-train">
        <div className={styles.blockHead}>
          <h2 id="today-train" className={`mono ${styles.label}`}>
            Train
          </h2>
          {trained && <Stamp tone="green">Done</Stamp>}
        </div>

        {session ? (
          <>
            <p className={`display ${styles.big}`}>Session running</p>
            <p className={styles.sub}>Your workout is waiting where you left it.</p>
            <Button size="lg" block onClick={() => go('training')}>
              Back to my session <Icon name="arrowRight" />
            </Button>
          </>
        ) : workout ? (
          <>
            <p className={`display ${styles.big}`}>{workout.name}</p>
            <p className={styles.sub}>
              {workout.focus} · {workout.exercises.length} lifts · about {estimateMinutes(workout)} min
              {loggedCount > 0 && !trained && ` · ${loggedCount} logged`}
            </p>
            {trained ? (
              <Button variant="outline" onClick={() => go('training')}>
                See what you did
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  block
                  onClick={() => {
                    beginSession(workout, dayIndex);
                    go('training');
                  }}
                >
                  Start session <Icon name="arrowRight" />
                </Button>
                <Button variant="quiet" onClick={() => go('training')}>
                  Look at the workout first
                </Button>
              </>
            )}
          </>
        ) : program ? (
          <>
            <p className={`display ${styles.big}`}>Pahinga</p>
            <p className={styles.sub}>
              Rest day. Sleep well and hit your protein.
              {upNext && ` Next up: ${upNext.workout.name}, ${upNext.inDays === 1 ? 'tomorrow' : `in ${upNext.inDays} days`}.`}
            </p>
            <Button variant="outline" onClick={() => go('training')}>
              See the week
            </Button>
          </>
        ) : (
          <>
            <p className={`display ${styles.big}`}>No plan yet</p>
            <p className={styles.sub}>Set how many days you can lift and the app will lay out your week.</p>
            <Button size="lg" block onClick={() => go('training')}>
              Set up my training <Icon name="arrowRight" />
            </Button>
          </>
        )}
      </section>

      <EatBlock go={go} />

      <StepsSheet open={stepsOpen} onClose={() => setStepsOpen(false)} />

      <InstallCard />

      {/* Weigh in, water, target */}
      <ul className={styles.rows}>
        <li>
          <button type="button" className={styles.row} onClick={() => go('progress')}>
            <span className={`mono ${styles.label}`}>Weigh in</span>
            <span className={styles.rowValue}>
              {weighedToday && lastWeighIn
                ? `${fmtBody(lastWeighIn.weightKg, system)}, logged today`
                : lastWeighIn
                  ? `Last: ${fmtBody(lastWeighIn.weightKg, system)}. Log today's`
                  : 'Log your first weigh-in'}
            </span>
            <span className={weighedToday ? styles.rowDone : styles.rowGo}>
              <Icon name={weighedToday ? 'check' : 'arrowRight'} size={18} />
            </span>
          </button>
        </li>
        <li>
          <button type="button" className={styles.row} onClick={() => setStepsOpen(true)}>
            <span className={`mono ${styles.label}`}>Steps</span>
            <span className={styles.rowValue}>
              {stepDays[today] ? `${stepDays[today].toLocaleString('en-PH')} of ${stepGoal.toLocaleString('en-PH')}` : 'Log today\'s steps'}
            </span>
            <span className={stepDays[today] && stepDays[today] >= stepGoal ? styles.rowDone : styles.rowGo}>
              <Icon name={stepDays[today] && stepDays[today] >= stepGoal ? 'check' : 'arrowRight'} size={18} />
            </span>
          </button>
        </li>
        <li>
          <div className={styles.row}>
            <span className={`mono ${styles.label}`}>Water</span>
            <span className={styles.rowValue}>About {fmtWater(targets.waterL, system)}</span>
          </div>
        </li>
        <li>
          <button type="button" className={styles.row} onClick={() => go('target')}>
            <span className={`mono ${styles.label}`}>Target</span>
            <span className={styles.rowValue}>How your numbers are set, and your details</span>
            <span className={styles.rowGo}>
              <Icon name="arrowRight" size={18} />
            </span>
          </button>
        </li>
      </ul>
    </div>
  );
}
