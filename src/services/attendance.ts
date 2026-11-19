import { listByDateRange, removeDoc, saveDoc } from './db';
import { ActivityType, Attendance } from '../types';

export const listAttendance = (uid: string, from: string, to: string) =>
  listByDateRange<Attendance>(uid, 'attendance', from, to);

export const saveAttendance = (uid: string, date: string, type: ActivityType, note?: string) =>
  saveDoc<Attendance>(uid, 'attendance', {
    id: date,
    date,
    type,
    ...(note && note.trim() ? { note: note.trim() } : {}),
  });

export const removeAttendance = (uid: string, date: string) => removeDoc(uid, 'attendance', date);
