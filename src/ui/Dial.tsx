import { fmtInt, fmtSigned } from '@/lib/format';
import styles from './Dial.module.css';

interface DialProps {
  /** Calories per day shown on the face. */
  calories: number;
  /** Target minus maintenance, in kcal. Moves the needle. */
  deltaKcal: number;
  /** Text under the number. */
  caption?: string;
  /** `width` sizes the dial from its column. `box` fills a positioned parent, whatever its shape. */
  fit?: 'width' | 'box';
}

// Geometry, in SVG units.
const CX = 160;
const CY = 178;
const FACE_RADIUS = 148;
const TICK_OUTER = 132;
const SWEEP = 100; // degrees either side of straight up
const MAX_DELTA = 750; // kcal at full sweep
const MINOR_STEP = 50;
const MAJOR_STEP = 250;

const toAngle = (kcal: number) => (Math.max(-MAX_DELTA, Math.min(MAX_DELTA, kcal)) / MAX_DELTA) * SWEEP;

/** A point on a circle around the hub. 0 degrees points up, positive turns clockwise. */
function polar(radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [CX + radius * Math.sin(radians), CY - radius * Math.cos(radians)];
}

function arc(radius: number, from: number, to: number): string {
  const [x1, y1] = polar(radius, from);
  const [x2, y2] = polar(radius, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
}

const TICKS = Array.from({ length: (MAX_DELTA * 2) / MINOR_STEP + 1 }, (_, i) => -MAX_DELTA + i * MINOR_STEP);

/**
 * The timbangan: a hanging-scale face whose needle shows how far the calorie
 * target sits below or above maintenance. Left is a cut, right is a bulk.
 */
export function Dial({ calories, deltaKcal, caption = 'kcal a day', fit = 'width' }: DialProps) {
  const angle = toAngle(deltaKcal);

  // The highlighted band runs from zero to the needle. The full arc has pathLength 200,
  // so one unit is one degree and zero sits at 100.
  const bandStart = 100 + Math.min(0, angle);
  const bandLength = Math.abs(angle);

  const direction = deltaKcal > 20 ? 'above' : deltaKcal < -20 ? 'below' : 'at';
  const label =
    direction === 'at'
      ? `Target ${fmtInt(calories)} kilocalories a day, at maintenance`
      : `Target ${fmtInt(calories)} kilocalories a day, ${fmtInt(Math.abs(deltaKcal))} ${direction} maintenance`;

  return (
    <svg className={fit === 'box' ? styles.box : styles.dial} viewBox="0 0 320 330" role="img" aria-label={label}>
      {/* Hook the scale hangs from */}
      <circle cx={CX} cy={13} r={8} className={styles.hook} />
      <rect x={CX - 5} y={20} width={10} height={12} className={styles.neck} />

      <circle cx={CX} cy={CY} r={FACE_RADIUS} className={styles.face} />

      <path
        d={arc(TICK_OUTER + 7, -SWEEP, SWEEP)}
        pathLength={200}
        className={styles.band}
        strokeDasharray={`0 ${bandStart} ${bandLength} 200`}
      />
      <path d={arc(TICK_OUTER, -SWEEP, SWEEP)} className={styles.rim} />

      {TICKS.map((kcal) => {
        const major = kcal % MAJOR_STEP === 0;
        const degrees = toAngle(kcal);
        const [x1, y1] = polar(TICK_OUTER, degrees);
        const [x2, y2] = polar(TICK_OUTER - (major ? 16 : 8), degrees);
        const isEnd = Math.abs(kcal) === MAX_DELTA;
        // The end words are wider than the numbers, so they sit further in.
        const [tx, ty] = polar(TICK_OUTER - (isEnd ? 42 : 31), degrees);
        return (
          <g key={kcal}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} className={major ? styles.major : styles.minor} />
            {major && (
              <text x={tx} y={ty} className={isEnd ? styles.zone : styles.tickLabel}>
                {kcal === -MAX_DELTA ? 'CUT' : kcal === MAX_DELTA ? 'BULK' : fmtSigned(kcal)}
              </text>
            )}
          </g>
        );
      })}

      <g className={styles.needle} style={{ transform: `rotate(${angle}deg)` }}>
        <polygon points={`${CX - 5},${CY + 20} ${CX + 5},${CY + 20} ${CX + 1.5},${CY - 116} ${CX - 1.5},${CY - 116}`} />
      </g>
      <circle cx={CX} cy={CY} r={11} className={styles.hub} />
      <circle cx={CX} cy={CY} r={3.5} className={styles.pin} />

      <text x={CX} y={CY + 84} className={styles.number}>
        {fmtInt(calories)}
      </text>
      <text x={CX} y={CY + 108} className={styles.caption}>
        {caption}
      </text>
    </svg>
  );
}
