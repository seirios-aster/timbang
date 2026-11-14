import { useState } from 'react';
import { PROFILE_LIMITS } from '@/domain/nutrition/types';
import { todayIso } from '@/lib/date';
import { useProgressStore } from '@/state/progressStore';
import { Button } from '@/ui/Button';
import { NumberField } from '@/ui/NumberField';
import styles from './ProgressScreen.module.css';

interface WeighInFormProps {
  /** Starting value for the weight field: the last weigh-in, or the profile weight. */
  defaultWeightKg: number;
}

export function WeighInForm({ defaultWeightKg }: WeighInFormProps) {
  const log = useProgressStore((state) => state.log);
  const [date, setDate] = useState(todayIso);
  const [weightKg, setWeightKg] = useState(defaultWeightKg);
  const [savedDate, setSavedDate] = useState<string | null>(null);

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        log({ date, weightKg });
        setSavedDate(date);
      }}
    >
      <NumberField
        id="weigh-in-weight"
        label="Weight today"
        unit="kg"
        step={0.1}
        digits={1}
        value={weightKg}
        onChange={(value) => {
          setWeightKg(value);
          setSavedDate(null);
        }}
        {...PROFILE_LIMITS.weightKg}
      />
      <div className={styles.formRow}>
        <label className={styles.dateField} htmlFor="weigh-in-date">
          <span className="eyebrow">Date</span>
          <input
            id="weigh-in-date"
            className={styles.date}
            type="date"
            value={date}
            max={todayIso()}
            required
            onChange={(event) => {
              setDate(event.target.value);
              setSavedDate(null);
            }}
          />
        </label>
        <Button type="submit" size="lg" disabled={!date}>
          Log it
        </Button>
      </div>
      <p className={styles.formNote} role="status">
        {savedDate === date
          ? 'Logged. Logging the same date again replaces it.'
          : 'Weigh in after waking, before eating, for numbers you can compare.'}
      </p>
    </form>
  );
}
