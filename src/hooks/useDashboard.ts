import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/db';
import { listWorkouts } from '../services/workouts';
import { listWeights } from '../services/weights';
import { listMeasurements } from '../services/measurements';
import { listPhotos } from '../services/photos';
import { BodyWeight, Measurement, ProgressPhoto, UserProfile, Workout } from '../types';

export type DashData = {
  profile: UserProfile | null;
  workouts: Workout[];
  weights: BodyWeight[];
  measurements: Measurement[];
  photos: ProgressPhoto[];
};

const empty: DashData = { profile: null, workouts: [], weights: [], measurements: [], photos: [] };

export function useDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashData>(empty);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [profile, workouts, weights, measurements, photos] = await Promise.all([
        getProfile(user.uid),
        listWorkouts(user.uid),
        listWeights(user.uid),
        listMeasurements(user.uid),
        listPhotos(user.uid),
      ]);
      setData({ profile, workouts, weights, measurements, photos });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { ...data, loading, reload: load };
}