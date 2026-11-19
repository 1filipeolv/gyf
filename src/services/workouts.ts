import { listRecent, removeDoc } from './db';
import { Workout } from '../types';

export const listWorkouts = (uid: string, max = 500) =>
  listRecent<Workout>(uid, 'workouts', max, 'startedAt');

export const removeWorkout = (uid: string, id: string) => removeDoc(uid, 'workouts', id);