import { useState } from 'react';
import { PROFILE_LIMITS } from '@/domain/nutrition/types';
import { todayIso } from '@/lib/date';
import { bodyFromDisplay, bodyToDisplay } from '@/lib/units';
import { useUnits } from '@/state/settingsStore';
import { useProgressStore } from '@/state/progressStore';
import { Button } from '@/ui/Button';
import { DateStepper } from '@/ui/DateStepper';
import { NumberField } from '@/ui/NumberField';
import styles from './ProgressScreen.module.css';

interface WeighInFormProps {
  /** Starting value for the weight field, in kg: the last weigh-in, or the profile weight. */
  defaultWeightKg: number;
}

export function WeighInForm({ defaultWeightKg }: WeighInFormProps) {
  const log = useProgressStore((state) => state.log);
  const { system, weight: unit } = useUnits();
  const [date, setDate] = useState(todayIso);
  const [weight, setWeight] = useState(() => Number(bodyToDisplay(defaultWeightKg, system).toFixed(1)));
  const [savedDate, setSavedDate] = useState<string | null>(null);

  const limits = PROFILE_LIMITS.weightKg;

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        log({ date, weightKg: bodyFromDisplay(weight, system) });
        setSavedDate(date);
      }}
    >
      <NumberField
        id="weigh-in-weight"
        label="Weight"
        unit={unit}
        step={0.1}
        digits={1}
        value={weight}
        onChange={(value) => {
          setWeight(value);
          setSavedDate(null);
        }}
        min={Math.ceil(bodyToDisplay(limits.min, system))}
        max={Math.floor(bodyToDisplay(limits.max, system))}
      />
      <div className={styles.formRow}>
        <DateStepper
          id="weigh-in-date"
          label="Date"
          value={date}
          onChange={(next) => {
            setDate(next);
            setSavedDate(null);
          }}
        />
        <Button type="submit" size="lg">
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
