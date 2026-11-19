import { orderBy } from 'firebase/firestore';
import { listDocs, removeDoc, saveDoc } from './db';
import { Equipment, Exercise, MuscleGroup } from '../types';

export type ExerciseDraft = {
  id?: string;
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment;
  createdAt?: number;
};

export const listCustomExercises = (uid: string) =>
  listDocs<Exercise>(uid, 'exercises', orderBy('name', 'asc'));

export const saveExercise = (uid: string, d: ExerciseDraft) =>
  saveDoc<Exercise>(uid, 'exercises', {
    id: d.id,
    createdAt: d.createdAt,
    name: d.name.trim(),
    primaryMuscle: d.primaryMuscle,
    secondaryMuscles: [],
    equipment: d.equipment,
    isCustom: true,
  });

export const removeExercise = (uid: string, id: string) => removeDoc(uid, 'exercises', id);