/**
 * Stick-figure demonstrations of the main movements.
 *
 * Each figure is two poses, start and end, drawn in a 120 by 100 box with the
 * floor at y = 94. A pose is a head position and a few polylines (arm, body,
 * and so on). The two poses must list the same lines with the same number of
 * points, because the drawing moves each point from one pose to the other.
 *
 * These show the shape of a movement, not the fine points of form. Exercises
 * with no good match get no figure, which is better than a misleading one.
 */

export type Point = [number, number];

export interface Pose {
  head: Point;
  /** Each line is a flat list of points: x1, y1, x2, y2, ... */
  lines: number[][];
}

export interface Figure {
  start: Pose;
  end: Pose;
  /** Lines whose last point holds the weight, such as the hand on a bar. */
  weightOn?: number[];
  /** Lines drawn thin, for cables. */
  thin?: number[];
  /** Fixed equipment, drawn behind the figure: each entry is a polyline. */
  fixtures?: number[][];
  /** False for hanging movements, where the feet are off the floor. */
  floor?: boolean;
}

const STANDING_BODY = [60, 30, 60, 56, 61, 75, 60, 93];
const STANDING_HEAD: Point = [60, 18];
const HINGED_BODY = [76, 47, 52, 57, 60, 75, 60, 93];
const HINGED_HEAD: Point = [87, 43];

/** A pose that does not move, for holds. */
const still = (pose: Pose): Pick<Figure, 'start' | 'end'> => ({ start: pose, end: pose });

