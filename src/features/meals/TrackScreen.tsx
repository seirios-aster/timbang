import { useState } from 'react';
import type { Route } from '@/app/router';
import { eatenTotals } from '@/domain/mealplan/tracking';
import type { ExtraFood } from '@/domain/mealplan/tracking';
import { todayIso } from '@/lib/date';
import { fmtInt } from '@/lib/format';
import { useDayLog, useMealLogStore } from '@/state/mealLogStore';
import { useTargets } from '@/state/useTargets';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { AddFoodSheet, describeAdded } from './AddFoodSheet';
import { DaySummary } from './DaySummary';
import styles from './MealsScreen.module.css';

/** The meals food can be logged under, in order of the day. */
export const TRACK_MEALS = ['Almusal', 'Tanghalian', 'Meryenda', 'Hapunan'] as const;

/** The meal that fits the time of day, so the common case is already chosen. */
export function mealForNow(hour = new Date().getHours()): (typeof TRACK_MEALS)[number] {
  if (hour < 10) return 'Almusal';
  if (hour < 14) return 'Tanghalian';
  if (hour < 18) return 'Meryenda';
  return 'Hapunan';
}

interface TrackScreenProps {
  go: (route: Route) => void;
}

/** Tracking without a plan: log what was eaten and watch the day fill up against the target. */
export function TrackScreen({ go }: TrackScreenProps) {
  const targets = useTargets();
  const today = todayIso();
  const log = useDayLog(today);
  const addExtra = useMealLogStore((state) => state.addExtra);
  const removeExtra = useMealLogStore((state) => state.removeExtra);
  const [adding, setAdding] = useState(false);

  if (!targets) return null;

  const eaten = eatenTotals(log);
  const groups = [...TRACK_MEALS, ...new Set(log.extras.map((extra) => extra.meal ?? 'Other').filter((meal) => !(TRACK_MEALS as readonly string[]).includes(meal)))]
    .map((meal) => ({ meal, items: log.extras.filter((extra) => (extra.meal ?? 'Other') === meal) }))
    .filter((group) => group.items.length > 0);

  const total = (items: ExtraFood[]) => items.reduce((sum, item) => sum + item.totals.kcal, 0);

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h1 className="eyebrow">Food log · today</h1>
        <button type="button" className={`eyebrow ${styles.settings}`} onClick={() => go('start')}>
          Just tracking · change
        </button>
      </div>

      <DaySummary totals={eaten} targets={targets} mode="eaten" />

      <Button size="lg" block onClick={() => setAdding(true)}>
        <Icon name="plus" size={20} /> Add food
      </Button>

      {groups.length === 0 ? (
        <section className={styles.empty}>
          <p className={`display ${styles.emptyTitle}`}>Nothing logged yet</p>
          <p className={styles.emptyText}>
            Add each meal as you eat it. Pick from the food list or type in the numbers from a label or a menu, and the
            bars above show how close you are to your target.
          </p>
        </section>
      ) : (
        <div className={styles.logList}>
          {groups.map((group) => (
            <section key={group.meal} className={styles.logGroup} aria-label={group.meal}>
              <h2 className={styles.logHead}>
                <span>{group.meal}</span>
                <span className={styles.logLeader} aria-hidden="true" />
                <span>{fmtInt(total(group.items))} kcal</span>
              </h2>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id} className={styles.logItem}>
                    <span className={styles.logName}>{item.name}</span>
                    <span className={`mono ${styles.logKcal}`}>{fmtInt(item.totals.kcal)}</span>
                    <span className={`mono ${styles.logMacros}`}>
                      P {fmtInt(item.totals.protein)} · C {fmtInt(item.totals.carbs)} · F {fmtInt(item.totals.fat)}
                    </span>
                    <button type="button" className={styles.logRemove} onClick={() => removeExtra(today, item.id)} aria-label={`Remove ${item.name}`}>
                      <Icon name="close" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AddFoodSheet
        open={adding}
        onClose={() => setAdding(false)}
        eyebrow="Food log"
        title="Add food"
        mealChoices={TRACK_MEALS}
        defaultMeal={mealForNow()}
        onAdd={(entry, meal) => {
          const { name, totals } = describeAdded(entry);
          addExtra(today, name, totals, meal);
        }}
      />
    </div>
  );
}
