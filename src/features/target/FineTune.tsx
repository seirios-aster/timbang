import { defaultProteinPerKg } from '@/domain/nutrition/targets';
import { PROFILE_LIMITS, type Profile, type Targets } from '@/domain/nutrition/types';
import { proteinUnit } from '@/lib/units';
import { useProfileStore } from '@/state/profileStore';
import { useUnits } from '@/state/settingsStore';
import { CheckChip } from '@/ui/CheckChip';
import { ChoiceList } from '@/ui/ChoiceList';
import { NumberField } from '@/ui/NumberField';
import { PACE_CHOICES } from './copy';
import styles from './TargetScreen.module.css';

interface FineTuneProps {
  profile: Profile;
  targets: Targets;
}

const LB_PER_KG = 2.2046226;
const DEFAULT_BODY_FAT = { male: 18, female: 26 };

/** Optional controls for people who know their numbers. Everything here has a sensible default. */
export function FineTune({ profile, targets }: FineTuneProps) {
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const knowsBodyFat = profile.bodyFatPct !== undefined;
  const { system } = useUnits();
  // Protein is stored per kg. Imperial users see it per lb.
  const perUnit = system === 'imperial' ? 1 / LB_PER_KG : 1;
  const limits = PROFILE_LIMITS.proteinPerKg;

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
            label={`Protein per ${system === 'imperial' ? 'lb' : 'kg'} of body weight`}
            unit={proteinUnit(system)}
            size="md"
            step={system === 'imperial' ? 0.05 : 0.1}
            digits={system === 'imperial' ? 2 : 1}
            value={Number((targets.proteinPerKg * perUnit).toFixed(2))}
            onChange={(value) => updateProfile({ proteinPerKg: value / perUnit })}
            min={Number((limits.min * perUnit).toFixed(2))}
            max={Number((limits.max * perUnit).toFixed(2))}
          />
          <p className={styles.hint}>
            Default for your goal is {(defaultProteinPerKg(profile.goal) * perUnit).toFixed(system === 'imperial' ? 2 : 1)}{' '}
            {proteinUnit(system)}. Most lifters do well between {(1.6 * perUnit).toFixed(system === 'imperial' ? 2 : 1)} and{' '}
            {(2.2 * perUnit).toFixed(system === 'imperial' ? 2 : 1)}.
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
