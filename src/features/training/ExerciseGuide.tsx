import type { Exercise } from '@/domain/training/types';
import { videoSearchUrl } from './copy';
import { ExerciseFigure, hasFigure } from './ExerciseFigure';
import styles from './ExerciseGuide.module.css';

interface ExerciseGuideProps {
  exercise: Exercise;
}

/**
 * Shows someone an exercise they may not know by name: a moving stick figure
 * where there is one, a short description, and a link to watch it done.
 */
export function ExerciseGuide({ exercise }: ExerciseGuideProps) {
  return (
    <div className={styles.guide}>
      {hasFigure(exercise) && (
        <div className={styles.stage}>
          <ExerciseFigure exercise={exercise} />
        </div>
      )}
      <p>{exercise.cue}</p>
      <a className={styles.video} href={videoSearchUrl(exercise)} target="_blank" rel="noreferrer">
        Watch it done on YouTube
        <span aria-hidden="true"> ↗</span>
      </a>
    </div>
  );
}
