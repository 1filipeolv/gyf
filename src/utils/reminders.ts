import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureNotificationPermission, scheduleCheckinReminder, scheduleFoodReminder } from './notify';

export const FOOD_REMINDER_KEY = 'food_reminder_hour';
export const DEFAULT_FOOD_HOUR = 21;

export async function readFoodReminder(): Promise<number | null> {
  const v = await AsyncStorage.getItem(FOOD_REMINDER_KEY).catch(() => null);
  if (v === 'off') return null;
  const n = Number(v);
  return v && n >= 0 && n <= 23 ? n : DEFAULT_FOOD_HOUR;
}

// Lembretes padrão: só os obrigatórios (check-in de domingo e kcal do dia). Os demais ficam desligados.
export async function initDefaultReminders() {
  if (!(await ensureNotificationPermission())) return;
  await scheduleCheckinReminder();
  const h = await readFoodReminder();
  if (h !== null) await scheduleFoodReminder(h);
}
