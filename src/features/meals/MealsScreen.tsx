import { useState } from 'react';
import type { Route } from '@/app/router';
import type { BudgetTier } from '@/domain/foods/types';
import { planKey } from '@/domain/mealplan/generator';
import { dayTotals, mealTotals } from '@/domain/mealplan/totals';
import { eatenTotals, makeUpDay, openMeals, projectedTotals } from '@/domain/mealplan/tracking';
import { todayIndex, todayIso } from '@/lib/date';
import { fmtInt } from '@/lib/format';
import { useDayLog, useMealLogStore } from '@/state/mealLogStore';
import { effectiveDay, usePlanStore } from '@/state/planStore';
import { useProfileStore } from '@/state/profileStore';
import { useTargets } from '@/state/useTargets';
import { Button } from '@/ui/Button';
import { DayStrip } from '@/ui/DayStrip';
import { Icon } from '@/ui/Icon';
import { AddFoodSheet } from './AddFoodSheet';
import { DaySummary } from './DaySummary';
import { FoodSheet, type Selection } from './FoodSheet';
import styles from './MealsScreen.module.css';
import { Resibo } from './Resibo';

const BUDGET_NAME: Record<BudgetTier, string> = { 1: 'Tipid', 2: 'Sakto', 3: 'Sagana' };

/** A day is worth rebalancing when it drifts this far from the targets. */
const KCAL_DRIFT = 0.05;
const PROTEIN_DRIFT = 0.12;

interface MealsScreenProps {
  go: (route: Route) => void;
}

