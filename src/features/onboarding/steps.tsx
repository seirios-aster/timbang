import type { ReactNode } from 'react';
import { computeTargets } from '@/domain/nutrition/targets';
import { PROFILE_LIMITS } from '@/domain/nutrition/types';
import type { DietTag } from '@/domain/foods/types';
import { CheckChip } from '@/ui/CheckChip';
import { ChoiceList } from '@/ui/ChoiceList';
import { Dial } from '@/ui/Dial';
import { NumberField } from '@/ui/NumberField';
import type { Draft } from './draft';
import styles from './Onboarding.module.css';

export interface StepProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}

export interface Step {
  id: string;
  title: string;
  lead: string;
  isComplete: (draft: Draft) => boolean;
  render: (props: StepProps) => ReactNode;
}

const EXCLUSIONS: { tag: DietTag; label: string }[] = [
  { tag: 'pork', label: 'No pork' },
  { tag: 'beef', label: 'No beef' },
  { tag: 'seafood', label: 'No seafood' },
  { tag: 'egg', label: 'No eggs' },
  { tag: 'dairy', label: 'No dairy' },
];

function GoalPreview({ draft }: { draft: Draft }) {
  if (!draft.sex || !draft.lifestyle || !draft.experience) return null;
  const targets = computeTargets({
    sex: draft.sex,
    lifestyle: draft.lifestyle,
    experience: draft.experience,
    goal: draft.goal ?? 'maintain',
    age: draft.age,
    heightCm: draft.heightCm,
    weightKg: draft.weightKg,
    trainingDays: draft.trainingDays,
  });
  return (
    <div className={styles.preview}>
      <Dial calories={targets.calories} deltaKcal={targets.deltaKcal} />
    </div>
  );
}

