import { createContext, useContext } from 'react';
import type { Exercise } from '@/domain/training/types';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import styles from './ExerciseFigure.module.css';
import { figureFor, type Figure, type Pose } from './figures';

interface ExerciseFigureProps {
  exercise: Exercise;
}

/** One full repetition, in seconds: move, pause, return, pause. */
const CYCLE = '2.8s';
const KEY_TIMES = '0;0.38;0.5;0.88;1';
const EASING = '0.4 0 0.2 1;0 0 1 1;0.4 0 0.2 1;0 0 1 1';

const points = (line: number[]) => line.join(' ');
const lastPoint = (line: number[]) => [line[line.length - 2] ?? 0, line[line.length - 1] ?? 0] as const;

/** `start;end;end;start;start`, the values a looping animation steps through. */
const loop = (start: string | number, end: string | number) => `${start};${end};${end};${start};${start}`;

/** True when the figure should hold still, for people who ask their device for less motion. */
const StillContext = createContext(false);

function Animate({ attribute, from, to }: { attribute: string; from: string | number; to: string | number }) {
  const still = useContext(StillContext);
  if (still || from === to) return null;
  return (
    <animate
      attributeName={attribute}
      values={loop(from, to)}
      keyTimes={KEY_TIMES}
      calcMode="spline"
      keySplines={EASING}
      dur={CYCLE}
      repeatCount="indefinite"
    />
  );
}

/** A single still pose, used as the faint "where it starts" outline. */
function Ghost({ pose }: { pose: Pose }) {
  return (
    <g className={styles.ghost}>
      {pose.lines.map((line, index) => (
        <polyline key={index} points={points(line)} />
      ))}
      <circle cx={pose.head[0]} cy={pose.head[1]} r={6.5} />
    </g>
  );
}

function Drawing({ figure, bare }: { figure: Figure; bare: boolean }) {
  const { start, end } = figure;
  const moves = JSON.stringify(start) !== JSON.stringify(end);
  const thin = new Set(figure.thin ?? []);

  return (
    <>
      {figure.floor !== false && <line x1={6} y1={95.5} x2={114} y2={95.5} className={styles.floor} />}
      {figure.fixtures?.map((fixture, index) => (
        <polyline key={index} points={points(fixture)} className={styles.fixture} />
      ))}

      {/* The start pose stays as a faint outline, so the range of the movement shows even when paused. */}
      {moves && <Ghost pose={start} />}

      <g className={styles.body}>
        {start.lines.map((line, index) => (
          <polyline key={index} points={points(end.lines[index]!)} className={thin.has(index) ? styles.cable : undefined}>
            <Animate attribute="points" from={points(line)} to={points(end.lines[index]!)} />
          </polyline>
        ))}
        <circle cx={end.head[0]} cy={end.head[1]} r={6.5} className={styles.head}>
          <Animate attribute="cx" from={start.head[0]} to={end.head[0]} />
          <Animate attribute="cy" from={start.head[1]} to={end.head[1]} />
        </circle>
      </g>

      {!bare &&
        figure.weightOn?.map((lineIndex) => {
          const from = lastPoint(start.lines[lineIndex]!);
          const to = lastPoint(end.lines[lineIndex]!);
          return (
            <circle key={lineIndex} cx={to[0]} cy={to[1]} r={5.5} className={styles.weight}>
              <Animate attribute="cx" from={from[0]} to={to[0]} />
              <Animate attribute="cy" from={from[1]} to={to[1]} />
            </circle>
          );
        })}
    </>
  );
}

/**
 * A looping stick-figure demonstration of an exercise, for people who do not
 * know it by name. Renders nothing when the exercise has no figure.
 */
export function ExerciseFigure({ exercise }: ExerciseFigureProps) {
  const still = usePrefersReducedMotion();
  const match = figureFor(exercise.id);
  if (!match) return null;

  return (
    <svg
      className={styles.figure}
      viewBox="0 -8 120 108"
      role="img"
      aria-label={`Stick figure showing the ${exercise.name} movement`}
    >
      <StillContext.Provider value={still}>
        <Drawing figure={match.figure} bare={match.bare} />
      </StillContext.Provider>
    </svg>
  );
}

export function hasFigure(exercise: Exercise): boolean {
  return figureFor(exercise.id) !== null;
}
