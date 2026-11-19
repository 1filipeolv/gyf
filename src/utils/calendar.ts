import { ActivityType, Attendance, Workout } from '../types';
import { addDays, fromDateKey, toDateKey } from './date';

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const WEEKDAY_SHORT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export const WEEKDAY_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export type MonthRef = { year: number; month: number };

export const currentMonth = (): MonthRef => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

export const shiftMonth = ({ year, month }: MonthRef, delta: number): MonthRef => {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

export const sameMonth = (a: MonthRef, b: MonthRef) => a.year === b.year && a.month === b.month;

const pad = (n: number) => String(n).padStart(2, '0');

export const monthStart = ({ year, month }: MonthRef) => `${year}-${pad(month)}-01`;

export const daysInMonth = ({ year, month }: MonthRef) => new Date(year, month, 0).getDate();

export const monthEnd = (m: MonthRef) => `${m.year}-${pad(m.month)}-${pad(daysInMonth(m))}`;

export const mondayOf = (key: string) => addDays(key, -((fromDateKey(key).getDay() + 6) % 7));

export function buildMonthGrid(m: MonthRef): (string | null)[][] {
  const lead = (new Date(m.year, m.month - 1, 1).getDay() + 6) % 7;
  const total = daysInMonth(m);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => `${m.year}-${pad(m.month)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export type DayInfo = {
  workouts: Workout[];
  attendance?: Attendance;
  types: ActivityType[];
};

export function buildDayMap(workouts: Workout[], attendance: Attendance[]) {
  const map = new Map<string, DayInfo>();
  const get = (date: string) => {
    const cur = map.get(date) ?? { workouts: [], types: [] };
    map.set(date, cur);
    return cur;
  };
  const addType = (d: DayInfo, t: ActivityType) => {
    if (!d.types.includes(t)) d.types.push(t);
  };
  workouts.forEach((w) => {
    const d = get(w.date);
    d.workouts.push(w);
    addType(d, 'strength');
  });
  attendance.forEach((a) => {
    const d = get(a.date);
    d.attendance = a;
    addType(d, a.type);
  });
  map.forEach((d) => d.workouts.sort((a, b) => a.startedAt - b.startedAt));
  return map;
}

export function monthStats(m: MonthRef, days: Map<string, DayInfo>, today: string) {
  const start = monthStart(m);
  const end = monthEnd(m);
  const keys = [...days.keys()].filter((k) => k >= start && k <= end);
  const workouts = keys.reduce((a, k) => a + (days.get(k)?.workouts.length ?? 0), 0);
  const activeDays = keys.length;
  const lastDay = today < start ? null : today > end ? end : today;
  const elapsed = lastDay ? Number(lastDay.split('-')[2]) : 0;
  const perWeek = elapsed > 0 ? Math.round((activeDays / (elapsed / 7)) * 10) / 10 : null;
  return { workouts, activeDays, perWeek };
}

export function streakDays(active: Set<string>, today: string) {
  let cursor = active.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (active.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function streakWeeksByDays(active: Set<string>, minPerWeek: number, today: string = toDateKey()) {
  const monday = mondayOf(today);
  let n = 0;
  for (let i = 0; i < 26; i++) {
    const start = addDays(monday, -7 * i);
    let count = 0;
    for (let d = 0; d < 7; d++) if (active.has(addDays(start, d))) count++;
    if (count >= minPerWeek) n++;
    else if (i === 0) continue;
    else break;
  }
  return n;
}
