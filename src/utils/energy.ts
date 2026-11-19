import { CardioType } from '../types';

const RUN_POINTS: [number, number][] = [
  [6.4, 6],
  [8, 8.3],
  [9.7, 9.8],
  [11.3, 11],
  [12.9, 11.8],
  [14.5, 12.8],
  [16.1, 14.5],
];

const interp = (x: number, pts: [number, number][]) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
};

export const speedKmh = (durationMin: number, distanceKm?: number) =>
  distanceKm && distanceKm > 0 && durationMin > 0 ? distanceKm / (durationMin / 60) : null;

export function activityMet(type: CardioType, durationMin: number, distanceKm?: number): number {
  const v = speedKmh(durationMin, distanceKm);
  if (type === 'walk') {
    if (v === null) return 3.5;
    if (v < 3.2) return 2.8;
    if (v < 4.8) return 3.3;
    if (v < 5.6) return 3.8;
    if (v < 6.4) return 4.8;
    return 5.5;
  }
  if (type === 'run') return v === null ? 9 : interp(v, RUN_POINTS);
  if (type === 'bike') {
    if (v === null) return 7;
    if (v < 16) return 4;
    if (v < 19) return 6.8;
    if (v < 22) return 8;
    if (v < 26) return 10;
    return 12;
  }
  if (type === 'swim') {
    if (v === null) return 6.5;
    const per100 = 6 / v;
    if (per100 > 3) return 6;
    if (per100 > 2) return 7;
    return 8;
  }
  return 5;
};

export const estimateKcal = (type: CardioType, durationMin: number, distanceKm: number | undefined, weightKg: number) =>
  Math.round(activityMet(type, durationMin, distanceKm) * weightKg * (durationMin / 60));

export const WORKOUT_MET = 4;

export const workoutKcal = (durationSec: number, weightKg: number) =>
  Math.round(WORKOUT_MET * weightKg * (durationSec / 3600));

export const stepsKcal = (steps: number, weightKg: number) => Math.round(steps * 0.00043 * weightKg);

const mmss = (sec: number) => {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function paceText(type: CardioType, durationMin: number, distanceKm?: number): string | null {
  if (!distanceKm || distanceKm <= 0 || durationMin <= 0) return null;
  if (type === 'swim') return `${mmss((durationMin * 60) / (distanceKm * 10))} /100m`;
  if (type === 'bike') return `${(distanceKm / (durationMin / 60)).toFixed(1).replace('.', ',')} km/h`;
  return `${mmss((durationMin * 60) / distanceKm)} /km`;
}
