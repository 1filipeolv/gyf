import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_EXERCISES } from '../constants/exercises';
import { listCustomExercises } from '../services/exercises';
import { Exercise } from '../types';

export function useExercises() {
  const { user } = useAuth();
  const [custom, setCustom] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      setCustom(await listCustomExercises(user.uid));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const all = useMemo(
    () => [...DEFAULT_EXERCISES, ...custom].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [custom]
  );

  return { all, custom, loading, reload };
}