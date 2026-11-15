import { useState } from 'react';
import { lifestyleFromSteps, stepAverage } from '@/domain/nutrition/steps';
import { LIFESTYLE_LABEL } from '@/features/target/copy';
import { DAYS, shiftDate, todayIso } from '@/lib/date';
import { fmtInt } from '@/lib/format';
import { useProfileStore } from '@/state/profileStore';
import { useStepsStore } from '@/state/stepsStore';
import { Button } from '@/ui/Button';
import { DateStepper } from '@/ui/DateStepper';
import { Icon } from '@/ui/Icon';
import { NumberField } from '@/ui/NumberField';
import { Sheet } from '@/ui/Sheet';
import styles from './StepsSheet.module.css';

interface StepsSheetProps {
  open: boolean;
  onClose: () => void;
}

/** The last seven days as small bars against the goal. */
function Week({ days, goal }: { days: Record<string, number>; goal: number }) {
  const today = todayIso();
  const dates = Array.from({ length: 7 }, (_, i) => shiftDate(today, i - 6));
  const top = Math.max(goal, ...dates.map((date) => days[date] ?? 0));
  return (
    <ol className={styles.week} aria-label="Steps over the last seven days">
      {dates.map((date) => {
        const steps = days[date] ?? 0;
        const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
        return (
          <li key={date} className={styles.day}>
            <span className={styles.barTrack}>
              <span className={steps >= goal ? styles.barMet : styles.bar} style={{ height: `${(steps / top) * 100}%` }} />
              <span className={styles.goalLine} style={{ bottom: `${(goal / top) * 100}%` }} />
            </span>
            <span className={`mono ${styles.dayName}`}>{DAYS[weekday]?.short.slice(0, 1)}</span>
            <span className="visually-hidden">
              {DAYS[weekday]?.long}: {fmtInt(steps)} steps
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Steps are typed in, because a website cannot read a phone's step counter. The phone's Health or
 * Fitness app has the number. A week of steps also shows whether the activity level behind the
 * calorie target fits how the person really moves.
 */
export function StepsSheet({ open, onClose }: StepsSheetProps) {
  const days = useStepsStore((state) => state.days);
  const goal = useStepsStore((state) => state.goal);
  const setSteps = useStepsStore((state) => state.setSteps);
  const setGoal = useStepsStore((state) => state.setGoal);
  const lifestyle = useProfileStore((state) => state.profile?.lifestyle);
  const updateProfile = useProfileStore((state) => state.updateProfile);

  const [date, setDate] = useState(todayIso);
  const average = stepAverage(days, todayIso());
  const fits = average ? lifestyleFromSteps(average.average) : null;

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Daily movement" title="Steps">
      <div className={styles.body}>
        <p className={styles.hint}>
          Your phone counts your steps in its Health or Fitness app. Copy the number here. A website cannot read it by
          itself.
        </p>

        <DateStepper id="steps-date" label="Day" value={date} onChange={setDate} />
        <NumberField
          key={date}
          id="steps-count"
          label="Steps"
          unit="steps"
          size="md"
          step={500}
          min={0}
          max={100000}
          value={days[date] ?? 0}
          onChange={(value) => setSteps(date, value)}
        />
        <div className={styles.quick} role="group" aria-label="Add steps">
          {[1000, 2500, 5000].map((amount) => (
            <Button key={amount} variant="outline" onClick={() => setSteps(date, Math.min(100000, (days[date] ?? 0) + amount))}>
              <Icon name="plus" size={16} /> {fmtInt(amount)}
            </Button>
          ))}
        </div>

        <section className={styles.block} aria-labelledby="steps-week">
          <h3 id="steps-week" className="eyebrow">
            Last seven days
          </h3>
          <Week days={days} goal={goal} />
          <p className={styles.hint}>
            {average
              ? `Average ${fmtInt(average.average)} a day over ${average.days} logged days. The line is your goal.`
              : 'Log four days and the average shows here. The line is your goal.'}
          </p>
        </section>

        {average && fits && lifestyle && fits !== lifestyle && (
          <section className={`on-paper ${styles.fit}`} aria-label="Activity level">
            <p>
              Your average of {fmtInt(average.average)} steps fits <strong>{LIFESTYLE_LABEL[fits]}</strong>. Your calorie
              target is set for <strong>{LIFESTYLE_LABEL[lifestyle]}</strong>. Updating it keeps the target true to how you
              really move.
            </p>
            <Button onClick={() => updateProfile({ lifestyle: fits })}>Use {LIFESTYLE_LABEL[fits]}</Button>
          </section>
        )}

        <NumberField
          id="steps-goal"
          label="Daily goal"
          unit="steps"
          size="md"
          step={500}
          min={2000}
          max={30000}
          value={goal}
          onChange={setGoal}
        />
        <Button size="lg" block onClick={onClose}>
          Done
        </Button>
      </div>
    </Sheet>
  );
}
