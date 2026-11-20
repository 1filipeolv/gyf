import { DailyLog } from '../types';
import { addDays, fromDateKey, toDateKey } from './date';

export type FoodStatus = 'pending' | 'ok' | 'over';
export const OVER_TOLERANCE = 0.05;

export type FoodDay = { date: string; kcal: number | null; status: FoodStatus; late: boolean; delta: number | null };

export function foodDay(log: DailyLog | undefined, date: string, target: number | null): FoodDay {
  const kcal = log?.kcal ?? null;
  const late = kcal !== null && !!log?.foodLoggedAt && toDateKey(new Date(log.foodLoggedAt)) > date;
  const status: FoodStatus = kcal === null ? 'pending' : target && kcal > target * (1 + OVER_TOLERANCE) ? 'over' : 'ok';
  return { date, kcal, status, late, delta: kcal !== null && target ? Math.round(kcal - target) : null };
}

export const weekStartKey = (today: string) => {
  const dow = fromDateKey(today).getDay();
  return addDays(today, -((dow + 6) % 7));
};

export const monthStartKey = (today: string) => today.slice(0, 8) + '01';

export type PeriodBalance = { saldo: number; excess: number; logged: number; pendingPast: number };

export function periodBalance(logs: DailyLog[], from: string, to: string, target: number | null): PeriodBalance {
  const out: PeriodBalance = { saldo: 0, excess: 0, logged: 0, pendingPast: 0 };
  const today = toDateKey();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const fd = foodDay(logs.find((l) => l.date === d), d, target);
    if (fd.kcal === null) {
      if (d < today) out.pendingPast++;
      continue;
    }
    out.logged++;
    if (fd.delta !== null) {
      out.saldo += fd.delta;
      if (fd.delta > 0) out.excess += fd.delta;
    }
  }
  return out;
}
