import { BodyWeight } from '../types';
import { fromDateKey } from './date';

const DAY = 86400000;

export type Pt = { x: number; y: number };

export const toPts = (list: BodyWeight[]): Pt[] =>
  list.map((w) => ({ x: fromDateKey(w.date).getTime(), y: w.weightKg }));

export function movingAvg(pts: Pt[], days = 7): Pt[] {
  return pts.map((p) => {
    const win = pts.filter((q) => q.x <= p.x && q.x > p.x - days * DAY);
    return { x: p.x, y: win.reduce((a, q) => a + q.y, 0) / win.length };
  });
}

export function weeklyRate(pts: Pt[], days = 28): number | null {
  if (!pts.length) return null;
  const end = pts[pts.length - 1].x;
  const win = pts.filter((p) => p.x >= end - days * DAY);
  if (win.length < 3 || win[win.length - 1].x - win[0].x < 7 * DAY) return null;
  const n = win.length;
  const mx = win.reduce((a, p) => a + p.x, 0) / n;
  const my = win.reduce((a, p) => a + p.y, 0) / n;
  const num = win.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const den = win.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  if (!den) return null;
  return (num / den) * 7 * DAY;
}