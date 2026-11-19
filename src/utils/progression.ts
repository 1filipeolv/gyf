import { Equipment, WorkoutExercise, WorkoutSet } from '../types';

export type ProgressionAction = 'first' | 'increase' | 'add_rep' | 'maintain' | 'decrease';

export type Progression = {
  action: ProgressionAction;
  suggestedWeightKg: number;
  suggestedReps: number;
  reason: string;
};

export const DEFAULT_REPS_MIN = 8;
export const DEFAULT_REPS_MAX = 12;

export const weightStep = (equipment?: Equipment): number => {
  if (equipment === 'dumbbell') return 2;
  if (equipment === 'machine' || equipment === 'cable') return 5;
  return 2.5;
};

const round05 = (n: number) => Math.round(n * 2) / 2;

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

export const workSets = (e: WorkoutExercise): WorkoutSet[] =>
  e.sets.filter((s) => s.completed && s.type !== 'warmup' && s.type !== 'dropset' && s.reps > 0);

type Session = { weight: number; reps: number[]; rpe: number[] };

const toSession = (e: WorkoutExercise): Session | null => {
  const sets = workSets(e);
  if (!sets.length) return null;
  const weight = Math.max(...sets.map((s) => s.weightKg));
  const top = sets.filter((s) => s.weightKg === weight);
  return {
    weight,
    reps: top.map((s) => s.reps),
    rpe: top.filter((s) => typeof s.rpe === 'number').map((s) => s.rpe as number),
  };
};

const repsText = (reps: number[]) =>
  reps.every((r) => r === reps[0]) ? `${reps.length}x${reps[0]}` : reps.join('/');

type Input = {
  history: WorkoutExercise[];
  repsMin?: number;
  repsMax?: number;
  equipment?: Equipment;
};

export function suggestProgression({ history, repsMin, repsMax, equipment }: Input): Progression {
  const min = repsMin && repsMin > 0 ? repsMin : DEFAULT_REPS_MIN;
  const max = repsMax && repsMax >= min ? repsMax : Math.max(min, DEFAULT_REPS_MAX);
  const sessions = history.map(toSession).filter((s): s is Session => s !== null);

  if (!sessions.length) {
    return {
      action: 'first',
      suggestedWeightKg: 0,
      suggestedReps: 0,
      reason: 'Primeiro treino deste exercício: registre para eu acompanhar.',
    };
  }

  const last = sessions[0];
  const prev = sessions[1];
  const lastMin = Math.min(...last.reps);
  const bodyweight = equipment === 'bodyweight' && last.weight === 0;
  const step = weightStep(equipment);
  const doneText = bodyweight
    ? `Você fez ${repsText(last.reps)}`
    : `Você fez ${repsText(last.reps)} em ${fmt(last.weight)} kg`;

  if (lastMin >= max) {
    if (bodyweight) {
      const reps = Math.max(...last.reps) + 1;
      return {
        action: 'add_rep',
        suggestedWeightKg: 0,
        suggestedReps: reps,
        reason: `${doneText}: tente ${reps} repetições hoje.`,
      };
    }
    const rpeAvg = last.rpe.length ? last.rpe.reduce((a, b) => a + b, 0) / last.rpe.length : null;
    const jump = rpeAvg !== null && rpeAvg <= 7 ? step * 2 : step;
    const next = round05(last.weight + jump);
    return {
      action: 'increase',
      suggestedWeightKg: next,
      suggestedReps: min,
      reason:
        jump > step
          ? `${doneText} com esforço leve: suba para ${fmt(next)} kg hoje.`
          : `${doneText}: tente ${fmt(next)} kg hoje.`,
    };
  }

  if (lastMin < min) {
    const prevMin = prev ? Math.min(...prev.reps) : null;
    if (prev && prevMin !== null && prevMin < min) {
      const reduced = Math.max(step, Math.round((last.weight * 0.9) / step) * step);
      if (bodyweight || last.weight === 0) {
        return {
          action: 'decrease',
          suggestedWeightKg: 0,
          suggestedReps: min,
          reason: `Abaixo de ${min} reps em 2 treinos seguidos: faça uma variação mais fácil ou um deload.`,
        };
      }
      return {
        action: 'decrease',
        suggestedWeightKg: round05(reduced),
        suggestedReps: min,
        reason: `Abaixo de ${min} reps em 2 treinos seguidos: reduza para ${fmt(round05(reduced))} kg ou faça um deload.`,
      };
    }
    return {
      action: 'maintain',
      suggestedWeightKg: last.weight,
      suggestedReps: min,
      reason: `${doneText}, abaixo da faixa de ${min}-${max}: mantenha a carga e busque ${min} repetições.`,
    };
  }

  const reps = Math.min(lastMin + 1, max);
  return {
    action: 'add_rep',
    suggestedWeightKg: last.weight,
    suggestedReps: reps,
    reason: bodyweight
      ? `${doneText}: tente ${reps} repetições hoje.`
      : `${doneText}: mantenha a carga e tente ${reps} repetições.`,
  };
}
