import { MuscleGroup } from '../types';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peito',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraço',
  quadriceps: 'Quadríceps',
  hamstrings: 'Posterior',
  glutes: 'Glúteos',
  calves: 'Panturrilha',
  abs: 'Abdômen',
  traps: 'Trapézio',
  full_body: 'Corpo todo',
};

export const MUSCLE_LIST = Object.keys(MUSCLE_LABELS) as MuscleGroup[];