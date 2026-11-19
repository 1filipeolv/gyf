import { Equipment, MuscleGroup } from '../types';

const ISOLATOR_MUSCLES: MuscleGroup[] = ['biceps', 'triceps', 'forearms', 'calves', 'abs'];
const ISOLATOR_NAME = /crucifixo|eleva[çc][ãa]o|rosca|extensora|flexora|peck|crossover|panturrilha|abdu|adu[çc]|face pull|pullover/i;

export const isIsolator = (name: string, muscle: MuscleGroup) =>
  ISOLATOR_MUSCLES.includes(muscle) || ISOLATOR_NAME.test(name);

export function suggestedRestSec(name: string, muscle: MuscleGroup, equipment?: Equipment): number {
  if (isIsolator(name, muscle)) return 75;
  const heavyLower = ['quadriceps', 'hamstrings', 'glutes', 'full_body'].includes(muscle);
  if ((equipment === 'barbell' || equipment === 'smith') && (heavyLower || muscle === 'back')) return 180;
  if (equipment === 'barbell' || equipment === 'smith') return 150;
  return 120;
}
