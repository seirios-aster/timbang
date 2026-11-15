import { suggestCalibration } from '@/domain/nutrition/calibration';
import { computeTargets } from '@/domain/nutrition/targets';
import type { Profile, Targets } from '@/domain/nutrition/types';
import type { WeighIn } from '@/domain/progress/types';
import { todayIso } from '@/lib/date';
import { fmtInt, fmtSigned } from '@/lib/format';
import { fmtBodyChange, weightUnit } from '@/lib/units';
import { useUnits } from '@/state/settingsStore';
import { useProfileStore } from '@/state/profileStore';
import { Button } from '@/ui/Button';
import styles from './ProgressScreen.module.css';

interface CalibrationCardProps {
  profile: Profile;
  targets: Targets;
  entries: WeighIn[];
}

/**
 * Offers to correct the calorie estimate when the scale has been telling a different story
 * for a couple of weeks. The correction is shown with its effect, and only applied on a tap.
 */
export function CalibrationCard({ profile, targets, entries }: CalibrationCardProps) {
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const { system } = useUnits();
  const suggestion = suggestCalibration(entries, targets.weeklyChangeKg, profile.calibratedOn);
  if (!suggestion) return null;

  const adjustment = (profile.calorieAdjustment ?? 0) + suggestion.maintenanceDeltaKcal;
  const after = computeTargets({ ...profile, calorieAdjustment: adjustment });
  const unit = weightUnit(system);
  const more = suggestion.maintenanceDeltaKcal > 0;

  return (
    <section className={`on-paper ${styles.calibration}`} aria-labelledby="calibration-heading">
      <h3 id="calibration-heading" className={`display ${styles.calibrationTitle}`}>
        Check your target
      </h3>
      <p>
        Over {suggestion.days} days your weight changed {fmtBodyChange(suggestion.actualKgPerWeek, system)} {unit} a week. Your
        target expected {fmtBodyChange(suggestion.plannedKgPerWeek, system)}. If you have been eating to the plan, your body
        burns about {fmtInt(Math.abs(suggestion.maintenanceDeltaKcal))} kcal a day {more ? 'more' : 'less'} than the formula
        estimated.
      </p>
      <p>
        <strong>
          {fmtInt(targets.calories)} to {fmtInt(after.calories)} kcal a day ({fmtSigned(after.calories - targets.calories)}).
        </strong>{' '}
        Your goal and pace stay the same. Weigh-ins from here on are used to check the new number.
      </p>
      <div className={styles.calibrationActions}>
        <Button onClick={() => updateProfile({ calorieAdjustment: adjustment, calibratedOn: todayIso() })}>
          Use {fmtInt(after.calories)} kcal
        </Button>
        <Button variant="quiet" onClick={() => updateProfile({ calibratedOn: todayIso() })}>
          Keep my target
        </Button>
      </div>
      <p className={styles.calibrationNote}>
        If you have not been following the plan closely, keep your target and aim to follow it first. A weigh-in can
        only tell you about a plan you actually ate.
      </p>
    </section>
  );
}
