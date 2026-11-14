import { useState } from 'react';
import { alternatives, searchExercises } from '@/domain/training/program';
import type { Equipment, Exercise, PlannedExercise, Workout } from '@/domain/training/types';
import styles from './ExercisePicker.module.css';

interface ExercisePickerProps {
  workout: Workout;
  planned: PlannedExercise;
  equipment: Equipment;
  onPick: (exerciseId: string) => void;
}

function OptionList({ options, onPick }: { options: Exercise[]; onPick: (id: string) => void }) {
  return (
    <ul className={styles.list}>
      {options.map((option) => (
        <li key={option.id}>
          <button type="button" className={styles.option} onClick={() => onPick(option.id)}>
            <span className={styles.optionName}>{option.name}</span>
            <span className={styles.optionDetail}>{option.muscles}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Choose a different exercise for a slot. Suggestions that train the same thing
 * come first. Below them, the whole catalog can be searched, because every gym
 * has different equipment and the person knows theirs.
 */
export function ExercisePicker({ workout, planned, equipment, onPick }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const suggested = alternatives(workout, planned, equipment);
  const searching = query.trim().length > 0;
  const results = searching || showAll ? searchExercises(workout, query) : [];

  return (
    <div className={styles.picker}>
      {suggested.length > 0 && (
        <section className={styles.group} aria-label="Suggested swaps">
          <p className="eyebrow">Trains the same thing</p>
          <OptionList options={suggested} onPick={onPick} />
        </section>
      )}

      <section className={styles.group} aria-label="All exercises">
        <label className="eyebrow" htmlFor="exercise-search">
          Or pick any exercise
        </label>
        <input
          id="exercise-search"
          className={styles.search}
          type="search"
          placeholder="Search by name or muscle"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {results.length > 0 && <OptionList options={results} onPick={onPick} />}
        {searching && results.length === 0 && <p className={styles.none}>Nothing matches “{query.trim()}”.</p>}
        {!searching && !showAll && (
          <button type="button" className={styles.showAll} onClick={() => setShowAll(true)}>
            Show the full list
          </button>
        )}
      </section>
    </div>
  );
}
