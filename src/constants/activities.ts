import { Ionicons } from '@expo/vector-icons';
import { ActivityType } from '../types';

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  strength: 'Musculação',
  run: 'Corrida',
  swim: 'Natação',
  walk: 'Caminhada',
  bike: 'Bicicleta',
  other: 'Outro',
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  strength: '#7C5CFF',
  run: '#FF9F0A',
  swim: '#0A84FF',
  walk: '#40C8E0',
  bike: '#FF375F',
  other: '#AEAEB2',
};

export const ACTIVITY_ICONS: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
  strength: 'barbell-outline',
  run: 'footsteps-outline',
  swim: 'water-outline',
  walk: 'walk-outline',
  bike: 'bicycle-outline',
  other: 'ellipsis-horizontal',
};

export const ACTIVITY_LIST = Object.keys(ACTIVITY_LABELS) as ActivityType[];
