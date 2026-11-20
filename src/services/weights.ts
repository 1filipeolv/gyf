import { orderBy } from 'firebase/firestore';
import { listDocs, listRecent, removeDoc, saveDoc } from './db';
import { BodyWeight } from '../types';

export const listWeights = (uid: string) =>
  listDocs<BodyWeight>(uid, 'bodyWeights', orderBy('date', 'asc'));

export const saveWeight = (uid: string, date: string, weightKg: number, bodyFatPct?: number, loggedAt?: number) =>
  saveDoc<BodyWeight>(uid, 'bodyWeights', {
    id: date,
    date,
    weightKg,
    ...(loggedAt ? { loggedAt } : {}),
    ...(bodyFatPct ? { bodyFatPct } : {}),
  });

export const removeWeight = (uid: string, id: string) => removeDoc(uid, 'bodyWeights', id);

export const getLatestWeightKg = async (uid: string): Promise<number | null> => {
  const list = await listRecent<BodyWeight>(uid, 'bodyWeights', 1, 'date');
  return list[0]?.weightKg ?? null;
};
