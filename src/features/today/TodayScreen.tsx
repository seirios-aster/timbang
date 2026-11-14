import type { Route } from '@/app/router';
import { getFood } from '@/domain/foods/catalog';
import { planKey } from '@/domain/mealplan/generator';
import { mealTotals } from '@/domain/mealplan/totals';
import { eatenTotals } from '@/domain/mealplan/tracking';
import { estimateMinutes, nextWorkout } from '@/domain/training/program';
import { sortByDate } from '@/domain/progress/trend';
import { GOAL_LABEL } from '@/features/target/copy';
import { useProgram } from '@/features/training/useProgram';
import { DAYS, todayIndex, todayIso } from '@/lib/date';
import { fmtDecimal, fmtInt } from '@/lib/format';
import { useDayLog, useMealLogStore } from '@/state/mealLogStore';
import { effectiveDay, usePlanStore } from '@/state/planStore';
import { useProfileStore } from '@/state/profileStore';
import { useProgressStore } from '@/state/progressStore';
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
  const prefs = useProfileStore((state) => state.prefs);
  const week = usePlanStore((state) => state.week);
  const override = usePlanStore((state) => state.override);
  const buildPlan = usePlanStore((state) => state.build);
  const markMeal = useMealLogStore((state) => state.markMeal);
  const dayLog = useDayLog(todayIso());
  const entries = useProgressStore((state) => state.entries);
  const logs = useTrainingStore((state) => state.logs);
  const session = useTrainingStore((state) => state.session);
  const beginSession = useTrainingStore((state) => state.beginSession);
  const targets = useTargets();
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

  // Eat
  const planIsCurrent = week?.builtFor === planKey(targets, prefs);
  const day = planIsCurrent && week ? effectiveDay(week, override, dayIndex) : undefined;
  const eaten = eatenTotals(dayLog);
  const left = Math.round(targets.calories - eaten.kcal);

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

      {/* Eat */}
      <section className={`on-paper ${styles.eat}`} aria-labelledby="today-eat">
        <div className={styles.blockHead}>
          <h2 id="today-eat" className={`mono ${styles.label}`}>
            Eat
          </h2>
          <p className={`mono ${styles.macros}`}>
            P {fmtInt(eaten.protein)}/{fmtInt(targets.proteinG)} · C {fmtInt(eaten.carbs)}/{fmtInt(targets.carbsG)} · F{' '}
            {fmtInt(eaten.fat)}/{fmtInt(targets.fatG)} g
          </p>
        </div>
        <p className={`display ${styles.big}`}>
          {fmtInt(eaten.kcal)} <span className={styles.unit}>of {fmtInt(targets.calories)} kcal</span>
        </p>
        <div className={styles.progress} aria-hidden="true">
          <span style={{ width: `${Math.min(100, (eaten.kcal / targets.calories) * 100)}%` }} />
        </div>
        <p className={styles.sub}>
          {eaten.kcal === 0
            ? 'Tick each meal as you eat it.'
            : left >= 0
              ? `${fmtInt(left)} kcal left today.`
              : `${fmtInt(-left)} kcal over today.`}
        </p>

        {day ? (
          <>
            <ul className={styles.meals}>
              {day.meals.map((meal) => {
                const tracked = dayLog.meals[meal.id];
                const isEaten = tracked?.status === 'eaten';
                const isSkipped = tracked?.status === 'skipped';
                return (
                  <li key={meal.id} className={isSkipped ? styles.mealSkipped : styles.meal}>
                    <span className={styles.mealName}>{meal.label}</span>
                    <span className={`mono ${styles.mealKcal}`}>
                      {isSkipped ? 'skipped' : fmtInt((tracked?.totals ?? mealTotals(meal)).kcal)}
                    </span>
                    <span className={styles.mealItems}>
                      {meal.items.map((item) => getFood(item.foodId).name).join(', ')}
                    </span>
                    <button
                      type="button"
                      className={isEaten ? styles.tickOn : styles.tick}
                      aria-pressed={isEaten}
                      aria-label={`${meal.label}: ${isEaten ? 'eaten. Undo' : 'mark as eaten'}`}
                      onClick={() => markMeal(today, meal.id, isEaten ? null : 'eaten', mealTotals(meal))}
                    >
                      {isEaten && <Icon name="check" size={18} />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <Button variant="outline" onClick={() => go('meals')}>
              Skip, swap or add food
            </Button>
          </>
        ) : (
          <>
            <p className={styles.sub}>
              {week
                ? 'Your target changed since the meal plan was printed.'
                : 'Get a week of meals built to hit this, from food you already know.'}
            </p>
            <Button
              size="lg"
              block
              onClick={() => {
                buildPlan(targets, prefs);
                go('meals');
              }}
            >
              {week ? 'Reprint my meal plan' : 'Print my meal plan'} <Icon name="arrowRight" />
            </Button>
          </>
        )}
      </section>

      {/* Weigh in, water, target */}
      <ul className={styles.rows}>
        <li>
          <button type="button" className={styles.row} onClick={() => go('progress')}>
            <span className={`mono ${styles.label}`}>Weigh in</span>
            <span className={styles.rowValue}>
              {weighedToday && lastWeighIn
                ? `${fmtDecimal(lastWeighIn.weightKg)} kg, logged today`
                : lastWeighIn
                  ? `Last: ${fmtDecimal(lastWeighIn.weightKg)} kg. Log today's`
                  : 'Log your first weigh-in'}
            </span>
            <span className={weighedToday ? styles.rowDone : styles.rowGo}>
              <Icon name={weighedToday ? 'check' : 'arrowRight'} size={18} />
            </span>
          </button>
        </li>
        <li>
          <div className={styles.row}>
            <span className={`mono ${styles.label}`}>Water</span>
            <span className={styles.rowValue}>About {fmtDecimal(targets.waterL)} L</span>
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
