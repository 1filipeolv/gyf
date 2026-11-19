import { MuscleGroup, Workout, WorkoutExercise } from '../types';

export const est1RM = (w: number, r: number) => {
  if (w <= 0 || r <= 0) return 0;
  const rr = Math.min(r, 12);
  return rr === 1 ? w : w * (1 + rr / 30);
};

type Best = { weight: number; e1rm: number };

export function buildBests(workouts: Workout[]) {
  const m = new Map<string, Best>();
  workouts.forEach((w) =>
    w.exercises.forEach((e) =>
      e.sets.forEach((s) => {
        if (!s.completed || s.type === 'warmup') return;
        const b = m.get(e.exerciseId) ?? { weight: 0, e1rm: 0 };
        m.set(e.exerciseId, {
          weight: Math.max(b.weight, s.weightKg),
          e1rm: Math.max(b.e1rm, est1RM(s.weightKg, s.reps)),
        });
      })
    )
  );
  return m;
}

export function markPRs(exercises: WorkoutExercise[], prior: Workout[]): WorkoutExercise[] {
  const bests = buildBests(prior);
  return exercises.map((e) => {
    const prev = bests.get(e.exerciseId);
    let topIdx = -1;
    let topVal = 0;
    e.sets.forEach((s, i) => {
      if (!s.completed || s.type === 'warmup') return;
      const v = est1RM(s.weightKg, s.reps);
      if (v > topVal) {
        topVal = v;
        topIdx = i;
      }
    });
    return {
      ...e,
      sets: e.sets.map((s, i) => ({
        ...s,
        isPR:
          !!prev &&
          i === topIdx &&
          (topVal > prev.e1rm + 0.01 || s.weightKg > prev.weight),
      })),
    };
  });
}

export function periodStats(workouts: Workout[], from: string, to: string) {
  const list = workouts.filter((w) => w.date >= from && w.date <= to);
  return {
    count: list.length,
    volume: list.reduce((a, w) => a + w.totalVolumeKg, 0),
    sets: list.reduce((a, w) => a + w.totalSets, 0),
    durationSec: list.reduce((a, w) => a + w.durationSec, 0),
  };
}

export function setsByMuscle(workouts: Workout[], from: string) {
  const out: Partial<Record<MuscleGroup, number>> = {};
  workouts
    .filter((w) => w.date >= from)
    .forEach((w) =>
      w.exercises.forEach((e) => {
        const n = e.sets.filter((s) => s.completed && s.type !== 'warmup').length;
        out[e.primaryMuscle] = (out[e.primaryMuscle] ?? 0) + n;
      })
    );
  return out;
}

export const exerciseVolume = (e: WorkoutExercise) =>
  e.sets.reduce((a, s) => (s.completed && s.type !== 'warmup' ? a + s.weightKg * s.reps : a), 0);

export const countPRs = (w: Workout) =>
  w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.isPR).length, 0);

export const fmtKg = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')} t` : `${Math.round(v)} kg`;