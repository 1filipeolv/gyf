import { getOne, listByDateRange, saveDoc } from './db';
import { DailyLog } from '../types';

export const getDailyLog = (uid: string, date: string) => getOne<DailyLog>(uid, 'dailyLogs', date);

export const listDailyLogs = (uid: string, from: string, to: string) =>
  listByDateRange<DailyLog>(uid, 'dailyLogs', from, to);

export type DailyLogPatch = {
  steps?: number;
  sleepHours?: number;
  sleepQuality?: number;
  kcal?: number;
  proteinG?: number;
  carbG?: number;
  fatG?: number;
  foodNotes?: string;
};

const clean = (patch: DailyLogPatch) =>
  Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== '' && v !== 0)) as Partial<DailyLog>;

export const saveDailyLog = (uid: string, date: string, patch: DailyLogPatch) =>
  saveDoc<DailyLog>(uid, 'dailyLogs', { id: date, date, ...clean(patch) });

export const saveWater = (uid: string, date: string, waterMl: number) =>
  saveDoc<DailyLog>(uid, 'dailyLogs', { id: date, date, waterMl: Math.max(0, Math.round(waterMl)) });