export const FIGURES = {
  squat: {
    start: { head: STANDING_HEAD, lines: [[60, 30, 67, 38, 62, 29], STANDING_BODY] },
    end: { head: [66, 38], lines: [[61, 49, 69, 57, 63, 48], [61, 49, 46, 70, 65, 74, 60, 93]] },
    weightOn: [0],
  },
  hinge: {
    start: { head: STANDING_HEAD, lines: [[60, 30, 61, 44, 62, 57], STANDING_BODY] },
    end: { head: HINGED_HEAD, lines: [[76, 47, 76, 61, 74, 74], HINGED_BODY] },
    weightOn: [0],
  },
  lunge: {
    start: {
      head: [60, 20],
      lines: [[60, 32, 60, 46, 60, 59], [60, 32, 60, 58, 67, 76, 72, 93], [60, 58, 49, 75, 36, 92]],
    },
    end: {
      head: [60, 32],
      lines: [[60, 44, 60, 58, 60, 71], [60, 44, 60, 70, 77, 74, 72, 93], [60, 70, 50, 88, 36, 92]],
    },
    weightOn: [0],
  },
  benchPress: {
    start: { head: [28, 62], lines: [[38, 65, 39, 51, 39, 38], [38, 65, 70, 66, 86, 73, 88, 93]] },
    end: { head: [28, 62], lines: [[38, 65, 48, 72, 41, 59], [38, 65, 70, 66, 86, 73, 88, 93]] },
    weightOn: [0],
    fixtures: [[22, 70, 78, 70], [28, 70, 28, 93], [72, 70, 72, 93]],
  },
  pushUp: {
    start: { head: [33, 62], lines: [[45, 67, 45, 80, 44, 93], [45, 67, 76, 76, 92, 84, 106, 91]] },
    end: { head: [33, 80], lines: [[45, 85, 57, 88, 44, 93], [45, 85, 76, 86, 92, 88, 106, 91]] },
  },
  pikePushUp: {
    start: { head: [37, 80], lines: [[46, 74, 41, 83, 40, 93], [46, 74, 66, 58, 72, 75, 78, 93]] },
    end: { head: [34, 87], lines: [[44, 84, 53, 87, 40, 93], [44, 84, 66, 60, 72, 76, 78, 93]] },
  },
  overheadPress: {
    start: { head: STANDING_HEAD, lines: [[60, 30, 68, 40, 65, 27], STANDING_BODY] },
    end: { head: STANDING_HEAD, lines: [[60, 30, 62, 17, 61, 4], STANDING_BODY] },
    weightOn: [0],
  },
  bentRow: {
    start: { head: HINGED_HEAD, lines: [[76, 47, 76, 61, 75, 74], HINGED_BODY] },
    end: { head: HINGED_HEAD, lines: [[76, 47, 66, 40, 72, 54], HINGED_BODY] },
    weightOn: [0],
  },
  seatedRow: {
    start: {
      head: [50, 34],
      lines: [[50, 46, 63, 50, 76, 53], [50, 46, 48, 72, 68, 64, 86, 74], [104, 53, 76, 53]],
    },
    end: {
      head: [46, 34],
      lines: [[47, 46, 42, 58, 56, 56], [47, 46, 48, 72, 68, 64, 86, 74], [104, 53, 56, 56]],
    },
    weightOn: [0],
    thin: [2],
    fixtures: [[38, 77, 60, 77], [90, 66, 90, 84], [104, 40, 104, 93]],
  },
  pulldown: {
    start: {
      head: [56, 36],
      lines: [[58, 48, 62, 34, 62, 20], [58, 48, 58, 74, 76, 74, 76, 93], [62, 2, 62, 20]],
    },
    end: {
      head: [56, 36],
      lines: [[58, 48, 68, 58, 62, 45], [58, 48, 58, 74, 76, 74, 76, 93], [62, 2, 62, 45]],
    },
    weightOn: [0],
    thin: [2],
    fixtures: [[48, 79, 68, 79], [58, 79, 58, 93]],
  },
  pullUp: {
    start: { head: [54, 30], lines: [[60, 38, 60, 25, 60, 12], [60, 38, 60, 64, 62, 80, 54, 90]] },
    end: { head: [53, 9], lines: [[60, 22, 68, 28, 60, 12], [60, 22, 60, 48, 62, 64, 54, 74]] },
    fixtures: [[50, 12, 70, 12]],
    floor: false,
  },
  curl: {
    start: { head: STANDING_HEAD, lines: [[60, 30, 61, 44, 62, 57], STANDING_BODY] },
    end: { head: STANDING_HEAD, lines: [[60, 30, 61, 44, 69, 33], STANDING_BODY] },
    weightOn: [0],
  },
  pushdown: {
    start: { head: STANDING_HEAD, lines: [[60, 30, 62, 44, 72, 35], STANDING_BODY, [84, 4, 72, 35]] },
    end: { head: STANDING_HEAD, lines: [[60, 30, 62, 44, 64, 57], STANDING_BODY, [84, 4, 64, 57]] },
    weightOn: [0],
    thin: [2],
    fixtures: [[84, 4, 84, 93]],
  },
  // Seen from the front.
  lateralRaise: {
    start: {
      head: STANDING_HEAD,
      lines: [
        [50, 30, 48, 44, 48, 57],
        [70, 30, 72, 44, 72, 57],
        [50, 30, 70, 30],
        [60, 30, 60, 56],
        [60, 56, 55, 75, 53, 93],
        [60, 56, 65, 75, 67, 93],
      ],
    },
    end: {
      head: STANDING_HEAD,
      lines: [
        [50, 30, 37, 31, 24, 32],
        [70, 30, 83, 31, 96, 32],
        [50, 30, 70, 30],
        [60, 30, 60, 56],
        [60, 56, 55, 75, 53, 93],
        [60, 56, 65, 75, 67, 93],
      ],
    },
    weightOn: [0, 1],
  },
  // Seen from the front: arms sweep from wide open to together.
  fly: {
    start: {
      head: STANDING_HEAD,
      lines: [
        [50, 30, 37, 33, 24, 34],
        [70, 30, 83, 33, 96, 34],
        [50, 30, 70, 30],
        [60, 30, 60, 56],
        [60, 56, 55, 75, 53, 93],
        [60, 56, 65, 75, 67, 93],
      ],
    },
    end: {
      head: STANDING_HEAD,
      lines: [
        [50, 30, 49, 42, 57, 40],
        [70, 30, 71, 42, 63, 40],
        [50, 30, 70, 30],
        [60, 30, 60, 56],
        [60, 56, 55, 75, 53, 93],
        [60, 56, 65, 75, 67, 93],
      ],
    },
    weightOn: [0, 1],
  },
  legExtension: {
    start: { head: [46, 26], lines: [[48, 38, 52, 52, 56, 62], [48, 38, 48, 64, 68, 64, 70, 86]] },
    end: { head: [46, 26], lines: [[48, 38, 52, 52, 56, 62], [48, 38, 48, 64, 68, 64, 90, 62]] },
    weightOn: [1],
    fixtures: [[40, 69, 66, 69], [42, 34, 42, 69], [54, 69, 54, 93]],
  },
  legCurl: {
    start: { head: [46, 26], lines: [[48, 38, 52, 52, 56, 62], [48, 38, 48, 64, 68, 64, 90, 62]] },
    end: { head: [46, 26], lines: [[48, 38, 52, 52, 56, 62], [48, 38, 48, 64, 68, 64, 62, 85]] },
    weightOn: [1],
    fixtures: [[40, 69, 66, 69], [42, 34, 42, 69], [54, 69, 54, 93]],
  },
  bridge: {
    start: { head: [24, 87], lines: [[34, 89, 46, 91, 58, 92], [34, 89, 58, 89, 72, 73, 80, 93]] },
    end: { head: [24, 87], lines: [[34, 89, 46, 91, 58, 92], [34, 89, 57, 75, 75, 72, 80, 93]] },
  },
  hipThrust: {
    start: { head: [26, 56], lines: [[34, 64, 44, 74, 52, 80], [34, 64, 52, 84, 72, 72, 78, 93]] },
    end: { head: [24, 60], lines: [[34, 64, 46, 63, 56, 62], [34, 64, 56, 66, 76, 68, 78, 93]] },
    weightOn: [0],
    fixtures: [[18, 68, 40, 68], [18, 68, 18, 93], [40, 68, 40, 93]],
  },
  calfRaise: {
    start: {
      head: STANDING_HEAD,
      lines: [[60, 30, 61, 44, 62, 57], [60, 30, 60, 56, 60, 74, 58, 91], [58, 91, 68, 93]],
    },
    end: {
      head: [61, 12],
      lines: [[61, 24, 62, 38, 63, 51], [61, 24, 61, 50, 61, 68, 60, 84], [60, 84, 68, 93]],
    },
    weightOn: [0],
  },
  plank: still({ head: [30, 72], lines: [[40, 76, 41, 92, 54, 92], [40, 76, 72, 80, 90, 85, 106, 91]] }),
  wallSit: {
    ...still({ head: [45, 30], lines: [[44, 42, 50, 54, 58, 62], [44, 42, 44, 68, 64, 68, 64, 93]] }),
    fixtures: [[38, 8, 38, 93]],
  },
  legRaise: {
    start: { head: [22, 87], lines: [[32, 89, 44, 91, 54, 92], [32, 89, 62, 89, 82, 87, 100, 85]] },
    end: { head: [22, 87], lines: [[32, 89, 44, 91, 54, 92], [32, 89, 62, 89, 63, 70, 64, 52]] },
  },
  hangingKneeRaise: {
    start: { head: [54, 24], lines: [[60, 32, 60, 19, 60, 6], [60, 32, 60, 58, 61, 76, 60, 92]] },
    end: { head: [54, 24], lines: [[60, 32, 60, 19, 60, 6], [60, 32, 60, 58, 78, 54, 76, 72]] },
    fixtures: [[50, 6, 70, 6]],
    floor: false,
  },
} satisfies Record<string, Figure>;

