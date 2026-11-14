import { useState } from 'react';
import { BRAND } from '@/config/brand';
import { useProfileStore } from '@/state/profileStore';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { draftFromProfile, EMPTY_DRAFT, profileFromDraft, type Draft } from './draft';
import styles from './Onboarding.module.css';
import { STEPS } from './steps';
import { Welcome } from './Welcome';

interface OnboardingProps {
  onDone: () => void;
  /** Present when editing existing details, so the person can back out. */
  onCancel?: () => void;
}

/** The question flow. Also used to edit details later, starting from the saved answers. */
export function Onboarding({ onDone, onCancel }: OnboardingProps) {
  const savedProfile = useProfileStore((state) => state.profile);
  const savedPrefs = useProfileStore((state) => state.prefs);
  const saveProfile = useProfileStore((state) => state.saveProfile);
  const setPrefs = useProfileStore((state) => state.setPrefs);

  const editing = Boolean(savedProfile);
  const [draft, setDraft] = useState<Draft>(() =>
    savedProfile ? draftFromProfile(savedProfile, savedPrefs) : EMPTY_DRAFT,
  );
  // -1 is the welcome screen, shown only on first run.
  const [stepIndex, setStepIndex] = useState(editing ? 0 : -1);

  if (stepIndex < 0) return <Welcome onStart={() => setStepIndex(0)} />;

  const step = STEPS[stepIndex]!;
  const isLast = stepIndex === STEPS.length - 1;
  const canContinue = step.isComplete(draft);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const back = () => {
    if (stepIndex === 0 && onCancel) onCancel();
    else setStepIndex(stepIndex - 1);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (!isLast) {
      setStepIndex(stepIndex + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    const profile = profileFromDraft(draft, savedProfile);
    if (!profile) return;
    saveProfile(profile);
    setPrefs(draft.prefs);
    onDone();
  };

  return (
    <form
      className={styles.flow}
      onSubmit={(event) => {
        event.preventDefault();
        if (canContinue) next();
      }}
    >
      <header className={styles.top}>
        <span className={styles.brand}>{BRAND.name}</span>
        <span className={`mono ${styles.count}`}>
          {String(stepIndex + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
        </span>
        {/* One plate per question. Filled plates are answered. */}
        <div className={styles.plates} aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.id} className={i <= stepIndex ? styles.plateOn : styles.plateOff} />
          ))}
        </div>
      </header>

      <div className={styles.question} key={step.id}>
        <h1 className={`display ${styles.title}`}>{step.title}</h1>
        <p className={styles.lead}>{step.lead}</p>
        <div className={styles.fields}>{step.render({ draft, update })}</div>
      </div>

      <footer className={styles.actions}>
        <div className={styles.actionsInner}>
          <Button variant="outline" size="lg" onClick={back} aria-label="Back">
            <Icon name="arrowLeft" />
          </Button>
          <Button type="submit" size="lg" block disabled={!canContinue}>
            {isLast ? (editing ? 'Save changes' : 'Show my target') : 'Next'}
            <Icon name={isLast ? 'check' : 'arrowRight'} />
          </Button>
        </div>
      </footer>
    </form>
  );
}
