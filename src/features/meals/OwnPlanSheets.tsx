import { useState } from 'react';
import { getFood } from '@/domain/foods/catalog';
import { foodTotals } from '@/domain/mealplan/totals';
import type { PlanItem, PlanMeal } from '@/domain/mealplan/types';
import { fmtInt, fmtPortion } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import styles from './OwnPlanSheets.module.css';

interface ItemSheetProps {
  item: PlanItem | null;
  onClose: () => void;
  onPortions: (portions: number) => void;
  onRemove: () => void;
}

/** Change the amount of one food in a plan of one's own, or take it out. */
export function OwnItemSheet({ item, onClose, onPortions, onRemove }: ItemSheetProps) {
  if (!item) {
    return (
      <Sheet open={false} onClose={onClose} title="">
        {null}
      </Sheet>
    );
  }
  const food = getFood(item.foodId);
  const totals = foodTotals(food, item.portions);
  const step = food.portions.step;

  return (
    <Sheet open onClose={onClose} eyebrow="My plan" title={food.name}>
      <div className={styles.body}>
        <p className={styles.hint}>{food.gloss}</p>
        <div className={styles.portion}>
          <button type="button" className={styles.step} onClick={() => onPortions(item.portions - step)} disabled={item.portions <= step} aria-label="Less">
            <Icon name="minus" />
          </button>
          <p className={styles.amount} aria-live="polite">
            {fmtPortion(item.portions, food.unit)}
          </p>
          <button type="button" className={styles.step} onClick={() => onPortions(item.portions + step)} aria-label="More">
            <Icon name="plus" />
          </button>
        </div>
        <p className={`mono ${styles.macros}`}>
          {fmtInt(totals.kcal)} kcal · P {fmtInt(totals.protein)} · C {fmtInt(totals.carbs)} · F {fmtInt(totals.fat)}
          {food.grams > 0 && ` · ${fmtInt(food.grams * item.portions)} g`}
        </p>
        <Button size="lg" block onClick={onClose}>
          Done
        </Button>
        <Button variant="quiet" onClick={onRemove}>
          Take it out of this meal
        </Button>
      </div>
    </Sheet>
  );
}

interface MealSheetProps {
  meal: PlanMeal | null;
  onClose: () => void;
  onRename: (label: string) => void;
  onRemove: () => void;
}

/** Rename a meal in a plan of one's own, or delete it. */
export function MealSheet({ meal, onClose, onRename, onRemove }: MealSheetProps) {
  const [label, setLabel] = useState(meal?.label ?? '');
  const [confirming, setConfirming] = useState(false);

  if (!meal) {
    return (
      <Sheet open={false} onClose={onClose} title="">
        {null}
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} eyebrow="My plan" title="This meal">
      <form
        className={styles.body}
        onSubmit={(event) => {
          event.preventDefault();
          onRename(label);
          onClose();
        }}
      >
        <label className={styles.field} htmlFor="meal-name">
          <span className="eyebrow">Name</span>
          <input id="meal-name" className={styles.input} type="text" value={label} onChange={(event) => setLabel(event.target.value)} autoComplete="off" />
        </label>
        <Button type="submit" size="lg" block disabled={!label.trim()}>
          Save name <Icon name="check" />
        </Button>
        {confirming ? (
          <div className={styles.confirm}>
            <p className={styles.hint}>Delete this meal and the foods in it?</p>
            <Button variant="outline" onClick={() => { onRemove(); onClose(); }}>
              Yes, delete it
            </Button>
            <Button variant="quiet" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button variant="quiet" onClick={() => setConfirming(true)}>
            Delete this meal
          </Button>
        )}
      </form>
    </Sheet>
  );
}
