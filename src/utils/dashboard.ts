import { BodyWeight, Measurement, Workout } from '../types';
import { addDays, fromDateKey, toDateKey } from './date';
import { movingAvg, toPts, weeklyRate } from './trend';

export function weeklyVolume(workouts: Workout[], weeks = 8) {
  const today = fromDateKey(toDateKey());
  const dow = (today.getDay() + 6) % 7;
  const monday = addDays(toDateKey(today), -dow);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(monday, -7 * (weeks - 1 - i));
    const end = addDays(start, 6);
    const list = workouts.filter((w) => w.date >= start && w.date <= end);
    const [, m, d] = start.split('-');
    return {
      label: `${d}/${m}`,
      value: list.reduce((a, w) => a + w.totalVolumeKg, 0),
      count: list.length,
    };
  });
}

export function streakWeeks(workouts: Workout[], minPerWeek: number) {
  const weeks = weeklyVolume(workouts, 26).reverse();
  let n = 0;
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].count >= minPerWeek) n++;
    else if (i === 0) continue;
    else break;
  }
  return n;
}

export function weightSummary(weights: BodyWeight[]) {
  if (!weights.length) return null;
  const pts = toPts(weights);
  const avg = movingAvg(pts);
  const rate = weeklyRate(avg);
  const last = avg[avg.length - 1].y;
  const cutoff = pts[pts.length - 1].x - 30 * 86400000;
  const baseIdx = pts.findIndex((p) => p.x >= cutoff);
  const base = avg[baseIdx >= 0 ? baseIdx : 0].y;
  return { current: weights[weights.length - 1].weightKg, avg: last, rate, change30: last - base };
}

export function measurementDeltas(list: Measurement[]) {
  if (list.length < 2) return [];
  const sites = new Set<string>();
  list.forEach((m) => Object.keys(m.values).forEach((k) => sites.add(k)));
  const out: { site: string; first: number; last: number; diff: number }[] = [];
  sites.forEach((s) => {
    const pts = list.filter((m) => m.values[s as keyof Measurement['values']]);
    if (pts.length < 2) return;
    const first = pts[0].values[s as keyof Measurement['values']] as number;
    const last = pts[pts.length - 1].values[s as keyof Measurement['values']] as number;
    out.push({ site: s, first, last, diff: last - first });
  });
  return out.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}