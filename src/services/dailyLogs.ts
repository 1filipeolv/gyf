import { getOne, listByDateRange, saveDoc } from './db';
import { DailyLog } from '../types';

export const getDailyLog = (uid: string, date: string) => getOne<DailyLog>(uid, 'dailyLogs', date);

export const listDailyLogs = (uid: string, from: string, to: string) =>
  listByDateRange<DailyLog>(uid, 'dailyLogs', from, to);

export type DailyLogPatch = { steps?: number; sleepHours?: number; sleepQuality?: number };

export const saveDailyLog = (uid: string, date: string, patch: DailyLogPatch) =>
  saveDoc<DailyLog>(uid, 'dailyLogs', {
    id: date,
    date,
    ...(patch.steps ? { steps: patch.steps } : {}),
    ...(patch.sleepHours ? { sleepHours: patch.sleepHours } : {}),
    ...(patch.sleepQuality ? { sleepQuality: patch.sleepQuality } : {}),
  });
