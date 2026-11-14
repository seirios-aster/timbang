import { useEffect, useState } from 'react';
import { BRAND } from '@/config/brand';
import { Button } from '@/ui/Button';
import { Dial } from '@/ui/Dial';
import { Icon } from '@/ui/Icon';
import styles from './Onboarding.module.css';

/** Sample readings the welcome dial moves between, to show what the app does. */
const SAMPLES = [
  { calories: 1760, deltaKcal: -440, caption: 'sample cut' },
  { calories: 2200, deltaKcal: 0, caption: 'sample maintain' },
  { calories: 2530, deltaKcal: 330, caption: 'sample bulk' },
];

const PROMISES = [
  { title: 'Your calorie target', detail: 'For losing fat, maintaining, or building muscle.' },
  { title: 'A week of meals that hit it', detail: 'Kanin, ulam, gulay. Priced in pesos.' },
  { title: 'A weigh-in log', detail: 'It tells you if the plan is working.' },
];

interface WelcomeProps {
  onStart: () => void;
}

export function Welcome({ onStart }: WelcomeProps) {
  const [index, setIndex] = useState(0);

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
        <p className="eyebrow">{BRAND.tagline}</p>
        <h1 className={`display ${styles.wordmark}`}>{BRAND.name}</h1>
        <p className={styles.pitch}>Eat for your lifts, with food you already know.</p>
      </header>

      <div className={styles.heroDial}>
        <Dial calories={sample.calories} deltaKcal={sample.deltaKcal} caption={sample.caption} />
      </div>

      <ol className={styles.promises}>
        {PROMISES.map((promise, i) => (
          <li key={promise.title} className={styles.promise}>
            <span className={`mono ${styles.promiseNo}`}>{String(i + 1).padStart(2, '0')}</span>
            <span>
              <strong className={styles.promiseTitle}>{promise.title}</strong>
              <span className={styles.promiseDetail}>{promise.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.welcomeAction}>
        <Button size="lg" block onClick={onStart}>
          Get my target <Icon name="arrowRight" />
        </Button>
        <p className={styles.fine}>Six quick questions. For adults 18 and up. Estimates, not medical advice.</p>
      </div>
    </div>
  );
}
