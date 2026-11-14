import { BRAND } from '@/config/brand';
import { getFood } from '@/domain/foods/catalog';
import { itemTotals, mealTotals } from '@/domain/mealplan/totals';
import type { DayLog, MealStatus } from '@/domain/mealplan/tracking';
import type { DayPlan, PlanMeal, Totals } from '@/domain/mealplan/types';
import type { MacroTargets } from '@/domain/nutrition/types';
import { DAYS } from '@/lib/date';
import { fmtInt, fmtPortion, fmtSigned } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { Stamp } from '@/ui/Stamp';
import styles from './Resibo.module.css';

/** Present on today's receipt only: what has been eaten, and how to mark more. */
export interface ResiboTracking {
  log: DayLog;
  eaten: Totals;
  /** Where the day ends if every meal still open is eaten as planned. Skipped meals are left out. */
  projected: Totals;
  onMark: (meal: PlanMeal, status: MealStatus | null) => void;
  onRemoveExtra: (id: string) => void;
}

interface ResiboProps {
  day: DayPlan;
  totals: Totals;
  targets: MacroTargets;
  onSelectItem: (mealId: string, itemIndex: number) => void;
  tracking?: ResiboTracking;
}

const macroLine = (t: Totals) => `P ${fmtInt(t.protein)} · C ${fmtInt(t.carbs)} · F ${fmtInt(t.fat)}`;

/**
 * The day's meal plan as a receipt: every food is a line with its portion,
 * calories, macros and weight, with subtotals per meal and a total.
 * On today's receipt each meal can be stamped eaten or skipped.
 */
export function Resibo({ day, totals, targets, onSelectItem, tracking }: ResiboProps) {
  const serial = String(day.seed % 1_000_000).padStart(6, '0');
  // On a tracked day the bottom line is where the day is heading, not the plan as printed.
  const outlook = tracking?.projected ?? totals;
  const difference = Math.round(outlook.kcal - targets.calories);
  const extras = tracking?.log.extras ?? [];

  return (
    <article className={styles.resibo} key={`${day.dayIndex}-${day.seed}`} aria-label="Meal plan for the day">
      <span className={`${styles.edge} ${styles.edgeTop}`} aria-hidden="true" />

      <div className={`on-paper ${styles.paper}`}>
        <header className={styles.head}>
          <p className={styles.store}>{BRAND.name}</p>
          <p className={styles.sub}>Meal plan · {DAYS[day.dayIndex]?.long}</p>
          <p className={styles.serial}>
            N<sup>o</sup> {serial}
          </p>
        </header>

        {day.meals.map((meal) => {
          const tracked = tracking?.log.meals[meal.id];
          // A marked meal shows the numbers from when it was marked.
          const subtotal = tracked?.totals ?? mealTotals(meal);
          const skipped = tracked?.status === 'skipped';

          return (
            <section key={meal.id} className={skipped ? styles.mealSkipped : styles.meal}>
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
                        // Once a meal is marked, it is a record of what happened, so it is no longer editable.
                        disabled={Boolean(tracked)}
                        aria-label={`${food.name}, ${fmtPortion(item.portions, food.unit)}, ${fmtInt(line.kcal)} kilocalories.${tracked ? '' : ' Change portion or swap.'}`}
                      >
                        <span className={styles.name}>{food.name}</span>
                        <span className={styles.kcal}>{fmtInt(line.kcal)}</span>
                        <span className={styles.detail}>
                          {fmtPortion(item.portions, food.unit)} · {macroLine(line)}
                        </span>
                        <span className={styles.grams}>{fmtInt(food.grams * item.portions)} g</span>
                        {!tracked && (
                          <span className={styles.swapIcon}>
                            <Icon name="swap" size={18} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.subtotal}>{macroLine(subtotal)}</p>

              {tracking && (
                <div className={styles.track}>
                  {tracked ? (
                    <>
                      <Stamp tone={skipped ? 'red' : 'green'}>{skipped ? 'Skipped' : 'Eaten'}</Stamp>
                      <Button variant="quiet" onClick={() => tracking.onMark(meal, null)}>
                        Undo
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => tracking.onMark(meal, 'eaten')}>
                        <Icon name="check" size={18} /> Ate it
                      </Button>
                      <Button variant="outline" onClick={() => tracking.onMark(meal, 'skipped')}>
                        Skip
                      </Button>
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {extras.length > 0 && tracking && (
          <section className={styles.meal}>
            <h3 className={styles.mealHead}>
              <span>Extras</span>
              <span className={styles.leader} aria-hidden="true" />
              <span>{fmtInt(extras.reduce((sum, extra) => sum + extra.totals.kcal, 0))} kcal</span>
            </h3>
            <ul>
              {extras.map((extra) => (
                <li key={extra.id} className={styles.extra}>
                  <span className={styles.name}>{extra.name}</span>
                  <span className={styles.kcal}>{fmtInt(extra.totals.kcal)}</span>
                  <span className={styles.detail}>{macroLine(extra.totals)}</span>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => tracking.onRemoveExtra(extra.id)}
                    aria-label={`Remove ${extra.name}`}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <dl className={styles.totals}>
          <div className={styles.totalRow}>
            <dt>{tracking ? 'Eaten' : 'Total'}</dt>
            <dd>{fmtInt((tracking?.eaten ?? totals).kcal)} kcal</dd>
          </div>
          {tracking && (
            <>
              <div className={styles.row}>
                <dt>Still to come</dt>
                <dd>{fmtInt(outlook.kcal - tracking.eaten.kcal)} kcal</dd>
              </div>
              <div className={styles.row}>
                <dt>Day ends at</dt>
                <dd>{fmtInt(outlook.kcal)} kcal</dd>
              </div>
            </>
          )}
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
              {fmtInt(outlook.protein)} / {fmtInt(outlook.carbs)} / {fmtInt(outlook.fat)} g
            </dd>
          </div>
        </dl>

        <footer className={styles.foot}>
          <p>Salamat. Kain nang mabuti.</p>
          <p className={styles.footNote}>Calories and macros are estimates. They vary by recipe and serving size.</p>
        </footer>
      </div>

      <span className={`${styles.edge} ${styles.edgeBottom}`} aria-hidden="true" />
    </article>
  );
}
