import { Analysis, Routine, Workout } from '../types';

export type TabParamList = {
  Workout: undefined;
  History: undefined;
  Progress: undefined;
  Analysis: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Routines: undefined;
  RoutineEdit: { routine?: Routine };
  Library: undefined;
  WorkoutDetail: { workout: Workout };
  Weight: undefined;
  Measurements: undefined;
  Photos: undefined;
  PhotoCompare: undefined;
  Backup: undefined;
  AnalysisHistory: undefined;
  AnalysisDetail: { analysis: Analysis };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};