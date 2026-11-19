import { listByDateRange, listRecent, removeDoc, saveDoc } from './db';
import { Activity, CardioType } from '../types';

export const listActivities = (uid: string, max = 300) => listRecent<Activity>(uid, 'activities', max, 'date');

export const listActivitiesRange = (uid: string, from: string, to: string) =>
  listByDateRange<Activity>(uid, 'activities', from, to);

export type ActivityInput = {
  id?: string;
  date: string;
  type: CardioType;
  durationMin: number;
  distanceKm?: number;
  avgHr?: number;
  kcal: number;
  kcalSource: 'estimated' | 'manual';
  notes?: string;
};

export const saveActivity = (uid: string, a: ActivityInput) =>
  saveDoc<Activity>(uid, 'activities', {
    ...(a.id ? { id: a.id } : {}),
    date: a.date,
    type: a.type,
    durationMin: a.durationMin,
    ...(a.distanceKm ? { distanceKm: a.distanceKm } : {}),
    ...(a.avgHr ? { avgHr: a.avgHr } : {}),
    kcal: a.kcal,
    kcalSource: a.kcalSource,
    ...(a.notes && a.notes.trim() ? { notes: a.notes.trim() } : {}),
  });

export const removeActivity = (uid: string, id: string) => removeDoc(uid, 'activities', id);