export function MealsScreen({ go }: MealsScreenProps) {
  const prefs = useProfileStore((state) => state.prefs);
  const week = usePlanStore((state) => state.week);
  const override = usePlanStore((state) => state.override);
  const build = usePlanStore((state) => state.build);
  const reshuffle = usePlanStore((state) => state.reshuffle);
  const rebalance = usePlanStore((state) => state.rebalance);
  const adjustToday = usePlanStore((state) => state.adjustToday);
  const clearAdjustment = usePlanStore((state) => state.clearAdjustment);
  const markMeal = useMealLogStore((state) => state.markMeal);
  const addExtra = useMealLogStore((state) => state.addExtra);
  const removeExtra = useMealLogStore((state) => state.removeExtra);
  const resetMeals = useMealLogStore((state) => state.resetMeals);
  const targets = useTargets();

  const today = todayIso();
  const log = useDayLog(today);

  const [dayIndex, setDayIndex] = useState(todayIndex);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [addingFood, setAddingFood] = useState(false);

  if (!targets) return null;

  if (!week) {
    return (
      <div className={styles.empty}>
        <p className="eyebrow">Meal plan</p>
        <h1 className={`display ${styles.emptyTitle}`}>Nothing printed yet</h1>
        <p className={styles.emptyText}>
          Your plan will show seven days of meals built to hit your calories and macros, with each food's portion,
          weight and macros.
        </p>
        <Button size="lg" block onClick={() => build(targets, prefs)}>
          Print my meal plan <Icon name="arrowRight" />
        </Button>
      </div>
    );
  }

  const isToday = dayIndex === todayIndex();
  const day = effectiveDay(week, override, dayIndex) ?? week.days[0]!;
  const planned = dayTotals(day);
  const isStale = week.builtFor !== planKey(targets, prefs);

  // Tracking applies to today only: it is a record of a real day, not of the weekly plan.
  const eaten = eatenTotals(log);
  const hasMarks = isToday && (Object.keys(log.meals).length > 0 || log.extras.length > 0);
  const isAdjusted = isToday && override !== null && override.date === today && override.dayIndex === dayIndex;
  const projected = projectedTotals(day, log);
  const gap = Math.round(projected.kcal - targets.calories);
  const offCourse = Math.abs(gap) / targets.calories > KCAL_DRIFT;
  const canMakeUp = hasMarks && !isAdjusted && offCourse && openMeals(day, log).length > 0;

  const hasDrifted =
    Math.abs(planned.kcal - targets.calories) / targets.calories > KCAL_DRIFT ||
    Math.abs(planned.protein - targets.proteinG) / targets.proteinG > PROTEIN_DRIFT;

  // A new menu means the old marks no longer describe the meals on screen.
  const replaceMenu = (action: () => void) => {
    if (isToday) resetMeals(today);
    action();
  };

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h1 className="eyebrow">Meal plan</h1>
        <button type="button" className={`eyebrow ${styles.settings}`} onClick={() => go('start')}>
          {BUDGET_NAME[prefs.budget]} · {prefs.mealsPerDay} meals · change
        </button>
      </div>

      {isStale && (
        <div className={`on-paper ${styles.banner}`} role="status">
          <p>Your target or food settings changed after this plan was printed.</p>
          <Button
            onClick={() => {
              resetMeals(today);
              build(targets, prefs);
            }}
          >
            Reprint the week
          </Button>
        </div>
      )}

      <DayStrip selected={dayIndex} onSelect={setDayIndex} />
      <DaySummary totals={hasMarks ? eaten : planned} targets={targets} mode={hasMarks ? 'eaten' : 'planned'} />

      {canMakeUp && (
        <div className={`on-paper ${styles.banner}`} role="status">
          <p>
            {gap < 0
              ? `With what you have marked, today is on track to end about ${fmtInt(-gap)} kcal short of your target.`
              : `With what you have marked, today is on track to end about ${fmtInt(gap)} kcal over your target.`}{' '}
            One day like this is fine. If you want to stay on target, the meals still to come can be re-portioned.
          </p>
          <Button onClick={() => adjustToday(makeUpDay(day, targets, log))}>
            {gap < 0 ? 'Make it up in my other meals' : 'Trim my other meals'}
          </Button>
        </div>
      )}

      {isAdjusted && (
        <div className={`on-paper ${styles.banner}`} role="status">
          <p>
            The portions of your remaining meals were changed to keep today on target. This is for today only. Next
            week's plan is as it was.
            {offCourse && ` Since then the day has moved about ${fmtInt(Math.abs(gap))} kcal ${gap < 0 ? 'under' : 'over'} again.`}
          </p>
          {offCourse && openMeals(day, log).length > 0 && (
            <Button onClick={() => adjustToday(makeUpDay(day, targets, log))}>Re-portion again</Button>
          )}
          <Button variant="outline" onClick={clearAdjustment}>
            Put the portions back
          </Button>
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="outline" onClick={() => replaceMenu(() => reshuffle(day.dayIndex, targets, prefs))}>
          <Icon name="shuffle" size={20} /> New menu
        </Button>
        {isToday && (
          <Button variant="outline" onClick={() => setAddingFood(true)}>
            <Icon name="plus" size={20} /> Ate something else
          </Button>
        )}
        {hasDrifted && !isStale && !hasMarks && !isAdjusted && (
          <Button onClick={() => rebalance(day.dayIndex, targets)}>
            <Icon name="scale" size={20} /> Rebalance portions
          </Button>
        )}
      </div>

      <Resibo
        day={day}
        totals={planned}
        targets={targets}
        onSelectItem={(mealId, itemIndex) => setSelection({ mealId, itemIndex })}
        tracking={
          isToday
            ? {
                log,
                eaten,
                projected,
                onMark: (meal, status) => markMeal(today, meal.id, status, mealTotals(meal)),
                onRemoveExtra: (id) => removeExtra(today, id),
              }
            : undefined
        }
      />

      <p className={styles.tip}>
        {isToday
          ? 'Mark each meal as you go. Tap any food to change the portion or swap it.'
          : 'Tap any food to change the portion or swap it. Meals are tracked on the day itself.'}
      </p>

      <FoodSheet day={day} prefs={prefs} selection={selection} onClose={() => setSelection(null)} />
      <AddFoodSheet
        open={addingFood}
        onClose={() => setAddingFood(false)}
        onAdd={(name, totals) => addExtra(today, name, totals)}
      />
    </div>
  );
}
