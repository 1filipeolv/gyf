import { BodyWeight, Measurement } from '../types';
import { addDays, fromDateKey } from './date';

export const lastSunday = (today: string) => addDays(today, -fromDateKey(today).getDay());

export type CheckinState = {
  due: string;
  late: boolean;
  hasWeight: boolean;
  hasMeasure: boolean;
  done: boolean;
};

export function checkinState(weights: BodyWeight[], measurements: Measurement[], today: string): CheckinState {
  const hasAny = weights.length > 0 || measurements.length > 0;
  const due = hasAny ? lastSunday(today) : today;
  const hasWeight = weights.some((w) => w.date >= due && w.date <= today);
  const hasMeasure = measurements.some((m) => m.date >= due && m.date <= today && Object.keys(m.values).length > 0);
  return { due, late: today > due, hasWeight, hasMeasure, done: hasWeight && hasMeasure };
}

export const missingLabel = (s: CheckinState) =>
  [!s.hasWeight && 'peso', !s.hasMeasure && 'medidas'].filter(Boolean).join(' e ');
