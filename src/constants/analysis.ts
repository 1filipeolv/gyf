import { AnalysisRecommendation, NutritionGuidance, Priority, TrainingAdjustment } from '../types';

export const ACTION_LABELS: Record<TrainingAdjustment['action'], string> = {
  increase_volume: 'Aumentar volume',
  decrease_volume: 'Reduzir volume',
  maintain: 'Manter',
  change_frequency: 'Ajustar frequência',
  change_duration: 'Ajustar duração',
  deload: 'Fazer deload',
};

export const STRATEGY_LABELS: Record<NutritionGuidance['strategy'], string> = {
  surplus: 'Superávit calórico',
  deficit: 'Déficit calórico',
  maintenance: 'Manutenção',
};

export const CATEGORY_LABELS: Record<AnalysisRecommendation['category'], string> = {
  training: 'Treino',
  nutrition: 'Nutrição',
  recovery: 'Recuperação',
  tracking: 'Registro',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const DISCLAIMER =
  'Esta análise é gerada por IA com base nos seus registros e serve apenas como orientação geral. Não substitui avaliação de médico, nutricionista ou profissional de educação física.';
