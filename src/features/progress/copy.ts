import type { Goal } from '@/domain/nutrition/types';
import type { PaceStatus } from '@/domain/progress/types';

interface PaceCopy {
  stamp: string;
  tone: 'ink' | 'green' | 'red' | 'blue';
  advice: string;
}

/** What to tell the person for each pace result. Advice depends on which way they are trying to go. */
export function paceCopy(status: PaceStatus, goal: Goal): PaceCopy {
  switch (status) {
    case 'needsData':
      return {
        stamp: 'Warming up',
        tone: 'ink',
        advice: 'Log at least three weigh-ins across a week. Then this will tell you if the plan is working.',
      };
    case 'onPace':
      return {
        stamp: 'On pace',
        tone: 'green',
        advice:
          goal === 'maintain'
            ? 'Your weight is holding steady. Keep eating the way you are.'
            : 'Your weight is moving the way the plan says it should. Change nothing.',
      };
    case 'tooFast':
      return {
        stamp: 'Too fast',
        tone: 'blue',
        advice:
          goal === 'lose'
            ? 'You are losing faster than planned, which risks muscle. Add a cup of rice a day or switch to an easier pace.'
            : 'You are gaining faster than planned, so some of it is likely fat. Switch to a leaner pace.',
      };
    case 'tooSlow':
      return {
        stamp: 'Too slow',
        tone: 'blue',
        advice:
          goal === 'lose'
            ? 'Slower than planned. Measure your rice and cooking oil for a week before cutting more.'
            : 'Slower than planned. Add a cup of rice a day or switch to a faster pace.',
      };
    case 'wrongWay':
      return {
        stamp: 'Off course',
        tone: 'red',
        advice:
          goal === 'maintain'
            ? 'Your weight is drifting. Update your target with your current weight and check your portions.'
            : 'Your weight is moving away from your goal. Check that portions match the plan, then update your target.',
      };
  }
}
