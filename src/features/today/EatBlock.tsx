import { useState } from 'react';
import type { Route } from '@/app/router';
import { getFood } from '@/domain/foods/catalog';
import { planKey } from '@/domain/mealplan/generator';
import { mealTotals } from '@/domain/mealplan/totals';
import { eatenTotals } from '@/domain/mealplan/tracking';
import { AddFoodSheet, describeAdded } from '@/features/meals/AddFoodSheet';
import { mealForNow, TRACK_MEALS } from '@/features/meals/TrackScreen';
import { todayIndex, todayIso } from '@/lib/date';
import { fmtInt } from '@/lib/format';
import { useDayLog, useMealLogStore } from '@/state/mealLogStore';
import { selectDay, usePlanStore } from '@/state/planStore';
import { useProfileStore } from '@/state/profileStore';
import { useTargets } from '@/state/useTargets';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import styles from './TodayScreen.module.css';

interface EatBlockProps {
  go: (route: Route) => void;
}

/** Today's eating: calories and macros against the target, then the meals, or the food log if there is no plan. */
export function EatBlock({ go }: EatBlockProps) {
  const prefs = useProfileStore((state) => state.prefs);
  const mode = usePlanStore((state) => state.mode);
  const week = usePlanStore((state) => (state.mode === 'own' ? state.ownWeek : state.week));
  const day = usePlanStore((state) => selectDay(state, todayIndex()));
  const buildPlan = usePlanStore((state) => state.build);
  const markMeal = useMealLogStore((state) => state.markMeal);
  const addExtra = useMealLogStore((state) => state.addExtra);
  const removeExtra = useMealLogStore((state) => state.removeExtra);
  const targets = useTargets();
  const today = todayIso();
  const log = useDayLog(today);
  const [adding, setAdding] = useState(false);

  if (!targets) return null;

  const eaten = eatenTotals(log);
  const left = Math.round(targets.calories - eaten.kcal);
  const tracking = mode === 'track';
  // A suggested plan built for an older target is not shown as if it were current.
  const planIsCurrent = mode === 'own' || week?.builtFor === planKey(targets, prefs);
  const meals = !tracking && planIsCurrent && day ? day.meals : null;

  const extras = log.extras.map((extra) => ({ ...extra, label: tracking ? (extra.meal ?? 'Other') : 'Extra' }));

  return (
    <section className={`on-paper ${styles.eat}`} aria-labelledby="today-eat">
      <div className={styles.blockHead}>
        <h2 id="today-eat" className={`mono ${styles.label}`}>
          {tracking ? 'Eat · food log' : 'Eat'}
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
          ? tracking
            ? 'Add each meal as you eat it.'
            : 'Tick each meal as you eat it.'
          : left >= 0
            ? `${fmtInt(left)} kcal left today.`
            : `${fmtInt(-left)} kcal over today.`}
      </p>

      {meals && (
        <ul className={styles.meals}>
          {meals.map((meal) => {
            const tracked = log.meals[meal.id];
            const isEaten = tracked?.status === 'eaten';
            const isSkipped = tracked?.status === 'skipped';
            return (
              <li key={meal.id} className={isSkipped ? styles.mealSkipped : styles.meal}>
                <span className={styles.mealName}>{meal.label}</span>
                <span className={`mono ${styles.mealKcal}`}>
                  {isSkipped ? 'skipped' : fmtInt((tracked?.totals ?? mealTotals(meal)).kcal)}
                </span>
                <span className={styles.mealItems}>
                  {meal.items.length > 0 ? meal.items.map((item) => getFood(item.foodId).name).join(', ') : 'Nothing added yet'}
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
      )}

      {extras.length > 0 && (
        <ul className={styles.meals} aria-label={tracking ? 'Food log' : 'Extras'}>
          {extras.map((extra) => (
            <li key={extra.id} className={styles.meal}>
              <span className={styles.mealName}>{extra.label}</span>
              <span className={`mono ${styles.mealKcal}`}>{fmtInt(extra.totals.kcal)}</span>
              <span className={styles.mealItems}>{extra.name}</span>
              <button type="button" className={styles.tick} aria-label={`Remove ${extra.name}`} onClick={() => removeExtra(today, extra.id)}>
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!tracking && !meals && (
        <>
          <p className={styles.sub}>
            {mode === 'own'
              ? 'You have not written your plan yet. Add your meals once, then tick them off here.'
              : week
                ? 'Your target changed since the meal plan was printed.'
                : 'Get a week of meals built to hit this, from food you already know.'}
          </p>
          <Button
            size="lg"
            block
            onClick={() => {
              if (mode === 'suggested') buildPlan(targets, prefs);
              go('meals');
            }}
          >
            {mode === 'own' ? 'Write my plan' : week ? 'Reprint my meal plan' : 'Print my meal plan'} <Icon name="arrowRight" />
          </Button>
        </>
      )}

      {(tracking || meals) && (
        <div className={styles.eatActions}>
          <Button variant={tracking ? 'solid' : 'outline'} onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> {tracking ? 'Add food' : 'Ate something else'}
          </Button>
          {!tracking && (
            <Button variant="quiet" onClick={() => go('meals')}>
              {mode === 'own' ? 'Edit my plan' : 'Skip or swap meals'}
            </Button>
          )}
        </div>
      )}

      <AddFoodSheet
        open={adding}
        onClose={() => setAdding(false)}
        {...(tracking ? { eyebrow: 'Food log', title: 'Add food', mealChoices: TRACK_MEALS, defaultMeal: mealForNow() } : {})}
        onAdd={(entry, meal) => {
          const { name, totals } = describeAdded(entry);
          addExtra(today, name, totals, meal);
        }}
      />
    </section>
  );
}
