import { Activity, BodyWeight, DailyLog, UserProfile, Workout } from '../types';
import { addDays, fromDateKey } from './date';
import {
  ageFromBirth,
  bmrMifflin,
  coveredSteps,
  KCAL_PER_KG,
  stepsKcal,
  uncertaintyBand,
  workoutKcal,
} from './energy';
import { movingAvg, toPts, weeklyRate } from './trend';

export type EnergyInputs = {
  profile: UserProfile | null;
  weights: BodyWeight[];
  workouts: Workout[];
  activities: Activity[];
  dailyLogs: DailyLog[];
};

export type ProfileBasics = { sex: 'male' | 'female'; birthDate: string; heightCm: number };

export function profileBasics(p: UserProfile | null): ProfileBasics | null {
  if (!p?.sex || !p.birthDate || !p.heightCm) return null;
  return { sex: p.sex, birthDate: p.birthDate, heightCm: p.heightCm };
}

export function missingProfile(p: UserProfile | null, hasWeight: boolean): string[] {
  const out: string[] = [];
  if (!p?.sex) out.push('sexo');
  if (!p?.birthDate) out.push('data de nascimento');
  if (!p?.heightCm) out.push('altura');
  if (!hasWeight) out.push('peso (registre na tela Peso)');
  return out;
}

export function weightOn(weights: BodyWeight[], date: string): number | null {
  if (!weights.length) return null;
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  let found: BodyWeight | undefined;
  for (const w of sorted) if (w.date <= date) found = w;
  return (found ?? sorted[0]).weightKg;
}

export type DayEnergy = {
  date: string;
  weightKg: number;
  bmr: number;
  workout: number;
  activity: number;
  steps: number;
  stepsCounted: number;
  total: number;
  intake: number | null;
  balance: number | null;
  band: number;
};

export function dayEnergy(date: string, inp: EnergyInputs): DayEnergy | null {
  const basics = profileBasics(inp.profile);
  const weightKg = weightOn(inp.weights, date);
  if (!basics || !weightKg) return null;
  const age = ageFromBirth(basics.birthDate, fromDateKey(date));
  const bmr = bmrMifflin(basics.sex, age, basics.heightCm, weightKg);
  const workout = inp.workouts
    .filter((w) => w.date === date)
    .reduce((a, w) => a + workoutKcal(w.durationSec, weightKg), 0);
  const acts = inp.activities.filter((a) => a.date === date);
  const activity = acts.reduce((a, x) => a + x.kcal, 0);
  const log = inp.dailyLogs.find((l) => l.date === date);
  const steps = log?.steps ?? 0;
  const covered = acts.reduce((a, x) => a + coveredSteps(x.type, x.durationMin, x.distanceKm), 0);
  const stepsCounted = Math.max(0, steps - covered);
  const stepsK = stepsCounted > 0 ? stepsKcal(stepsCounted, weightKg) : 0;
  const total = bmr + workout + activity + stepsK;
  const intake = log?.kcal ?? null;
  return {
    date,
    weightKg,
    bmr,
    workout,
    activity,
    steps: stepsK,
    stepsCounted,
    total,
    intake,
    balance: intake === null ? null : intake - total,
    band: uncertaintyBand(total, intake),
  };
}

export function lastDays(today: string, n: number, inp: EnergyInputs): DayEnergy[] {
  const out: DayEnergy[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const e = dayEnergy(addDays(today, -i), inp);
    if (e) out.push(e);
  }
  return out;
}

export const MIN_FOOD_PCT = 0.7;
export const MIN_WEIGHINS = 8;
export const MIN_SPAN_DAYS = 14;

export type LearnedTdee = {
  tdee: number;
  confidence: 'medium' | 'high';
  avgIntake: number;
  slopeKgPerWeek: number;
  foodDays: number;
  weighIns: number;
  windowDays: number;
};

export type TdeeResult =
  | { ok: true; value: LearnedTdee; foodDays: number; weighIns: number }
  | { ok: false; reason: string; foodDays: number; weighIns: number };

export function learnedTdee(weights: BodyWeight[], logs: DailyLog[], end: string, windowDays = 28): TdeeResult {
  const from = addDays(end, -(windowDays - 1));
  const win = weights.filter((w) => w.date >= from && w.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const food = logs.filter((l) => l.date >= from && l.date <= end && l.kcal);
  const foodDays = food.length;
  const weighIns = win.length;
  const need = Math.ceil(windowDays * MIN_FOOD_PCT);
  if (foodDays < need) {
    return { ok: false, reason: `Faltam dias com alimentação registrada (${foodDays} de ${need} necessários em ${windowDays} dias).`, foodDays, weighIns };
  }
  if (weighIns < MIN_WEIGHINS) {
    return { ok: false, reason: `Faltam pesagens (${weighIns} de ${MIN_WEIGHINS} necessárias em ${windowDays} dias).`, foodDays, weighIns };
  }
  const span = (fromDateKey(win[win.length - 1].date).getTime() - fromDateKey(win[0].date).getTime()) / 86400000;
  if (span < MIN_SPAN_DAYS) {
    return { ok: false, reason: `As pesagens cobrem só ${Math.round(span)} dias (mínimo ${MIN_SPAN_DAYS}).`, foodDays, weighIns };
  }
  const rate = weeklyRate(movingAvg(toPts(win), 7), windowDays);
  if (rate === null) return { ok: false, reason: 'Tendência de peso indisponível.', foodDays, weighIns };
  const avgIntake = food.reduce((a, l) => a + (l.kcal as number), 0) / foodDays;
  const tdee = avgIntake - (rate / 7) * KCAL_PER_KG;
  if (tdee < 1000 || tdee > 6000) {
    return { ok: false, reason: 'Os dados ficaram inconsistentes (confira peso e alimentação).', foodDays, weighIns };
  }
  const confidence = foodDays / windowDays >= 0.85 && weighIns >= 14 ? 'high' : 'medium';
  return {
    ok: true,
    foodDays,
    weighIns,
    value: {
      tdee: Math.round(tdee),
      confidence,
      avgIntake: Math.round(avgIntake),
      slopeKgPerWeek: Math.round(rate * 100) / 100,
      foodDays,
      weighIns,
      windowDays,
    },
  };
}

export type TdeePoint = { date: string; tdee: number; confidence: 'medium' | 'high' };

export function tdeeSeries(weights: BodyWeight[], logs: DailyLog[], today: string, weeks = 8): TdeePoint[] {
  const out: TdeePoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = addDays(today, -7 * i);
    const r = learnedTdee(weights, logs, end);
    if (r.ok) out.push({ date: end, tdee: r.value.tdee, confidence: r.value.confidence });
  }
  return out;
}
