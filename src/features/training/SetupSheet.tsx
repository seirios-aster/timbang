import { MAX_TRAINING_DAYS, MIN_TRAINING_DAYS } from '@/domain/training/splits';
import { useProfileStore } from '@/state/profileStore';
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

/** The two things that shape the program: how many days, and what there is to train with. */
export function SetupSheet({ open, onClose }: SetupSheetProps) {
  const days = useProfileStore((state) => state.profile?.trainingDays ?? 0);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const equipment = useTrainingStore((state) => state.equipment);
  const setEquipment = useTrainingStore((state) => state.setEquipment);

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
        <Button size="lg" block onClick={onClose}>
          Done
        </Button>
      </div>
    </Sheet>
  );
}
