import { useState } from 'react';
import type { Route } from '@/app/router';
import { planKey } from '@/domain/mealplan/generator';
import { dayTotals } from '@/domain/mealplan/totals';
import type { BudgetTier } from '@/domain/foods/types';
import { todayIndex } from '@/lib/date';
import { usePlanStore } from '@/state/planStore';
import { useProfileStore } from '@/state/profileStore';
import { useTargets } from '@/state/useTargets';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { DayStrip } from './DayStrip';
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
  const build = usePlanStore((state) => state.build);
  const reshuffle = usePlanStore((state) => state.reshuffle);
  const rebalance = usePlanStore((state) => state.rebalance);
  const targets = useTargets();

  const [dayIndex, setDayIndex] = useState(todayIndex);
  const [selection, setSelection] = useState<Selection | null>(null);

  if (!targets) return null;

  if (!week) {
    return (
      <div className={styles.empty}>
        <p className="eyebrow">Meal plan</p>
        <h1 className={`display ${styles.emptyTitle}`}>Nothing printed yet</h1>
        <p className={styles.emptyText}>
          Your plan will show seven days of meals built to hit your calories and macros, with each food's portion,
          macros and estimated price.
        </p>
        <Button size="lg" block onClick={() => build(targets, prefs)}>
          Print my meal plan <Icon name="arrowRight" />
        </Button>
      </div>
    );
  }

  const day = week.days[dayIndex] ?? week.days[0]!;
  const totals = dayTotals(day);
  const isStale = week.builtFor !== planKey(targets, prefs);
  const hasDrifted =
    Math.abs(totals.kcal - targets.calories) / targets.calories > KCAL_DRIFT ||
    Math.abs(totals.protein - targets.proteinG) / targets.proteinG > PROTEIN_DRIFT;

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h1 className="eyebrow">Meal plan</h1>
        <button type="button" className={`eyebrow ${styles.settings}`} onClick={() => go('start')}>
          {BUDGET_NAME[prefs.budget]} · {prefs.mealsPerDay} meals · change
        </button>
      </div>

      {isStale && (
        <div className={styles.banner} role="status">
          <p>Your target or food settings changed after this plan was printed.</p>
          <Button onClick={() => build(targets, prefs)}>Reprint the week</Button>
        </div>
      )}

      <DayStrip selected={dayIndex} onSelect={setDayIndex} />
      <DaySummary totals={totals} targets={targets} />

      <div className={styles.actions}>
        <Button variant="outline" onClick={() => reshuffle(day.dayIndex, targets, prefs)}>
          <Icon name="shuffle" size={20} /> New menu
        </Button>
        {hasDrifted && !isStale && (
          <Button onClick={() => rebalance(day.dayIndex, targets)}>
            <Icon name="scale" size={20} /> Rebalance portions
          </Button>
        )}
      </div>

      <Resibo
        day={day}
        totals={totals}
        targets={targets}
        onSelectItem={(mealId, itemIndex) => setSelection({ mealId, itemIndex })}
      />

      <p className={styles.tip}>Tap any line to change the portion or swap the food.</p>

      <FoodSheet day={day} prefs={prefs} selection={selection} onClose={() => setSelection(null)} />
    </div>
  );
}
