import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listWorkouts } from '../services/workouts';
import { WorkoutExercise } from '../types';
import { workSets } from '../utils/progression';

export type ExerciseHistory = Map<string, WorkoutExercise[]>;

export function useExerciseHistory(enabled: boolean, key: number | undefined) {
  const { user } = useAuth();
  const [history, setHistory] = useState<ExerciseHistory>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !user) {
      setHistory(new Map());
      return;
    }
    let alive = true;
    setLoading(true);
    listWorkouts(user.uid)
      .then((list) => {
        if (!alive) return;
        const map: ExerciseHistory = new Map();
        [...list]
          .sort((a, b) => b.startedAt - a.startedAt)
          .forEach((w) =>
            w.exercises.forEach((e) => {
              if (!workSets(e).length) return;
              const arr = map.get(e.exerciseId) ?? [];
              arr.push(e);
              map.set(e.exerciseId, arr);
            })
          );
        setHistory(map);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [enabled, key, user]);

  return { history, loading };
}
