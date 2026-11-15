import { MAX_TRAINING_DAYS, MIN_TRAINING_DAYS } from '@/domain/training/splits';
import { useProfileStore } from '@/state/profileStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useTrainingStore } from '@/state/trainingStore';
import { Button } from '@/ui/Button';
import { ChoiceList } from '@/ui/ChoiceList';
import { NumberField } from '@/ui/NumberField';
import { Sheet } from '@/ui/Sheet';
import { EQUIPMENT_CHOICES } from './copy';
import styles from './TrainingScreen.module.css';

interface SetupSheetProps {
  open: boolean;
  onClose: () => void;
}

/** What shapes the program: how many days, what there is to train with, and the gym's unit. */
export function SetupSheet({ open, onClose }: SetupSheetProps) {
  const days = useProfileStore((state) => state.profile?.trainingDays ?? 0);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const equipment = useTrainingStore((state) => state.equipment);
  const setEquipment = useTrainingStore((state) => state.setEquipment);
  const units = useSettingsStore((state) => state.units);
  const setUnits = useSettingsStore((state) => state.setUnits);

  return (
    <Sheet open={open} onClose={onClose} eyebrow="Training" title="Your setup">
      <div className={styles.setup}>
        <div>
          <NumberField
            id="setup-days"
            label="Lifting days a week"
            unit="days"
            min={MIN_TRAINING_DAYS}
            max={MAX_TRAINING_DAYS}
            value={Math.min(MAX_TRAINING_DAYS, Math.max(MIN_TRAINING_DAYS, days))}
            onChange={(trainingDays) => updateProfile({ trainingDays })}
          />
          <p className={styles.hint}>
            Pick what you can keep up every week. Three or four days is plenty to grow. This also updates your calorie
            target, since training burns energy.
          </p>
        </div>
        <ChoiceList
          name="equipment"
          legend="What you train with"
          value={equipment}
          onChange={setEquipment}
          choices={EQUIPMENT_CHOICES}
        />
        <div>
          <ChoiceList
            name="weight-unit"
            legend="Units"
            layout="cells"
            value={units}
            onChange={setUnits}
            choices={[
              { value: 'metric', title: 'Metric', detail: 'kg plates, kg body weight' },
              { value: 'imperial', title: 'Imperial', detail: 'lb plates, lb body weight' },
            ]}
          />
          <p className={styles.hint}>
            Check the number stamped on a plate. Suggested weights, jumps and the plate diagram follow this, and so do
            your body weight and height. Your history is kept either way.
          </p>
        </div>
        <Button size="lg" block onClick={onClose}>
          Done
        </Button>
      </div>
    </Sheet>
  );
}
