import { defaultProteinPerKg } from '@/domain/nutrition/targets';
import { PROFILE_LIMITS, type Profile, type Targets } from '@/domain/nutrition/types';
import { useProfileStore } from '@/state/profileStore';
import { CheckChip } from '@/ui/CheckChip';
import { ChoiceList } from '@/ui/ChoiceList';
import { NumberField } from '@/ui/NumberField';
import { PACE_CHOICES } from './copy';
import styles from './TargetScreen.module.css';

interface FineTuneProps {
  profile: Profile;
  targets: Targets;
}

const DEFAULT_BODY_FAT = { male: 18, female: 26 };

/** Optional controls for people who know their numbers. Everything here has a sensible default. */
export function FineTune({ profile, targets }: FineTuneProps) {
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const knowsBodyFat = profile.bodyFatPct !== undefined;

  return (
    <details className={styles.fineTune}>
      <summary className={styles.fineTuneSummary}>
        <span className="display">Fine-tune</span>
        <span className="eyebrow">Pace · protein · body fat</span>
      </summary>

      <div className={styles.fineTuneBody}>
        {profile.goal !== 'maintain' && (
          <ChoiceList
            name="pace"
            legend="Pace"
            layout="cells"
            value={targets.pace}
            onChange={(pace) => updateProfile({ pace })}
            choices={PACE_CHOICES[profile.goal]}
          />
        )}

        <div>
          <NumberField
            id="protein-per-kg"
            label="Protein per kg of body weight"
            unit="g/kg"
            size="md"
            step={0.1}
            digits={1}
            value={targets.proteinPerKg}
            onChange={(proteinPerKg) => updateProfile({ proteinPerKg })}
            {...PROFILE_LIMITS.proteinPerKg}
          />
          <p className={styles.hint}>
            Default for your goal is {defaultProteinPerKg(profile.goal).toFixed(1)} g/kg. Most lifters do well between
            1.6 and 2.2.
          </p>
        </div>

        <div className={styles.bodyFat}>
          <CheckChip
            id="knows-body-fat"
            label="I know my body fat %"
            checked={knowsBodyFat}
            onChange={(on) => updateProfile({ bodyFatPct: on ? DEFAULT_BODY_FAT[profile.sex] : undefined })}
          />
          {knowsBodyFat && (
            <NumberField
              id="body-fat"
              label="Body fat"
              unit="%"
              size="md"
              value={profile.bodyFatPct ?? DEFAULT_BODY_FAT[profile.sex]}
              onChange={(bodyFatPct) => updateProfile({ bodyFatPct })}
              {...PROFILE_LIMITS.bodyFatPct}
            />
          )}
          <p className={styles.hint}>
            {knowsBodyFat
              ? 'Using the Katch-McArdle formula, which works from lean mass.'
              : 'Using the Mifflin-St Jeor formula. Adding body fat makes it more exact for lean or heavy builds.'}
          </p>
        </div>
      </div>
    </details>
  );
}
