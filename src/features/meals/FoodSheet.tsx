import { getFood } from '@/domain/foods/catalog';
import { swapOptions } from '@/domain/mealplan/swap';
import { foodTotals, itemTotals } from '@/domain/mealplan/totals';
import type { DayPlan, PlanPrefs } from '@/domain/mealplan/types';
import { fmtInt, fmtPortion, fmtSigned } from '@/lib/format';
import { usePlanStore } from '@/state/planStore';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import styles from './FoodSheet.module.css';

export interface Selection {
  mealId: string;
  itemIndex: number;
}

interface FoodSheetProps {
  day: DayPlan;
  prefs: PlanPrefs;
  selection: Selection | null;
  onClose: () => void;
}

/** Opens from a receipt line. Change how much of a food to eat, or swap it for something similar. */
export function FoodSheet({ day, prefs, selection, onClose }: FoodSheetProps) {
  const setPortions = usePlanStore((state) => state.setPortions);
  const swap = usePlanStore((state) => state.swap);

  const meal = selection ? day.meals.find((m) => m.id === selection.mealId) : undefined;
  const item = meal && selection ? meal.items[selection.itemIndex] : undefined;

  if (!selection || !meal || !item) {
    return (
      <Sheet open={false} onClose={onClose} title="">
        {null}
      </Sheet>
    );
  }

  const food = getFood(item.foodId);
  const totals = itemTotals(item);
  const { min, max, step } = food.portions;
  const options = swapOptions(day, meal.id, selection.itemIndex, prefs);

  const change = (portions: number) => setPortions(day.dayIndex, meal.id, selection.itemIndex, portions);

  return (
    <Sheet open onClose={onClose} eyebrow={meal.label} title={food.name}>
      <div className={styles.body}>
        <p className={styles.gloss}>
          {food.gloss}. One {food.unit} is about {fmtInt(food.grams)} g.
        </p>

        <div className={styles.portion}>
          <button
            type="button"
            className={styles.step}
            onClick={() => change(item.portions - step)}
            disabled={item.portions <= min}
            aria-label="Less"
          >
            <Icon name="minus" />
          </button>
          <p className={styles.amount} aria-live="polite">
            {fmtPortion(item.portions, food.unit)}
          </p>
          <button
            type="button"
            className={styles.step}
            onClick={() => change(item.portions + step)}
            disabled={item.portions >= max}
            aria-label="More"
          >
            <Icon name="plus" />
          </button>
        </div>

        <dl className={styles.macros}>
          <div>
            <dt>kcal</dt>
            <dd>{fmtInt(totals.kcal)}</dd>
          </div>
          <div>
            <dt>Protein</dt>
            <dd>{fmtInt(totals.protein)} g</dd>
          </div>
          <div>
            <dt>Carbs</dt>
            <dd>{fmtInt(totals.carbs)} g</dd>
          </div>
          <div>
            <dt>Fat</dt>
            <dd>{fmtInt(totals.fat)} g</dd>
          </div>
        </dl>

        <section className={styles.swaps} aria-labelledby="swap-heading">
          <h3 id="swap-heading" className={`display ${styles.swapHeading}`}>
            Palitan
          </h3>
          <p className={styles.swapLead}>Swap for something similar. Closest match first.</p>

          {options.length === 0 ? (
            <p className={styles.none}>Nothing else fits this spot with your budget and food settings.</p>
          ) : (
            <ul className={styles.list}>
              {options.map((option) => {
                const next = foodTotals(option.food, option.portions);
                return (
                  <li key={option.food.id}>
                    <button
                      type="button"
                      className={styles.option}
                      onClick={() => {
                        swap(day.dayIndex, meal.id, selection.itemIndex, option.food.id, option.portions);
                        onClose();
                      }}
                    >
                      <span className={styles.optionName}>{option.food.name}</span>
                      <span className={styles.optionKcal}>{fmtInt(next.kcal)} kcal</span>
                      <span className={styles.optionDetail}>
                        {fmtPortion(option.portions, option.food.unit)} · {option.food.gloss}
                      </span>
                      <span className={styles.optionDelta}>
                        {fmtSigned(option.delta.protein)} g protein · {fmtSigned(option.delta.kcal)} kcal
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}
