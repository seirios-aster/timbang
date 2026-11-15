import { useState } from 'react';
import { allFoods } from '@/domain/foods/catalog';
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

/** What the person picked: a food from the list with a portion, or numbers they typed. */
export type AddedFood =
  | { kind: 'food'; food: Food; portions: number }
  | { kind: 'manual'; name: string; totals: Macros };

/** A name and the macros, for logging an entry as food eaten. */
export function describeAdded(entry: AddedFood): { name: string; totals: Macros } {
  if (entry.kind === 'manual') return { name: entry.name, totals: entry.totals };
  return {
    name: `${entry.food.name}, ${fmtPortion(entry.portions, entry.food.unit)}`,
    totals: foodTotals(entry.food, entry.portions),
  };
}

interface AddFoodSheetProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title?: string;
  /**
   * `eaten` is for logging, where typed numbers are for the whole amount eaten.
   * `serving` is for building a plan, where they are for one serving that gets saved.
   */
  numbers?: 'eaten' | 'serving';
  /** When given, the person also picks which meal this belongs to. */
  mealChoices?: readonly string[];
  defaultMeal?: string;
  onAdd: (entry: AddedFood, meal?: string) => void;
}

function searchFoods(query: string): Food[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = allFoods().filter((food) => {
    const text = `${food.name} ${food.gloss}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
  // The person's own foods come first, since they are the ones they will look for.
  return [...matches.filter((food) => food.id.startsWith('custom-')), ...matches.filter((food) => !food.id.startsWith('custom-'))];
}

/** Pick a food from the list and say how much of it. */
function FromList({ onPick }: { onPick: (food: Food, portions: number) => void }) {
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
          <button type="button" className={styles.step} onClick={() => setPortions(Math.max(min, portions - step))} disabled={portions <= min} aria-label="Less">
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
        <Button size="lg" block onClick={() => onPick(food, portions)}>
          Add <Icon name="check" />
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
                  {option.gloss}
                  {option.id.startsWith('custom-') ? ' · per serving' : ` · per ${option.unit}`}
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

/** Type in a food that is not in the list, from a label, a menu or a recipe. */
function ByHand({ scope, onAdd }: { scope: 'eaten' | 'serving'; onAdd: (name: string, totals: Macros) => void }) {
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
        if (kcal > 0) onAdd(name.trim() || (scope === 'serving' ? 'My food' : 'Other food'), { kcal, protein, carbs, fat });
      }}
    >
      <label className={styles.field} htmlFor="hand-name">
        <span className="eyebrow">{scope === 'serving' ? 'Name of the food' : 'What was it?'}</span>
        <input
          id="hand-name"
          className={styles.search}
          type="text"
          placeholder={scope === 'serving' ? "Nanay's adobo, protein shake…" : 'Milk tea, siomai rice…'}
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
        {scope === 'serving'
          ? 'Enter the numbers for one serving. The food is saved, so you can add it again later. '
          : 'Use the numbers on the label or the menu. '}
        If you only know the calories, enter just those. Filling in the grams works out the calories for you.
      </p>
      <Button type="submit" size="lg" block disabled={kcal <= 0}>
        {scope === 'serving' ? 'Save and add' : 'Add'} <Icon name="check" />
      </Button>
    </form>
  );
}

/** Adds food, from the food list or typed in. Used to log food eaten and to build a plan. */
export function AddFoodSheet({
  open,
  onClose,
  eyebrow = 'Outside the plan',
  title = 'Add what you ate',
  numbers = 'eaten',
  mealChoices,
  defaultMeal,
  onAdd,
}: AddFoodSheetProps) {
  const [byHand, setByHand] = useState(false);
  const [meal, setMeal] = useState(defaultMeal ?? mealChoices?.[0]);

  const finish = (entry: AddedFood) => {
    onAdd(entry, mealChoices ? meal : undefined);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} eyebrow={eyebrow} title={title}>
      <div className={styles.body}>
        {mealChoices && (
          <div className={styles.group} role="group" aria-label="Which meal">
            <p className="eyebrow">Which meal</p>
            <div className={styles.mealChips}>
              {mealChoices.map((choice) => (
                <button key={choice} type="button" className={styles.mealChip} aria-pressed={meal === choice} onClick={() => setMeal(choice)}>
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}
        {byHand ? (
          <ByHand scope={numbers} onAdd={(name, totals) => finish({ kind: 'manual', name, totals })} />
        ) : (
          <FromList key={String(open)} onPick={(food, portions) => finish({ kind: 'food', food, portions })} />
        )}
        <Button variant="quiet" onClick={() => setByHand(!byHand)}>
          {byHand ? 'Pick from the food list' : 'Not in the list? Enter it yourself'}
        </Button>
      </div>
    </Sheet>
  );
}
