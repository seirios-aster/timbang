import { useInstall } from '@/lib/install';
import { Button } from './Button';
import { Icon } from './Icon';
import styles from './InstallSteps.module.css';

/** What to do to add the app to the home screen, for whichever device this is. Renders nothing when there is nothing to do. */
export function InstallSteps() {
  const { state, install } = useInstall();

  if (state.kind === 'prompt') {
    return (
      <Button onClick={() => void install()}>
        <Icon name="plus" size={18} /> Add to home screen
      </Button>
    );
  }

  if (state.kind === 'ios') {
    return (
      <ol className={styles.steps}>
        <li>
          Tap the <strong>Share</strong> button{' '}
          <span className={styles.glyph}>
            <Icon name="share" size={16} />
          </span>{' '}
          {state.inSafari ? 'at the bottom of the screen.' : 'in the address bar.'}
        </li>
        <li>
          Scroll and tap <strong>Add to Home Screen</strong>.
        </li>
        <li>
          Tap <strong>Add</strong>. Timbang opens full screen from your home screen, like any other app.
        </li>
        {!state.inSafari && <li className={styles.note}>This needs iOS 16.4 or later. If you do not see it, open this page in Safari.</li>}
      </ol>
    );
  }

  return null;
}

/** True when there is an install step to show on this device. */
export function useCanInstall(): boolean {
  const { state } = useInstall();
  return state.kind === 'prompt' || state.kind === 'ios';
}
