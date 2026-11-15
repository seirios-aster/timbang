import { useSettingsStore } from '@/state/settingsStore';
import { Button } from '@/ui/Button';
import { InstallSteps, useCanInstall } from '@/ui/InstallSteps';
import styles from './TodayScreen.module.css';

/** A card on the Today screen offering to add the app to the home screen. Gone once installed or dismissed. */
export function InstallCard() {
  const canInstall = useCanInstall();
  const dismissed = useSettingsStore((state) => state.installDismissed);
  const dismiss = useSettingsStore((state) => state.dismissInstall);

  if (!canInstall || dismissed) return null;

  return (
    <section className={`on-paper ${styles.install}`} aria-labelledby="install-heading">
      <h2 id="install-heading" className={`display ${styles.installTitle}`}>
        Keep it on your home screen
      </h2>
      <p className={styles.sub}>Opens full screen, loads faster, and works without a signal.</p>
      <InstallSteps />
      <Button variant="quiet" onClick={dismiss}>
        Not now
      </Button>
    </section>
  );
}
