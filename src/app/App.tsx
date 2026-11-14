import { Onboarding } from '@/features/onboarding/Onboarding';
import { MealsScreen } from '@/features/meals/MealsScreen';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { TargetScreen } from '@/features/target/TargetScreen';
import { useProfileStore } from '@/state/profileStore';
import { AppShell } from './AppShell';
import { useRoute } from './router';

export function App() {
  const profile = useProfileStore((state) => state.profile);
  const [route, go] = useRoute();

  // No profile yet, or the person asked to edit their details.
  if (!profile || route === 'start') {
    return <Onboarding onDone={() => go('target')} onCancel={profile ? () => go('target') : undefined} />;
  }

  return (
    <AppShell route={route}>
      {route === 'target' && <TargetScreen go={go} />}
      {route === 'meals' && <MealsScreen go={go} />}
      {route === 'progress' && <ProgressScreen />}
    </AppShell>
  );
}
