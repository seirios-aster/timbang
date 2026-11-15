import { PROFILE_LIMITS } from '@/domain/nutrition/types';
import { cmToFeetInches, feetInchesToCm, type UnitSystem } from '@/lib/units';
import { NumberField } from './NumberField';
import styles from './HeightField.module.css';

interface HeightFieldProps {
  value: number;
  onChange: (cm: number) => void;
  system: UnitSystem;
}

/** Height in cm, or in feet and inches. The value is always cm. */
export function HeightField({ value, onChange, system }: HeightFieldProps) {
  if (system === 'metric') {
    return (
      <NumberField
        id="height"
        label="Height"
        unit="cm"
        value={Math.round(value)}
        onChange={onChange}
        {...PROFILE_LIMITS.heightCm}
      />
    );
  }

  const { feet, inches } = cmToFeetInches(value);
  const limits = { min: Math.ceil(cmToFeetInches(PROFILE_LIMITS.heightCm.min).feet), max: 7 };

  return (
    <div className={styles.pair}>
      <NumberField
        id="height-feet"
        label="Height"
        unit="ft"
        value={feet}
        onChange={(next) => onChange(feetInchesToCm(next, inches))}
        {...limits}
      />
      <NumberField
        id="height-inches"
        label="Inches"
        unit="in"
        value={inches}
        onChange={(next) => onChange(feetInchesToCm(feet, next))}
        min={0}
        max={11}
      />
    </div>
  );
}
