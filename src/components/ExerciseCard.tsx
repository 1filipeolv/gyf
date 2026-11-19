import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutExercise } from '../types';
import { useWorkout } from '../contexts/WorkoutContext';
import { MUSCLE_LABELS } from '../constants/muscles';
import SetRow from './SetRow';
import { colors, radius, spacing } from '../theme';

export default function ExerciseCard({ ex }: { ex: WorkoutExercise }) {
  const { addSet, removeExercise } = useWorkout();

  const confirmRemove = () =>
    Alert.alert('Remover exercício', ex.exerciseName, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeExercise(ex.id) },
    ]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{ex.exerciseName}</Text>
          <Text style={styles.muscle}>{MUSCLE_LABELS[ex.primaryMuscle]}</Text>
        </View>
        <Pressable onPress={confirmRemove} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>
      <View style={styles.cols}>
        <Text style={[styles.colLabel, { width: 22 }]}>#</Text>
        <Text style={styles.colLabel}>KG</Text>
        <Text style={styles.colLabel}>REPS</Text>
        <View style={{ width: 46 + 24 + spacing.sm * 2 }} />
      </View>
      {ex.sets.map((s, i) => (
        <SetRow key={s.id} exId={ex.id} set={s} index={i} />
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
  cols: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: 6, marginBottom: 2 },
  colLabel: { flex: 1, color: colors.muted, fontSize: 11, textAlign: 'center', fontWeight: '600' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 44,
    marginTop: spacing.xs,
  },
  addText: { color: colors.primary, fontWeight: '600' },
});