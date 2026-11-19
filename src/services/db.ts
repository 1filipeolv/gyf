import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  QueryConstraint,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { NewDoc, Timestamped, UserProfile } from '../types';

export type CollectionName =
  | 'exercises'
  | 'routines'
  | 'workouts'
  | 'bodyWeights'
  | 'measurements'
  | 'progressPhotos'
  | 'analyses'
  | 'attendance'
  | 'activities'
  | 'dailyLogs';

export const userRef = (uid: string) => doc(db, 'users', uid);

export const colRef = (uid: string, name: CollectionName) => collection(db, 'users', uid, name);

export const newId = (uid: string, name: CollectionName) => doc(colRef(uid, name)).id;

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function saveProfile(uid: string, data: Partial<UserProfile>) {
  const now = Date.now();
  await setDoc(userRef(uid), { ...data, uid, updatedAt: now }, { merge: true });
}

export async function createProfile(uid: string, name: string, email: string) {
  const now = Date.now();
  const profile: UserProfile = {
    uid,
    name,
    email,
    goal: 'hypertrophy',
    experience: 'beginner',
    weightUnit: 'kg',
    restTimerDefaultSec: 90,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(userRef(uid), profile, { merge: true });
}

export async function getOne<T extends Timestamped>(
  uid: string,
  name: CollectionName,
  id: string
): Promise<T | null> {
  const snap = await getDoc(doc(db, 'users', uid, name, id));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as T) : null;
}

export async function listDocs<T extends Timestamped>(
  uid: string,
  name: CollectionName,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const snap = await getDocs(query(colRef(uid, name), ...constraints));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
}

export const listRecent = <T extends Timestamped>(
  uid: string,
  name: CollectionName,
  max: number,
  field = 'createdAt'
) => listDocs<T>(uid, name, orderBy(field, 'desc'), fbLimit(max));

export const listByDateRange = <T extends Timestamped>(
  uid: string,
  name: CollectionName,
  from: string,
  to: string
) => listDocs<T>(uid, name, where('date', '>=', from), where('date', '<=', to), orderBy('date', 'asc'));

export async function saveDoc<T extends Timestamped>(
  uid: string,
  name: CollectionName,
  data: NewDoc<T> & { id?: string; createdAt?: number }
): Promise<string> {
  const now = Date.now();
  const id = data.id ?? newId(uid, name);
  const { id: _omit, ...rest } = data;
  await setDoc(
    doc(db, 'users', uid, name, id),
    { ...rest, createdAt: data.createdAt ?? now, updatedAt: now },
    { merge: true }
  );
  return id;
}

export async function removeDoc(uid: string, name: CollectionName, id: string) {
  await deleteDoc(doc(db, 'users', uid, name, id));
}