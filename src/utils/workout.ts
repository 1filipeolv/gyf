import { WorkoutSet } from '../types';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const parseNum = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const setVolume = (s: WorkoutSet) =>
  s.completed && s.type !== 'warmup' ? s.weightKg * s.reps : 0;