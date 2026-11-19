import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDailyLog } from '../services/dailyLogs';
import { getLatestWeightKg } from '../services/weights';
import { replaceWaterReminders } from './notify';
import { toDateKey } from './date';

const KEY = 'water_settings';
const HORIZON_DAYS = 7;

export type WaterReminder = { on: boolean; from: number; to: number; every: number };
export type WaterSettings = { cupMl: number; goalMl: number | null; reminder: WaterReminder };

export const DEFAULT_WATER: WaterSettings = {
  cupMl: 250,
  goalMl: null,
  reminder: { on: false, from: 8, to: 20, every: 2 },
};

export async function loadWaterSettings(): Promise<WaterSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_WATER;
    const v = JSON.parse(raw) as Partial<WaterSettings>;
    return {
      cupMl: v.cupMl && v.cupMl > 0 ? v.cupMl : DEFAULT_WATER.cupMl,
      goalMl: v.goalMl && v.goalMl > 0 ? v.goalMl : null,
      reminder: { ...DEFAULT_WATER.reminder, ...(v.reminder ?? {}) },
    };
  } catch {
    return DEFAULT_WATER;
  }
}

export async function saveWaterSettings(s: WaterSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
}

export const suggestedGoalMl = (weightKg: number | null) =>
  weightKg ? Math.round((weightKg * 35) / 50) * 50 : 2500;

export const resolveGoalMl = (s: WaterSettings, weightKg: number | null) => s.goalMl ?? suggestedGoalMl(weightKg);

export function reminderTimes(r: WaterReminder, doneToday: boolean, now = new Date()): Date[] {
  const out: Date[] = [];
  if (!r.on || r.every < 1) return out;
  for (let d = 0; d < HORIZON_DAYS; d++) {
    if (d === 0 && doneToday) continue;
    for (let h = r.from; h <= r.to; h += r.every) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, 0, 0, 0);
      if (date.getTime() > now.getTime() + 60000) out.push(date);
    }
  }
  return out;
}

export async function refreshWaterReminders(uid: string, known?: { settings?: WaterSettings; waterMl?: number; weightKg?: number | null }) {
  const settings = known?.settings ?? (await loadWaterSettings());
  if (!settings.reminder.on) return replaceWaterReminders([]);
  const weightKg = known?.weightKg !== undefined ? known.weightKg : settings.goalMl ? null : await getLatestWeightKg(uid);
  const waterMl = known?.waterMl ?? (await getDailyLog(uid, toDateKey()))?.waterMl ?? 0;
  const goal = resolveGoalMl(settings, weightKg);
  return replaceWaterReminders(reminderTimes(settings.reminder, waterMl >= goal));
}
