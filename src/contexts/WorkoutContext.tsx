import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { getProfile, saveDoc } from '../services/db';
import { Equipment, Exercise, MuscleGroup, Routine, Workout, WorkoutExercise, WorkoutSet } from '../types';
import { DEFAULT_EXERCISES } from '../constants/exercises';
import { suggestedRestSec } from '../utils/rest';
import { cancelRestAlert, initNotifications, scheduleRestAlert } from '../utils/notify';
import { setVolume, uid } from '../utils/workout';
import { toDateKey } from '../utils/date';
import { listWorkouts } from '../services/workouts';
import { markPRs } from '../utils/stats';

export type ActiveWorkout = {
  name: string;
  routineId?: string;
  startedAt: number;
  exercises: WorkoutExercise[];
  lastDone?: { exId: string; setId: string; at: number };
};

export type ExerciseTarget = {
  equipment?: Equipment;
  repsMin?: number;
  repsMax?: number;
  restSec?: number;
};

type Ctx = {
  active: ActiveWorkout | null;
  restEndsAt: number | null;
  start: (name: string) => void;
  discard: () => void;
  finish: () => Promise<boolean>;
  addExercise: (name: string, muscle: MuscleGroup, exerciseId?: string, equipment?: Equipment) => void;
  startFromRoutine: (r: Routine, customExercises?: Exercise[]) => void;
  removeExercise: (exId: string) => void;
  addSet: (exId: string) => void;
  updateSet: (exId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  toggleSet: (exId: string, setId: string) => void;
  completeSet: (exId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  applyToPending: (exId: string, weightKg: number, reps: number) => void;
  removeSet: (exId: string, setId: string) => void;
  adjustRest: (delta: number) => void;
  skipRest: () => void;
};

const KEY = 'active_workout';
const WorkoutContext = createContext<Ctx>(null as unknown as Ctx);

const makeEx = (
  exerciseId: string,
  name: string,
  muscle: MuscleGroup,
  order: number,
  nSets = 1,
  target: ExerciseTarget = {}
): WorkoutExercise => ({
  id: uid(),
  exerciseId,
  exerciseName: name,
  primaryMuscle: muscle,
  order,
  ...(target.equipment ? { equipment: target.equipment } : {}),
  ...(target.repsMin ? { targetRepsMin: target.repsMin } : {}),
  ...(target.repsMax ? { targetRepsMax: target.repsMax } : {}),
  ...(target.restSec ? { targetRestSec: target.restSec } : {}),
  sets: Array.from(
    { length: nSets },
    (_, i): WorkoutSet => ({ id: uid(), order: i, type: 'normal', reps: 0, weightKg: 0, completed: false })
  ),
});

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restDefault, setRestDefault] = useState(90);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setActive(JSON.parse(v)))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (active) AsyncStorage.setItem(KEY, JSON.stringify(active));
    else AsyncStorage.removeItem(KEY);
  }, [active, ready]);

  useEffect(() => {
    if (active) initNotifications();
  }, [!!active]);

  useEffect(() => {
    if (restEndsAt) scheduleRestAlert(restEndsAt);
    else cancelRestAlert();
  }, [restEndsAt]);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid)
      .then((p) => p && setRestDefault(p.restTimerDefaultSec))
      .catch(() => {});
  }, [user]);

  const mapEx = (fn: (e: WorkoutExercise) => WorkoutExercise) =>
    setActive((a) => (a ? { ...a, exercises: a.exercises.map(fn) } : a));

  const start = (name: string) =>
    setActive({ name: name.trim() || 'Treino', startedAt: Date.now(), exercises: [] });

  const discard = () => {
    setActive(null);
    setRestEndsAt(null);
  };

  const addExercise = (name: string, muscle: MuscleGroup, exerciseId?: string, equipment?: Equipment) =>
    setActive((a) =>
      a
        ? {
            ...a,
            exercises: [
              ...a.exercises,
              makeEx(
                exerciseId ?? `custom_${name.trim().toLowerCase().replace(/\s+/g, '_')}`,
                name.trim(),
                muscle,
                a.exercises.length,
                1,
                { equipment }
              ),
            ],
          }
        : a
    );

  const startFromRoutine = (r: Routine, customExercises: Exercise[] = []) => {
    const lookup = new Map<string, Exercise>();
    [...DEFAULT_EXERCISES, ...customExercises].forEach((x) => lookup.set(x.id, x));
    setActive({
      name: r.name,
      routineId: r.id,
      startedAt: Date.now(),
      exercises: [...r.exercises]
        .sort((a, b) => a.order - b.order)
        .map((e, i) =>
          makeEx(e.exerciseId, e.exerciseName, e.primaryMuscle, i, e.targetSets, {
            equipment: lookup.get(e.exerciseId)?.equipment,
            repsMin: e.targetRepsMin,
            repsMax: e.targetRepsMax,
            restSec: e.restSec,
          })
        ),
    });
  };

  const removeExercise = (exId: string) =>
    setActive((a) => (a ? { ...a, exercises: a.exercises.filter((e) => e.id !== exId) } : a));

  const addSet = (exId: string) =>
    mapEx((e) => {
      if (e.id !== exId) return e;
      const last = e.sets[e.sets.length - 1];
      return {
        ...e,
        sets: [
          ...e.sets,
          {
            id: uid(),
            order: e.sets.length,
            type: 'normal',
            reps: last?.reps ?? 0,
            weightKg: last?.weightKg ?? 0,
            completed: false,
          },
        ],
      };
    });

  const updateSet = (exId: string, setId: string, patch: Partial<WorkoutSet>) =>
    mapEx((e) =>
      e.id !== exId ? e : { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
    );

  const restFor = (ex: WorkoutExercise) => {
    if (ex.targetRestSec) return ex.targetRestSec;
    if (restDefault !== 90) return restDefault;
    return suggestedRestSec(ex.exerciseName, ex.primaryMuscle, ex.equipment);
  };

  const markDone = (exId: string, setId: string, patch: Partial<WorkoutSet> = {}) => {
    const ex = active?.exercises.find((e) => e.id === exId);
    const s = ex?.sets.find((x) => x.id === setId);
    if (!active || !ex || !s) return;
    const now = Date.now();
    const prev = active.lastDone;
    const gap = prev ? Math.round((now - prev.at) / 1000) : 0;
    setActive((a) => {
      if (!a) return a;
      return {
        ...a,
        lastDone: { exId, setId, at: now },
        exercises: a.exercises.map((e) => ({
          ...e,
          sets: e.sets.map((x) => {
            if (e.id === exId && x.id === setId) return { ...x, ...patch, completed: true };
            if (prev && e.id === prev.exId && x.id === prev.setId && gap > 0 && gap <= 900) return { ...x, restSec: gap };
            return x;
          }),
        })),
      };
    });
    setRestEndsAt(now + restFor(ex) * 1000);
  };

  const toggleSet = (exId: string, setId: string) => {
    const s = active?.exercises.find((e) => e.id === exId)?.sets.find((x) => x.id === setId);
    if (!s) return;
    if (s.completed) {
      updateSet(exId, setId, { completed: false });
      setRestEndsAt(null);
    } else {
      markDone(exId, setId);
    }
  };

  const completeSet = (exId: string, setId: string, patch: Partial<WorkoutSet>) => markDone(exId, setId, patch);

  const applyToPending = (exId: string, weightKg: number, reps: number) =>
    mapEx((e) =>
      e.id !== exId
        ? e
        : { ...e, sets: e.sets.map((s) => (s.completed ? s : { ...s, weightKg, reps })) }
    );

  const removeSet = (exId: string, setId: string) =>
    mapEx((e) =>
      e.id !== exId ? e : { ...e, sets: e.sets.filter((s) => s.id !== setId).map((s, i) => ({ ...s, order: i })) }
    );

  const adjustRest = (delta: number) =>
    setRestEndsAt((r) => (r ? Math.max(Date.now() + 1000, Math.max(r, Date.now()) + delta * 1000) : r));

  const skipRest = () => setRestEndsAt(null);

  const finish = async () => {
    if (!active || !user) return false;
    const exercises = active.exercises
      .map((e, i) => ({
        ...e,
        order: i,
        sets: e.sets.filter((s) => s.completed).map((s, j) => ({ ...s, order: j })),
      }))
      .filter((e) => e.sets.length > 0)
      .map((e) => JSON.parse(JSON.stringify(e)) as WorkoutExercise);
    if (!exercises.length) return false;
    const prior = await listWorkouts(user.uid);
    const marked = markPRs(exercises, prior);
    const endedAt = Date.now();
    const allSets = marked.flatMap((e) => e.sets);
    const volume = allSets.reduce((acc, s) => acc + setVolume(s), 0);
    await saveDoc<Workout>(user.uid, 'workouts', {
      name: active.name,
      ...(active.routineId ? { routineId: active.routineId } : {}),
      date: toDateKey(new Date(active.startedAt)),
      startedAt: active.startedAt,
      endedAt,
      durationSec: Math.round((endedAt - active.startedAt) / 1000),
      exercises: marked,
      totalVolumeKg: Math.round(volume * 10) / 10,
      totalSets: allSets.filter((s) => s.type !== 'warmup').length,
    });
    discard();
    return true;
  };

  return (
    <WorkoutContext.Provider
      value={{
        active,
        restEndsAt,
        start,
        discard,
        finish,
        addExercise,
        startFromRoutine,
        removeExercise,
        addSet,
        updateSet,
        toggleSet,
        completeSet,
        applyToPending,
        removeSet,
        adjustRest,
        skipRest,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export const useWorkout = () => useContext(WorkoutContext);
