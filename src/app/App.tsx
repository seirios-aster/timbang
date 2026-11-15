import { Onboarding } from '@/features/onboarding/Onboarding';
import { MealsScreen } from '@/features/meals/MealsScreen';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { TargetScreen } from '@/features/target/TargetScreen';
import { TodayScreen } from '@/features/today/TodayScreen';
import { TrainingScreen } from '@/features/training/TrainingScreen';
import { useProfileStore } from '@/state/profileStore';
import { useTrainingStore } from '@/state/trainingStore';
import { AppShell } from './AppShell';
import { useRoute } from './router';

export function App() {
  const profile = useProfileStore((state) => state.profile);
  const [route, go] = useRoute();
  const sessionRunning = useTrainingStore((state) => state.session !== null);

  // No profile yet, or the person asked to edit their details.
  if (!profile || route === 'start') {
    return <Onboarding onDone={() => go('target')} onCancel={profile ? () => go('target') : undefined} />;
  }

  return (
    <AppShell route={route} immersive={route === 'training' && sessionRunning}>
      {route === 'today' && <TodayScreen go={go} />}
      {route === 'target' && <TargetScreen go={go} />}
      {route === 'meals' && <MealsScreen go={go} />}
      {route === 'training' && <TrainingScreen />}
      {route === 'progress' && <ProgressScreen />}
    </AppShell>
  );
}
