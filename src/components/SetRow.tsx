import React, { useState } from 'react';
import { haptic } from '../utils/haptics';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSet } from '../types';
import { useWorkout } from '../contexts/WorkoutContext';
import { parseNum } from '../utils/workout';
import { colors, radius, spacing } from '../theme';

type Props = { exId: string; set: WorkoutSet; index: number };

export default function SetRow({ exId, set, index }: Props) {
  const { updateSet, toggleSet, removeSet } = useWorkout();
  const [kg, setKg] = useState(set.weightKg ? String(set.weightKg) : '');
  const [reps, setReps] = useState(set.reps ? String(set.reps) : '');

  return (
    <View style={[styles.row, set.completed && styles.done]}>
      <Text style={styles.idx}>{index + 1}</Text>
      <TextInput
        style={styles.input}
        value={kg}
        onChangeText={(t) => {
          setKg(t);
          updateSet(exId, set.id, { weightKg: parseNum(t) });
        }}
        placeholder="kg"
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        selectTextOnFocus
      />
      <TextInput
        style={styles.input}
        value={reps}
        onChangeText={(t) => {
          setReps(t);
          updateSet(exId, set.id, { reps: Math.round(parseNum(t)) });
        }}
        placeholder="reps"
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        selectTextOnFocus
      />
      <Pressable
        onPress={() => {
          if (!set.completed) haptic.medium();
          toggleSet(exId, set.id);
        }}
        style={[styles.check, set.completed && { backgroundColor: colors.success }]}
        hitSlop={6}
      >
        <Ionicons name="checkmark" size={22} color={colors.text} />
      </Pressable>
      <Pressable onPress={() => removeSet(exId, set.id)} hitSlop={10} style={styles.del}>
        <Ionicons name="close" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  done: { backgroundColor: 'rgba(52,199,89,0.12)' },
  idx: { color: colors.muted, width: 22, textAlign: 'center', fontWeight: '600' },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  check: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  del: { width: 24, alignItems: 'center' },
});