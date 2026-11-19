import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutExercise } from '../types';
import { useWorkout } from '../contexts/WorkoutContext';
import { MUSCLE_LABELS } from '../constants/muscles';
import { suggestProgression, weightStep, workSets } from '../utils/progression';
import { haptic } from '../utils/haptics';
import SetRow from './SetRow';
import { colors, radius, spacing } from '../theme';

type Props = { ex: WorkoutExercise; history?: WorkoutExercise[] };

export default function ExerciseCard({ ex, history }: Props) {
  const { addSet, removeExercise, applyToPending } = useWorkout();
  const bodyweight = ex.equipment === 'bodyweight';

  const previousSets = useMemo(() => (history?.[0] ? workSets(history[0]) : []), [history]);

  const suggestion = useMemo(
    () =>
      suggestProgression({
        history: history ?? [],
        repsMin: ex.targetRepsMin,
        repsMax: ex.targetRepsMax,
        equipment: ex.equipment,
      }),
    [history, ex.targetRepsMin, ex.targetRepsMax, ex.equipment]
  );

  const hasSuggestion = suggestion.action !== 'first';
  const planned = hasSuggestion
    ? { weightKg: suggestion.suggestedWeightKg, reps: suggestion.suggestedReps }
    : undefined;
  const pending = ex.sets.some((s) => !s.completed);

  const confirmRemove = () =>
    Alert.alert('Remover exercício', ex.exerciseName, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeExercise(ex.id) },
    ]);

  const apply = () => {
    if (!planned) return;
    haptic.medium();
    applyToPending(ex.id, planned.weightKg, planned.reps);
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{ex.exerciseName}</Text>
          <Text style={styles.muscle}>
            {MUSCLE_LABELS[ex.primaryMuscle]}
            {ex.targetRepsMin && ex.targetRepsMax ? ` · alvo ${ex.targetRepsMin}-${ex.targetRepsMax} reps` : ''}
          </Text>
        </View>
        <Pressable onPress={confirmRemove} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>
      <View style={[styles.tip, !hasSuggestion && styles.tipMuted]}>
        <Ionicons
          name={hasSuggestion ? 'trending-up' : 'information-circle-outline'}
          size={18}
          color={hasSuggestion ? colors.primary : colors.muted}
        />
        <Text style={styles.tipText}>{suggestion.reason}</Text>
        {hasSuggestion && pending && (
          <Pressable onPress={apply} style={styles.apply} hitSlop={6}>
            <Text style={styles.applyText}>Aplicar</Text>
          </Pressable>
        )}
      </View>
      {ex.sets.map((s, i) => (
        <SetRow
          key={s.id}
          exId={ex.id}
          set={s}
          index={i}
          previous={previousSets[i] ?? previousSets[previousSets.length - 1]}
          planned={planned}
          weightStep={weightStep(ex.equipment)}
          bodyweight={bodyweight}
        />
      ))}
      <Pressable onPress={() => addSet(ex.id)} style={styles.add}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addText}>Adicionar série</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  muscle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(124,92,255,0.12)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  tipMuted: { backgroundColor: colors.bg },
  tipText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 },
  apply: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: colors.text, fontWeight: '800' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
    marginTop: spacing.xs,
  },
  addText: { color: colors.primary, fontWeight: '600' },
});
