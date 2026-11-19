import { deleteField, setDoc } from 'firebase/firestore';
import { userRef } from './db';
import { UserProfile } from '../types';

export async function updateProfile(uid: string, data: Partial<UserProfile>) {
  const payload: Record<string, unknown> = { uid, updatedAt: Date.now() };
  (Object.keys(data) as (keyof UserProfile)[]).forEach((k) => {
    payload[k] = data[k] === undefined ? deleteField() : data[k];
  });
  await setDoc(userRef(uid), payload, { merge: true });
}
