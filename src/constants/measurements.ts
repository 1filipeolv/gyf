import { MeasurementSite } from '../types';

export const SITE_LABELS: Record<MeasurementSite, string> = {
  neck: 'Pescoço',
  shoulders: 'Ombros',
  chest: 'Peito',
  waist: 'Cintura',
  abdomen: 'Abdômen',
  hips: 'Quadril',
  glutes: 'Glúteo',
  bicepLeft: 'Bíceps esq.',
  bicepRight: 'Bíceps dir.',
  forearmLeft: 'Antebraço esq.',
  forearmRight: 'Antebraço dir.',
  thighLeft: 'Coxa esq.',
  thighRight: 'Coxa dir.',
  calfLeft: 'Panturrilha esq.',
  calfRight: 'Panturrilha dir.',
};

export const SITE_LIST = Object.keys(SITE_LABELS) as MeasurementSite[];