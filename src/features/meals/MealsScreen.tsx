import { useState } from 'react';
import type { Route } from '@/app/router';
import type { BudgetTier } from '@/domain/foods/types';
import { planKey } from '@/domain/mealplan/generator';
import { dayTotals, mealTotals } from '@/domain/mealplan/totals';
import { eatenTotals, makeUpDay, openMeals, projectedTotals } from '@/domain/mealplan/tracking';
import type { PlanMeal } from '@/domain/mealplan/types';
import { DAYS, todayIndex, todayIso } from '@/lib/date';
import { fmtInt } from '@/lib/format';
import { useCustomFoodsStore } from '@/state/customFoodsStore';
import { useDayLog, useMealLogStore } from '@/state/mealLogStore';
import { ownPlanEdits, selectDay, selectWeek, usePlanStore } from '@/state/planStore';
import { useProfileStore } from '@/state/profileStore';
import { useTargets } from '@/state/useTargets';
import { Button } from '@/ui/Button';
import { DayStrip } from '@/ui/DayStrip';
import { Icon } from '@/ui/Icon';
import { AddFoodSheet, describeAdded } from './AddFoodSheet';
import { DaySummary } from './DaySummary';
import { FoodSheet, type Selection } from './FoodSheet';
import styles from './MealsScreen.module.css';
import { MealSheet, OwnItemSheet } from './OwnPlanSheets';
import { Resibo } from './Resibo';
import { TrackScreen } from './TrackScreen';

const BUDGET_NAME: Record<BudgetTier, string> = { 1: 'Tipid', 2: 'Sakto', 3: 'Sagana' };

/** A day is worth rebalancing when it drifts this far from the targets. */
const KCAL_DRIFT = 0.05;
const PROTEIN_DRIFT = 0.12;

interface MealsScreenProps {
  go: (route: Route) => void;
}

/** Meals. What this shows depends on how the person chose to plan: our suggestions, their own plan, or no plan. */
export function MealsScreen({ go }: MealsScreenProps) {
  const mode = usePlanStore((state) => state.mode);
  return mode === 'track' ? <TrackScreen go={go} /> : <PlannedMeals go={go} />;
}

/** First screen of a plan of one's own: start from nothing, or from a suggested week. */
function OwnStart({ go }: MealsScreenProps) {
  const prefs = useProfileStore((state) => state.prefs);
  const week = usePlanStore((state) => state.week);
  const build = usePlanStore((state) => state.build);
  const startOwn = usePlanStore((state) => state.startOwn);
  const targets = useTargets();
  if (!targets) return null;

  return (
    <div className={styles.empty}>
      <p className="eyebrow">My meal plan</p>
      <h1 className={`display ${styles.emptyTitle}`}>Write your plan</h1>
      <p className={styles.emptyText}>
        Enter your meals once, with the foods and portions you eat. Then tick them off each day and see how the day adds
        up against your target.
      </p>
      <div className={styles.startOptions}>
        <Button size="lg" block onClick={() => startOwn('blank')}>
          Start from scratch <Icon name="arrowRight" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          block
          onClick={() => {
            if (!week) build(targets, prefs);
            startOwn('suggested');
          }}
        >
          Start from a suggested week
        </Button>
        <Button variant="quiet" onClick={() => go('start')}>
          Change how I plan meals
        </Button>
      </div>
    </div>
  );
}