export const STEPS: Step[] = [
  {
    id: 'you',
    title: 'First, you',
    lead: 'Calorie needs differ by sex and age, so the math starts here.',
    isComplete: (draft) => Boolean(draft.sex),
    render: ({ draft, update }) => (
      <>
        <ChoiceList
          name="sex"
          legend="Sex"
          layout="cells"
          value={draft.sex}
          onChange={(sex) => update({ sex })}
          choices={[
            { value: 'male', title: 'Male' },
            { value: 'female', title: 'Female' },
          ]}
        />
        <NumberField
          id="age"
          label="Age"
          unit="yrs"
          value={draft.age}
          onChange={(age) => update({ age })}
          {...PROFILE_LIMITS.age}
        />
      </>
    ),
  },
  {
    id: 'body',
    title: 'Your size',
    lead: 'Use your weight from this week. You can update it any time you weigh in.',
    isComplete: () => true,
    render: ({ draft, update }) => (
      <>
        <NumberField
          id="height"
          label="Height"
          unit="cm"
          value={draft.heightCm}
          onChange={(heightCm) => update({ heightCm })}
          {...PROFILE_LIMITS.heightCm}
        />
        <NumberField
          id="weight"
          label="Weight"
          unit="kg"
          step={0.5}
          digits={1}
          value={draft.weightKg}
          onChange={(weightKg) => update({ weightKg })}
          {...PROFILE_LIMITS.weightKg}
        />
      </>
    ),
  },
  {
    id: 'day',
    title: 'Outside the gym',
    lead: 'Pick what most of your days look like. Lifting is the next question.',
    isComplete: (draft) => Boolean(draft.lifestyle),
    render: ({ draft, update }) => (
      <ChoiceList
        name="lifestyle"
        legend="A normal day"
        hideLegend
        value={draft.lifestyle}
        onChange={(lifestyle) => update({ lifestyle })}
        choices={[
          { value: 'desk', title: 'Mostly sitting', detail: 'Office, school, WFH, driving' },
          { value: 'mixed', title: 'Sitting and moving', detail: 'Commute on foot, errands, some standing' },
          { value: 'onFeet', title: 'On my feet', detail: 'Retail, teaching, nursing, service crew' },
          { value: 'manual', title: 'Physical work', detail: 'Construction, delivery, farm, warehouse' },
        ]}
      />
    ),
  },
  {
    id: 'training',
    title: 'Your lifting',
    lead: 'How often you train, and how long you have been at it.',
    isComplete: (draft) => Boolean(draft.experience),
    render: ({ draft, update }) => (
      <>
        <NumberField
          id="training-days"
          label="Lifting days a week"
          unit="days"
          value={draft.trainingDays}
          onChange={(trainingDays) => update({ trainingDays })}
          {...PROFILE_LIMITS.trainingDays}
        />
        <ChoiceList
          name="experience"
          legend="Experience"
          value={draft.experience}
          onChange={(experience) => update({ experience })}
          choices={[
            { value: 'beginner', title: 'Beginner', detail: 'Under a year of steady lifting' },
            { value: 'intermediate', title: 'Intermediate', detail: 'One to three years, lifts still going up' },
            { value: 'advanced', title: 'Advanced', detail: 'Three years or more, progress is slow' },
          ]}
        />
      </>
    ),
  },
  {
    id: 'goal',
    title: 'What are you after?',
    lead: 'The needle shows where your calories land against maintenance.',
    isComplete: (draft) => Boolean(draft.goal),
    render: ({ draft, update }) => (
      <>
        <GoalPreview draft={draft} />
        <ChoiceList
          name="goal"
          legend="Goal"
          hideLegend
          value={draft.goal}
          onChange={(goal) => update({ goal })}
          choices={[
            { value: 'lose', title: 'Lose fat', detail: 'Cut. Eat below maintenance, keep your muscle.' },
            { value: 'maintain', title: 'Maintain', detail: 'Hold your weight while you get stronger.' },
            { value: 'gain', title: 'Build muscle', detail: 'Bulk. Eat above maintenance to grow.' },
          ]}
        />
      </>
    ),
  },
  {
    id: 'food',
    title: 'Your food',
    lead: 'This shapes the meal plan. Change it whenever you like.',
    isComplete: () => true,
    render: ({ draft, update }) => {
      const setPrefs = (patch: Partial<Draft['prefs']>) => update({ prefs: { ...draft.prefs, ...patch } });
      const toggle = (tag: DietTag, on: boolean) =>
        setPrefs({ exclude: on ? [...draft.prefs.exclude, tag] : draft.prefs.exclude.filter((t) => t !== tag) });
      return (
        <>
          <ChoiceList
            name="budget"
            legend="Budget"
            value={draft.prefs.budget}
            onChange={(budget) => setPrefs({ budget })}
            choices={[
              { value: 1, title: 'Tipid', detail: 'Itlog, galunggong, tokwa, manok, monggo' },
              { value: 2, title: 'Sakto', detail: 'Adds bangus, tapa, baboy, fresh milk' },
              { value: 3, title: 'Sagana', detail: 'Adds baka, salmon, Greek yogurt' },
            ]}
          />
          <ChoiceList
            name="meals"
            legend="Meals a day"
            layout="cells"
            value={draft.prefs.mealsPerDay}
            onChange={(mealsPerDay) => setPrefs({ mealsPerDay })}
            choices={[
              { value: 3, title: '3', detail: 'No meryenda' },
              { value: 4, title: '4', detail: 'One meryenda' },
              { value: 5, title: '5', detail: 'Two meryenda' },
            ]}
          />
          <fieldset className={styles.chips}>
            <legend className="eyebrow">Leave out</legend>
            <div className={styles.chipRow}>
              {EXCLUSIONS.map(({ tag, label }) => (
                <CheckChip
                  key={tag}
                  id={`exclude-${tag}`}
                  label={label}
                  checked={draft.prefs.exclude.includes(tag)}
                  onChange={(on) => toggle(tag, on)}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.chips}>
            <legend className="eyebrow">Supplements</legend>
            <div className={styles.chipRow}>
              <CheckChip
                id="has-whey"
                label="I use whey protein"
                checked={draft.prefs.hasWhey}
                onChange={(hasWhey) => setPrefs({ hasWhey })}
              />
            </div>
          </fieldset>
        </>
      );
    },
  },
];