export type FigureKey = keyof typeof FIGURES;

/** Which figure shows each exercise. `bare` hides the weight, for bodyweight versions. */
const FIGURE_FOR: Record<string, { figure: FigureKey; bare?: boolean }> = {
  'back-squat': { figure: 'squat' },
  'goblet-squat': { figure: 'squat' },
  'bw-squat': { figure: 'squat', bare: true },
  'romanian-deadlift': { figure: 'hinge' },
  deadlift: { figure: 'hinge' },
  'db-rdl': { figure: 'hinge' },
  'db-split-squat': { figure: 'lunge' },
  'walking-lunge': { figure: 'lunge' },
  'reverse-lunge': { figure: 'lunge', bare: true },
  'bench-press': { figure: 'benchPress' },
  'incline-db-press': { figure: 'benchPress' },
  'db-bench-press': { figure: 'benchPress' },
  'push-up': { figure: 'pushUp' },
  'wide-push-up': { figure: 'pushUp' },
  'pike-push-up': { figure: 'pikePushUp' },
  'overhead-press': { figure: 'overheadPress' },
  'db-shoulder-press': { figure: 'overheadPress' },
  'barbell-row': { figure: 'bentRow' },
  'db-row': { figure: 'bentRow' },
  'seated-cable-row': { figure: 'seatedRow' },
  'lat-pulldown': { figure: 'pulldown' },
  'pull-up': { figure: 'pullUp' },
  'chin-up': { figure: 'pullUp' },
  'pec-deck': { figure: 'fly' },
  'lateral-raise': { figure: 'lateralRaise' },
  'cable-lateral-raise': { figure: 'lateralRaise' },
  'db-curl': { figure: 'curl' },
  'hammer-curl': { figure: 'curl' },
  'cable-curl': { figure: 'curl' },
  'triceps-pushdown': { figure: 'pushdown' },
  'leg-extension': { figure: 'legExtension' },
  'leg-curl': { figure: 'legCurl' },
  'wall-sit': { figure: 'wallSit' },
  'hip-thrust': { figure: 'hipThrust' },
  'db-hip-thrust': { figure: 'hipThrust' },
  'glute-bridge': { figure: 'bridge' },
  'calf-raise-machine': { figure: 'calfRaise' },
  'db-calf-raise': { figure: 'calfRaise' },
  'single-leg-calf-raise': { figure: 'calfRaise', bare: true },
  plank: { figure: 'plank' },
  'hanging-knee-raise': { figure: 'hangingKneeRaise' },
  'lying-leg-raise': { figure: 'legRaise' },
};

export function figureFor(exerciseId: string): { figure: Figure; bare: boolean } | null {
  const entry = FIGURE_FOR[exerciseId];
  return entry ? { figure: FIGURES[entry.figure], bare: Boolean(entry.bare) } : null;
}