function PlannedMeals({ go }: MealsScreenProps) {
  const mode = usePlanStore((state) => state.mode);
  const prefs = useProfileStore((state) => state.prefs);
  const [dayIndex, setDayIndex] = useState(todayIndex);
  const week = usePlanStore(selectWeek);
  const day = usePlanStore((state) => selectDay(state, dayIndex));
  const override = usePlanStore((state) => state.override);
  const build = usePlanStore((state) => state.build);
  const reshuffle = usePlanStore((state) => state.reshuffle);
  const rebalance = usePlanStore((state) => state.rebalance);
  const adjustToday = usePlanStore((state) => state.adjustToday);
  const clearAdjustment = usePlanStore((state) => state.clearAdjustment);
  const editOwn = usePlanStore((state) => state.editOwn);
  const copyOwnToAll = usePlanStore((state) => state.copyOwnToAll);
  const markMeal = useMealLogStore((state) => state.markMeal);
  const addExtra = useMealLogStore((state) => state.addExtra);
  const removeExtra = useMealLogStore((state) => state.removeExtra);
  const resetMeals = useMealLogStore((state) => state.resetMeals);
  const addCustomFood = useCustomFoodsStore((state) => state.add);
  const targets = useTargets();

  const today = todayIso();
  const log = useDayLog(today);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [addingExtra, setAddingExtra] = useState(false);
  // Editing a plan of one's own.
  const [addingToMeal, setAddingToMeal] = useState<PlanMeal | null>(null);
  const [editingMeal, setEditingMeal] = useState<PlanMeal | null>(null);
  const [editingItem, setEditingItem] = useState<{ mealId: string; index: number } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!targets) return null;

  const own = mode === 'own';

  if (!week || !day) {
    if (own) return <OwnStart go={go} />;
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
  const planned = dayTotals(day);
  const isStale = !own && week.builtFor !== planKey(targets, prefs);

  // Tracking applies to today only: it is a record of a real day, not of the weekly plan.
  const eaten = eatenTotals(log);
  const hasMarks = isToday && (Object.keys(log.meals).length > 0 || log.extras.length > 0);
  const isAdjusted = !own && isToday && override !== null && override.date === today && override.dayIndex === dayIndex;
  const projected = projectedTotals(day, log);
  const gap = Math.round(projected.kcal - targets.calories);
  const offCourse = Math.abs(gap) / targets.calories > KCAL_DRIFT;
  const canMakeUp = !own && hasMarks && !isAdjusted && offCourse && openMeals(day, log).length > 0;

  const hasDrifted =
    Math.abs(planned.kcal - targets.calories) / targets.calories > KCAL_DRIFT ||
    Math.abs(planned.protein - targets.proteinG) / targets.proteinG > PROTEIN_DRIFT;

  // A plan of one's own is the person's call. We only say how it adds up.
  const ownGap = Math.round(planned.kcal - targets.calories);
  const ownOff = own && planned.kcal > 0 && Math.abs(ownGap) / targets.calories > KCAL_DRIFT;

  // A new menu means the old marks no longer describe the meals on screen.
  const replaceMenu = (action: () => void) => {
    if (isToday) resetMeals(today);
    action();
  };

  const edit = (change: Parameters<typeof editOwn>[1]) => editOwn(dayIndex, change);
  const itemBeingEdited = editingItem ? (day.meals.find((meal) => meal.id === editingItem.mealId)?.items[editingItem.index] ?? null) : null;

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h1 className="eyebrow">{own ? 'My meal plan' : 'Meal plan'}</h1>
        <button type="button" className={`eyebrow ${styles.settings}`} onClick={() => go('start')}>
          {own ? 'My own plan' : `${BUDGET_NAME[prefs.budget]} · ${prefs.mealsPerDay} meals`} · change
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

      {ownOff && (
        <div className={`on-paper ${styles.banner}`} role="status">
          <p>
            This day adds up to {fmtInt(planned.kcal)} kcal, {fmtInt(Math.abs(ownGap))} {ownGap < 0 ? 'under' : 'over'} your
            target of {fmtInt(targets.calories)}. It is your plan, so nothing changes unless you change it.
          </p>
        </div>
      )}

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
        {!own && (
          <Button variant="outline" onClick={() => replaceMenu(() => reshuffle(day.dayIndex, targets, prefs))}>
            <Icon name="shuffle" size={20} /> New menu
          </Button>
        )}
        {own && (
          <Button
            variant="outline"
            onClick={() => {
              copyOwnToAll(dayIndex);
              setCopied(true);
            }}
          >
            Use {DAYS[dayIndex]?.short} for every day
          </Button>
        )}
        {isToday && (
          <Button variant="outline" onClick={() => setAddingExtra(true)}>
            <Icon name="plus" size={20} /> Ate something else
          </Button>
        )}
        {!own && hasDrifted && !isStale && !hasMarks && !isAdjusted && (
          <Button onClick={() => rebalance(day.dayIndex, targets)}>
            <Icon name="scale" size={20} /> Rebalance portions
          </Button>
        )}
      </div>
      {copied && own && (
        <p className={styles.tip} role="status">
          Copied to every day. Change any day after that and only that day changes.
        </p>
      )}

      <Resibo
        day={day}
        totals={planned}
        targets={targets}
        onSelectItem={(mealId, itemIndex) => (own ? setEditingItem({ mealId, index: itemIndex }) : setSelection({ mealId, itemIndex }))}
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
        editor={
          own
            ? {
                onAddFood: setAddingToMeal,
                onEditMeal: setEditingMeal,
                onAddMeal: () => {
                  const next = ownPlanEdits.addMeal(day, 'New meal');
                  edit(() => next);
                  setEditingMeal(next.meals[next.meals.length - 1] ?? null);
                },
              }
            : undefined
        }
      />

      <p className={styles.tip}>
        {own
          ? 'Tap a food to change the amount. Tick meals off on the day itself.'
          : isToday
            ? 'Mark each meal as you go. Tap any food to change the portion or swap it.'
            : 'Tap any food to change the portion or swap it. Meals are tracked on the day itself.'}
      </p>

      {!own && <FoodSheet day={day} prefs={prefs} selection={selection} onClose={() => setSelection(null)} />}

      <AddFoodSheet
        open={addingExtra}
        onClose={() => setAddingExtra(false)}
        onAdd={(entry) => {
          const { name, totals } = describeAdded(entry);
          addExtra(today, name, totals);
        }}
      />

      {own && (
        <>
          <AddFoodSheet
            open={addingToMeal !== null}
            onClose={() => setAddingToMeal(null)}
            eyebrow={addingToMeal?.label ?? 'My plan'}
            title="Add food to this meal"
            numbers="serving"
            onAdd={(entry) => {
              if (!addingToMeal) return;
              // Numbers typed in become a saved food, so the plan stays a list of foods and can reuse it.
              const food = entry.kind === 'food' ? entry.food : addCustomFood(entry.name, entry.totals);
              const portions = entry.kind === 'food' ? entry.portions : 1;
              edit((d) => ownPlanEdits.addItem(d, addingToMeal.id, food.id, portions));
            }}
          />
          <OwnItemSheet
            item={itemBeingEdited}
            onClose={() => setEditingItem(null)}
            onPortions={(portions) => editingItem && edit((d) => ownPlanEdits.setItemPortions(d, editingItem.mealId, editingItem.index, portions))}
            onRemove={() => {
              if (editingItem) edit((d) => ownPlanEdits.removeItem(d, editingItem.mealId, editingItem.index));
              setEditingItem(null);
            }}
          />
          <MealSheet
            key={editingMeal?.id}
            meal={editingMeal}
            onClose={() => setEditingMeal(null)}
            onRename={(label) => editingMeal && edit((d) => ownPlanEdits.renameMeal(d, editingMeal.id, label))}
            onRemove={() => editingMeal && edit((d) => ownPlanEdits.removeMeal(d, editingMeal.id))}
          />
        </>
      )}
    </div>
  );
}
