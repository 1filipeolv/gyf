export type Goal = 'hypertrophy' | 'fat_loss' | 'recomposition' | 'strength' | 'maintenance';
export type Sex = 'male' | 'female';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type WeightUnit = 'kg' | 'lb';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'traps'
  | 'full_body';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'smith'
  | 'band'
  | 'other';

export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export type PhotoAngle = 'front' | 'side' | 'back';

export type MeasurementSite =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'abdomen'
  | 'hips'
  | 'glutes'
  | 'bicepLeft'
  | 'bicepRight'
  | 'forearmLeft'
  | 'forearmRight'
  | 'thighLeft'
  | 'thighRight'
  | 'calfLeft'
  | 'calfRight';

export type Priority = 'high' | 'medium' | 'low';

export type Timestamped = {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  sex?: Sex;
  birthDate?: string;
  heightCm?: number;
  goal: Goal;
  experience: ExperienceLevel;
  weightUnit: WeightUnit;
  weeklyFrequencyTarget?: number;
  targetWeightKg?: number;
  restTimerDefaultSec: number;
  createdAt: number;
  updatedAt: number;
};

export type Exercise = Timestamped & {
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  isCustom: boolean;
  notes?: string;
};

export type WorkoutSet = {
  id: string;
  order: number;
  type: SetType;
  reps: number;
  weightKg: number;
  rpe?: number;
  restSec?: number;
  completed: boolean;
  isPR?: boolean;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  order: number;
  sets: WorkoutSet[];
  notes?: string;
};

export type Workout = Timestamped & {
  name: string;
  routineId?: string;
  date: string;
  startedAt: number;
  endedAt?: number;
  durationSec: number;
  exercises: WorkoutExercise[];
  totalVolumeKg: number;
  totalSets: number;
  notes?: string;
  perceivedFatigue?: number;
};

export type RoutineExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSec?: number;
};

export type Routine = Timestamped & {
  name: string;
  exercises: RoutineExercise[];
  weekdays?: number[];
};

export type BodyWeight = Timestamped & {
  date: string;
  weightKg: number;
  bodyFatPct?: number;
  notes?: string;
};

export type Measurement = Timestamped & {
  date: string;
  values: Partial<Record<MeasurementSite, number>>;
  notes?: string;
};

export type ProgressPhoto = Timestamped & {
  date: string;
  angle: PhotoAngle;
  storagePath: string;
  url: string;
  weightKg?: number;
  notes?: string;
};

export type AnalysisFinding = {
  title: string;
  detail: string;
  evidence: string;
};

export type AnalysisRecommendation = {
  title: string;
  detail: string;
  priority: Priority;
  category: 'training' | 'nutrition' | 'recovery' | 'tracking';
  evidence: string;
};

export type NutritionGuidance = {
  calorieTargetKcal?: number;
  proteinGPerKg?: number;
  proteinTotalG?: number;
  fatGPerKg?: number;
  carbsNote?: string;
  strategy: 'surplus' | 'deficit' | 'maintenance';
  rationale: string;
};

export type TrainingAdjustment = {
  muscle?: MuscleGroup;
  action: 'increase_volume' | 'decrease_volume' | 'maintain' | 'change_frequency' | 'change_duration' | 'deload';
  detail: string;
  evidence: string;
};

export type AnalysisInputSummary = {
  periodStart: string;
  periodEnd: string;
  workoutsCount: number;
  weightEntries: number;
  measurementEntries: number;
  photoIds: string[];
};

export type Analysis = Timestamped & {
  model: string;
  goal: Goal;
  input: AnalysisInputSummary;
  summary: string;
  strengths: AnalysisFinding[];
  weaknesses: AnalysisFinding[];
  recommendations: AnalysisRecommendation[];
  trainingAdjustments: TrainingAdjustment[];
  nutrition: NutritionGuidance;
  disclaimer: string;
};

export type NewDoc<T extends Timestamped> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;