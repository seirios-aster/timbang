import { useState } from 'react';
import type { Route } from '@/app/router';
import { planKey } from '@/domain/mealplan/generator';
import { fmtDecimal, fmtInt, fmtSigned } from '@/lib/format';
import { usePlanStore } from '@/state/planStore';
import { useProfileStore } from '@/state/profileStore';
import { useProgressStore } from '@/state/progressStore';
import { useTargets } from '@/state/useTargets';
import { Barbell } from '@/ui/Barbell';
import { Button } from '@/ui/Button';
import { Dial } from '@/ui/Dial';
import { Icon } from '@/ui/Icon';
import { Stamp } from '@/ui/Stamp';
import { GOAL_LABEL, summarize } from './copy';
import { FineTune } from './FineTune';
import styles from './TargetScreen.module.css';

interface TargetScreenProps {
  go: (route: Route) => void;
}

export function TargetScreen({ go }: TargetScreenProps) {
  const profile = useProfileStore((state) => state.profile);
  const prefs = useProfileStore((state) => state.prefs);
  const resetProfile = useProfileStore((state) => state.reset);
  const week = usePlanStore((state) => state.week);
  const buildPlan = usePlanStore((state) => state.build);
  const clearPlan = usePlanStore((state) => state.clear);
  const clearProgress = useProgressStore((state) => state.clear);
  const targets = useTargets();
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (!profile || !targets) return null;

  const planIsCurrent = week?.builtFor === planKey(targets, prefs);

  const openPlan = () => {
    if (!planIsCurrent) buildPlan(targets, prefs);
    go('meals');
  };

  const startOver = () => {
    clearPlan();
    clearProgress();
    resetProfile();
  };

  return (
    <div className={styles.screen}>
      <section className={styles.hero} aria-labelledby="target-heading">
        <div className={styles.heroHead}>
          <h1 id="target-heading" className="eyebrow">
            Your daily target
          </h1>
          <Stamp tone={profile.goal === 'maintain' ? 'ink' : profile.goal === 'lose' ? 'red' : 'blue'}>
            {GOAL_LABEL[profile.goal]}
          </Stamp>
        </div>

        <Dial calories={targets.calories} deltaKcal={targets.deltaKcal} />

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt className="eyebrow">Maintenance</dt>
            <dd className={styles.factValue}>
              {fmtInt(targets.maintenance)} <span className={styles.factUnit}>kcal</span>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt className="eyebrow">Change</dt>
            <dd className={styles.factValue}>
              {fmtSigned(targets.deltaKcal)} <span className={styles.factUnit}>kcal</span>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt className="eyebrow">Per week</dt>
            <dd className={styles.factValue}>
              {fmtSigned(targets.weeklyChangeKg, 2)} <span className={styles.factUnit}>kg</span>
            </dd>
          </div>
        </dl>

        <p className={styles.summary}>{summarize(profile.goal, targets)}</p>

        {targets.floorApplied && (
          <p className={styles.notice}>
            Your target stops at {fmtInt(targets.calories)} kcal. Eating less than that is not a good idea without a
            doctor or dietitian guiding you.
          </p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="macros-heading">
        <div className={styles.sectionHead}>
          <h2 id="macros-heading" className={`display ${styles.heading}`}>
            Macros
          </h2>
          <span className="eyebrow">{fmtDecimal(targets.proteinPerKg, 1)} g protein per kg</span>
        </div>
        <Barbell proteinG={targets.proteinG} carbsG={targets.carbsG} fatG={targets.fatG} />
      </section>

      <Button size="lg" block onClick={openPlan}>
        {planIsCurrent ? 'Open my meal plan' : week ? 'Reprint my meal plan' : 'Print my meal plan'}
        <Icon name="arrowRight" />
      </Button>

      <FineTune profile={profile} targets={targets} />

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Button variant="quiet" onClick={() => go('start')}>
            Edit my details
          </Button>
          {confirmingReset ? (
            <span className={styles.confirm}>
              <Button variant="quiet" onClick={startOver}>
                Yes, erase everything
              </Button>
              <Button variant="quiet" onClick={() => setConfirmingReset(false)}>
                Keep it
              </Button>
            </span>
          ) : (
            <Button variant="quiet" onClick={() => setConfirmingReset(true)}>
              Start over
            </Button>
          )}
        </div>
        <p className={styles.disclaimer}>
          These numbers are estimates from standard formulas, not medical advice. If you are pregnant, under 18, or
          managing a health condition, talk to a doctor or registered nutritionist-dietitian first.
        </p>
      </footer>
    </div>
  );
}
