import { Analysis, Routine, Workout } from '../types';

export type TabParamList = {
  Workout: undefined;
  History: undefined;
  Progress: undefined;
  Analysis: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: { screen?: keyof TabParamList } | undefined;
  Routines: undefined;
  RoutineEdit: { routine?: Routine };
  Library: undefined;
  WorkoutDetail: { workout: Workout };
  Weight: undefined;
  Measurements: undefined;
  Photos: undefined;
  PhotoCompare: undefined;
  Backup: undefined;
  Calendar: undefined;
  Activities: undefined;
  DailyLog: undefined;
  Nutrition: undefined;
  Water: undefined;
  Balance: undefined;
  RealExpenditure: undefined;
  AnalysisHistory: undefined;
  AnalysisDetail: { analysis: Analysis };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};