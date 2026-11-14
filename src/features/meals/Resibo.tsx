import { BRAND } from '@/config/brand';
import { getFood } from '@/domain/foods/catalog';
import { itemTotals, mealTotals } from '@/domain/mealplan/totals';
import type { DayPlan, Totals } from '@/domain/mealplan/types';
import type { MacroTargets } from '@/domain/nutrition/types';
import { DAYS } from '@/lib/date';
import { fmtInt, fmtPortion, fmtSigned, peso } from '@/lib/format';
import { Icon } from '@/ui/Icon';
import styles from './Resibo.module.css';

interface ResiboProps {
  day: DayPlan;
  totals: Totals;
  targets: MacroTargets;
  onSelectItem: (mealId: string, itemIndex: number) => void;
}

const macroLine = (t: Totals) => `P ${fmtInt(t.protein)} · C ${fmtInt(t.carbs)} · F ${fmtInt(t.fat)}`;

/**
 * The day's meal plan as a receipt: every food is a line with its portion,
 * calories, macros and estimated price, with subtotals per meal and a total.
 */
export function Resibo({ day, totals, targets, onSelectItem }: ResiboProps) {
  const serial = String(day.seed % 1_000_000).padStart(6, '0');
  const difference = Math.round(totals.kcal - targets.calories);

  return (
    <article className={styles.resibo} key={`${day.dayIndex}-${day.seed}`} aria-label="Meal plan for the day">
      <span className={`${styles.edge} ${styles.edgeTop}`} aria-hidden="true" />

      <div className={styles.paper}>
        <header className={styles.head}>
          <p className={styles.store}>{BRAND.name}</p>
          <p className={styles.sub}>Plano ng pagkain · {DAYS[day.dayIndex]?.long}</p>
          <p className={styles.serial}>
            N<sup>o</sup> {serial}
          </p>
        </header>

        {day.meals.map((meal) => {
          const subtotal = mealTotals(meal);
          return (
            <section key={meal.id} className={styles.meal}>
              <h3 className={styles.mealHead}>
                <span>{meal.label}</span>
                <span className={styles.leader} aria-hidden="true" />
                <span>{fmtInt(subtotal.kcal)} kcal</span>
              </h3>
              <ul>
                {meal.items.map((item, index) => {
                  const food = getFood(item.foodId);
                  const line = itemTotals(item);
                  return (
                    <li key={`${item.foodId}-${index}`}>
                      <button
                        type="button"
                        className={styles.line}
                        onClick={() => onSelectItem(meal.id, index)}
                        aria-label={`${food.name}, ${fmtPortion(item.portions, food.unit)}, ${fmtInt(line.kcal)} kilocalories. Change portion or swap.`}
                      >
                        <span className={styles.name}>{food.name}</span>
                        <span className={styles.kcal}>{fmtInt(line.kcal)}</span>
                        <span className={styles.detail}>
                          {fmtPortion(item.portions, food.unit)} · {macroLine(line)}
                        </span>
                        <span className={styles.price}>{peso(line.pricePhp)}</span>
                        <span className={styles.swapIcon}>
                          <Icon name="swap" size={18} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.subtotal}>{macroLine(subtotal)}</p>
            </section>
          );
        })}

        <dl className={styles.totals}>
          <div className={styles.totalRow}>
            <dt>Total</dt>
            <dd>{fmtInt(totals.kcal)} kcal</dd>
          </div>
          <div className={styles.row}>
            <dt>Target</dt>
            <dd>{fmtInt(targets.calories)} kcal</dd>
          </div>
          <div className={styles.row}>
            <dt>Difference</dt>
            <dd>{fmtSigned(difference)} kcal</dd>
          </div>
          <div className={styles.row}>
            <dt>Protein / carbs / fat</dt>
            <dd>
              {fmtInt(totals.protein)} / {fmtInt(totals.carbs)} / {fmtInt(totals.fat)} g
            </dd>
          </div>
          <div className={styles.row}>
            <dt>Est. cost</dt>
            <dd>{peso(totals.pricePhp)}</dd>
          </div>
        </dl>

        <footer className={styles.foot}>
          <p>Salamat. Kain nang mabuti.</p>
          <p className={styles.footNote}>
            Calories, macros and prices are estimates. They vary by recipe, serving and where you buy.
          </p>
        </footer>
      </div>

      <span className={`${styles.edge} ${styles.edgeBottom}`} aria-hidden="true" />
    </article>
  );
}
