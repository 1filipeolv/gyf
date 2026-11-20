import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { autoTargets, Overrides } from '../utils/balance';
import { Activity, BodyWeight, DailyLog, UserProfile, Workout } from '../types';
import { toDateKey } from '../utils/date';

type Data = { profile: UserProfile | null; weights: BodyWeight[]; workouts: Workout[]; activities: Activity[]; dailyLogs: DailyLog[] };

export function useTargets(d: Data) {
  const [over, setOver] = useState<Overrides>({});
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('energy_targets')
        .then((v) => setOver(v ? JSON.parse(v) : {}))
        .catch(() => {});
    }, [])
  );
  return useMemo(
    () => autoTargets(d, toDateKey(), over),
    [d.profile, d.weights, d.workouts, d.activities, d.dailyLogs, over]
  );
}
