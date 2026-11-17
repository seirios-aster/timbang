import { useSettingsStore } from '@/state/settingsStore';
import { ChoiceList } from '@/ui/ChoiceList';
import { InstallSteps, useCanInstall } from '@/ui/InstallSteps';
import { AccountSection } from './AccountSection';
import styles from './TargetScreen.module.css';

/** App-wide choices: measurement units, and adding the app to the home screen. */
export function Preferences() {
  const units = useSettingsStore((state) => state.units);
  const setUnits = useSettingsStore((state) => state.setUnits);
  const canInstall = useCanInstall();

  return (
    <section className={styles.prefs} aria-labelledby="prefs-heading">
      <h2 id="prefs-heading" className={`display ${styles.heading}`}>
        Settings
      </h2>
      <ChoiceList
        name="app-units"
        legend="Units"
        layout="cells"
        value={units}
        onChange={setUnits}
        choices={[
          { value: 'metric', title: 'Metric', detail: 'kg, cm, litres' },
          { value: 'imperial', title: 'Imperial', detail: 'lb, ft, fl oz' },
        ]}
      />
      <AccountSection />
      {canInstall && (
        <div className={styles.install}>
          <p className="eyebrow">Add to home screen</p>
          <InstallSteps />
        </div>
      )}
    </section>
  );
}
