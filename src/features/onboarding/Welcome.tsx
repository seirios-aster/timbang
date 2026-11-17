import { useEffect, useState } from 'react';
import { BRAND } from '@/config/brand';
import { AccountSection } from '@/features/target/AccountSection';
import { useAccountStore } from '@/state/accountStore';
import { Button } from '@/ui/Button';
import { Dial } from '@/ui/Dial';
import { Icon, type IconName } from '@/ui/Icon';
import { Sheet } from '@/ui/Sheet';
import { ThemeToggle } from '@/ui/ThemeToggle';
import styles from './Onboarding.module.css';

/** Sample readings the welcome dial moves between, to show what the app does. */
const SAMPLES = [
  { calories: 1760, deltaKcal: -440, caption: 'sample cut' },
  { calories: 2200, deltaKcal: 0, caption: 'sample maintain' },
  { calories: 2530, deltaKcal: 330, caption: 'sample bulk' },
];

/** What the person gets, one per tab of the app. */
const INCLUDED: { icon: IconName; label: string }[] = [
  { icon: 'dial', label: 'Calories' },
  { icon: 'resibo', label: 'Meal plan' },
  { icon: 'dumbbell', label: 'Training' },
  { icon: 'trend', label: 'Progress' },
];

interface WelcomeProps {
  onStart: () => void;
}

/** First screen. Sized to fit one phone screen, so the button is visible without scrolling. */
export function Welcome({ onStart }: WelcomeProps) {
  const [index, setIndex] = useState(0);
  const [signingIn, setSigningIn] = useState(false);
  const signedIn = useAccountStore((state) => state.user !== null);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % SAMPLES.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

  const sample = SAMPLES[index]!;

  return (
    <div className={styles.welcome}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <p className="eyebrow">{BRAND.tagline}</p>
          <ThemeToggle />
        </div>
        <h1 className={`display ${styles.wordmark}`}>{BRAND.name}</h1>
        <p className={styles.pitch}>Eat and train for your goal, with food you already know.</p>
      </header>

      <div className={styles.heroDial}>
        <Dial calories={sample.calories} deltaKcal={sample.deltaKcal} caption={sample.caption} fit="box" />
      </div>

      <ul className={styles.included} aria-label="What you get">
        {INCLUDED.map((item) => (
          <li key={item.label} className={styles.includedItem}>
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>

      <div className={styles.welcomeAction}>
        <Button size="lg" block onClick={onStart}>
          Get my plan <Icon name="arrowRight" />
        </Button>
        <p className={styles.fine}>Six quick questions. For adults 18 and up. Estimates, not medical advice.</p>
        <Button variant="quiet" className={styles.haveAccount} onClick={() => setSigningIn(true)}>
          {signedIn ? 'Your account' : 'I already have an account'}
        </Button>
      </div>

      <Sheet open={signingIn} onClose={() => setSigningIn(false)} title="Sign in" eyebrow="Get your data back">
        <AccountSection heading={false} />
      </Sheet>
    </div>
  );
}
