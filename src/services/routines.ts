import { orderBy } from 'firebase/firestore';
import { listDocs, removeDoc, saveDoc } from './db';
import { NewDoc, Routine } from '../types';

export const listRoutines = (uid: string) => listDocs<Routine>(uid, 'routines', orderBy('name', 'asc'));

export const saveRoutine = (uid: string, data: NewDoc<Routine> & { id?: string; createdAt?: number }) =>
  saveDoc<Routine>(uid, 'routines', data);

export const removeRoutine = (uid: string, id: string) => removeDoc(uid, 'routines', id);