import { useState } from 'react';
import { FOODS } from '@/domain/foods/catalog';
import { kcalFromMacros } from '@/domain/foods/defineFood';
import type { Food } from '@/domain/foods/types';
import { foodTotals } from '@/domain/mealplan/totals';
import type { Macros } from '@/domain/mealplan/types';
import { fmtInt, fmtPortion } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { NumberField } from '@/ui/NumberField';
import { Sheet } from '@/ui/Sheet';
import styles from './AddFoodSheet.module.css';

interface AddFoodSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, totals: Macros) => void;
}

function searchFoods(query: string): Food[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return FOODS.filter((food) => {
    const text = `${food.name} ${food.gloss}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

/** Pick a food from the catalog and say how much of it was eaten. */
function FromCatalog({ onAdd }: Pick<AddFoodSheetProps, 'onAdd'>) {
  const [query, setQuery] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [portions, setPortions] = useState(1);

  if (food) {
    const totals = foodTotals(food, portions);
    const { min, max, step } = food.portions;
    return (
      <div className={styles.group}>
        <div className={styles.picked}>
          <div>
            <p className={styles.pickedName}>{food.name}</p>
            <p className={styles.hint}>{food.gloss}</p>
          </div>
          <Button variant="quiet" onClick={() => setFood(null)}>
            Change
          </Button>
        </div>
        <div className={styles.portion}>
          <button
            type="button"
            className={styles.step}
            onClick={() => setPortions(Math.max(min, portions - step))}
            disabled={portions <= min}
            aria-label="Less"
          >
            <Icon name="minus" />
          </button>
          <p className={styles.amount} aria-live="polite">
            {fmtPortion(portions, food.unit)}
          </p>
          <button type="button" className={styles.step} onClick={() => setPortions(portions + step)} disabled={portions >= max * 2} aria-label="More">
            <Icon name="plus" />
          </button>
        </div>
        <p className={`mono ${styles.macros}`}>
          {fmtInt(totals.kcal)} kcal · P {fmtInt(totals.protein)} · C {fmtInt(totals.carbs)} · F {fmtInt(totals.fat)}
        </p>
        <Button size="lg" block onClick={() => onAdd(`${food.name}, ${fmtPortion(portions, food.unit)}`, totals)}>
          Add to today <Icon name="check" />
        </Button>
      </div>
    );
  }

  const results = searchFoods(query);
  return (
    <div className={styles.group}>
      <label className="eyebrow" htmlFor="food-search">
        Find a food
      </label>
      <input
        id="food-search"
        className={styles.search}
        type="search"
        placeholder="Turon, kanin, tapa…"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {results.length > 0 ? (
        <ul className={styles.list}>
          {results.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className={styles.option}
                onClick={() => {
                  setFood(option);
                  setPortions(Math.max(option.portions.min, 1));
                }}
              >
                <span className={styles.optionName}>{option.name}</span>
                <span className={`mono ${styles.optionKcal}`}>{fmtInt(option.kcal)} kcal</span>
                <span className={styles.optionDetail}>
                  {option.gloss} · per {option.unit}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>Nothing matches “{query.trim()}”. Enter it yourself below.</p>
      )}
    </div>
  );
}

/** Type in a food that is not in the catalog, from a label or a menu. */
function ByHand({ onAdd }: Pick<AddFoodSheetProps, 'onAdd'>) {
  const [name, setName] = useState('');
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  // Calories follow the grams until the person types their own number, since many menus list calories only.
  const [typedKcal, setTypedKcal] = useState<number | null>(null);
  const kcal = typedKcal ?? kcalFromMacros(protein, carbs, fat);

  return (
    <form
      className={styles.group}
      onSubmit={(event) => {
        event.preventDefault();
        if (kcal > 0) onAdd(name.trim() || 'Other food', { kcal, protein, carbs, fat });
      }}
    >
      <label className={styles.field} htmlFor="hand-name">
        <span className="eyebrow">What was it?</span>
        <input
          id="hand-name"
          className={styles.search}
          type="text"
          placeholder="Milk tea, siomai rice…"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className={styles.macroFields}>
        <NumberField id="hand-kcal" label="Calories" unit="kcal" size="md" step={10} min={0} max={5000} value={kcal} onChange={setTypedKcal} />
        <NumberField id="hand-protein" label="Protein" unit="g" size="md" min={0} max={300} value={protein} onChange={setProtein} />
        <NumberField id="hand-carbs" label="Carbs" unit="g" size="md" min={0} max={500} value={carbs} onChange={setCarbs} />
        <NumberField id="hand-fat" label="Fat" unit="g" size="md" min={0} max={300} value={fat} onChange={setFat} />
      </div>
      <p className={styles.hint}>
        Use the numbers on the label or the menu. If you only know the calories, enter just those. Filling in the
        grams works out the calories for you.
      </p>
      <Button type="submit" size="lg" block disabled={kcal <= 0}>
        Add to today <Icon name="check" />
      </Button>
    </form>
  );
}

/** For food eaten outside the plan, so the day's numbers stay true. */
export function AddFoodSheet({ open, onClose, onAdd }: AddFoodSheetProps) {
  const [byHand, setByHand] = useState(false);
  const add = (name: string, totals: Macros) => {
    onAdd(name, totals);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Outside the plan" title="Add what you ate">
      <div className={styles.body}>
        {byHand ? <ByHand onAdd={add} /> : <FromCatalog key={String(open)} onAdd={add} />}
        <Button variant="quiet" onClick={() => setByHand(!byHand)}>
          {byHand ? 'Pick from the food list' : 'Not in the list? Enter it yourself'}
        </Button>
      </div>
    </Sheet>
  );
}
