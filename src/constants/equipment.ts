import { Equipment } from '../types';

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Halteres',
  machine: 'Máquina',
  cable: 'Cabo',
  bodyweight: 'Peso corporal',
  smith: 'Smith',
  band: 'Elástico',
  other: 'Outro',
};

export const EQUIPMENT_LIST = Object.keys(EQUIPMENT_LABELS) as Equipment[];