import { ExperienceLevel, Goal, Sex } from '../types';

export const GOAL_LABELS: Record<Goal, string> = {
  hypertrophy: 'Hipertrofia',
  fat_loss: 'Perda de gordura',
  recomposition: 'Recomposição',
  strength: 'Força',
  maintenance: 'Manutenção',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export const SEX_LABELS: Record<Sex, string> = {
  male: 'Masculino',
  female: 'Feminino',
};

export const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((key) => ({ key, label: labels[key] }));
