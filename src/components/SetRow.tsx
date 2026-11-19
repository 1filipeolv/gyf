import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../utils/haptics';
import { WorkoutSet } from '../types';
import { useWorkout } from '../contexts/WorkoutContext';
import { parseNum } from '../utils/workout';
import { colors, radius, spacing } from '../theme';

type Planned = { weightKg: number; reps: number };

type Props = {
  exId: string;
  set: WorkoutSet;
  index: number;
  previous?: WorkoutSet;
  planned?: Planned;
  weightStep: number;
  bodyweight: boolean;
};

const fmt = (n: number) => String(Math.round(n * 100) / 100);

const prevText = (p: WorkoutSet | undefined, bodyweight: boolean) => {
  if (!p) return '—';
  return bodyweight || p.weightKg === 0 ? `${p.reps} reps` : `${fmt(p.weightKg)} kg × ${p.reps}`;
};

export default function SetRow({ exId, set, index, previous, planned, weightStep, bodyweight }: Props) {
  const { updateSet, toggleSet, removeSet, completeSet } = useWorkout();
  const [kg, setKg] = useState(set.weightKg ? fmt(set.weightKg) : '');
  const [reps, setReps] = useState(set.reps ? String(set.reps) : '');

  useEffect(() => {
    if (parseNum(kg) !== set.weightKg) setKg(set.weightKg ? fmt(set.weightKg) : '');
    if (Math.round(parseNum(reps)) !== set.reps) setReps(set.reps ? String(set.reps) : '');
  }, [set.weightKg, set.reps]);

  const stepKg = (dir: 1 | -1) => {
    const next = Math.max(0, Math.round((set.weightKg + dir * weightStep) * 100) / 100);
    haptic.select();
    setKg(next ? fmt(next) : '');
    updateSet(exId, set.id, { weightKg: next });
  };

  const stepReps = (dir: 1 | -1) => {
    const next = Math.max(0, set.reps + dir);
    haptic.select();
    setReps(next ? String(next) : '');
    updateSet(exId, set.id, { reps: next });
  };

  const asPlanned = () => {
    if (!planned) return;
    haptic.medium();
    completeSet(exId, set.id, { weightKg: planned.weightKg, reps: planned.reps });
  };

  return (
    <View style={[styles.wrap, set.completed && styles.done]}>
      <View style={styles.top}>
        <Text style={styles.idx}>Série {index + 1}</Text>
        <Text style={styles.prev} numberOfLines={1}>
          Anterior: {prevText(previous, bodyweight)}
        </Text>
        {!set.completed && planned && (
          <Pressable onPress={asPlanned} style={styles.planned} hitSlop={6}>
            <Ionicons name="flash" size={14} color={colors.text} />
            <Text style={styles.plannedText}>Como planejado</Text>
          </Pressable>
        )}
        {set.completed && typeof set.restSec === 'number' && (
          <Text style={styles.rest}>desc. {set.restSec}s</Text>
        )}
        <Pressable onPress={() => removeSet(exId, set.id)} hitSlop={10} style={styles.del}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>
      <View style={styles.main}>
        {!bodyweight && (
          <View style={styles.group}>
            <Pressable onPress={() => stepKg(-1)} style={styles.step}>
              <Ionicons name="remove" size={24} color={colors.text} />
            </Pressable>
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
            <Pressable onPress={() => stepKg(1)} style={styles.step}>
              <Ionicons name="add" size={24} color={colors.text} />
            </Pressable>
          </View>
        )}
        <View style={styles.group}>
          <Pressable onPress={() => stepReps(-1)} style={styles.step}>
            <Ionicons name="remove" size={24} color={colors.text} />
          </Pressable>
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
          <Pressable onPress={() => stepReps(1)} style={styles.step}>
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            if (!set.completed) haptic.medium();
            toggleSet(exId, set.id);
          }}
          style={[styles.check, set.completed && { backgroundColor: colors.success }]}
          hitSlop={4}
        >
          <Ionicons name="checkmark" size={28} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  done: { backgroundColor: 'rgba(52,199,89,0.12)' },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6, minHeight: 28 },
  idx: { color: colors.text, fontWeight: '700', fontSize: 13 },
  prev: { color: colors.muted, fontSize: 13, flex: 1 },
  rest: { color: colors.muted, fontSize: 12 },
  planned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    height: 32,
  },
  plannedText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  del: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  group: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: {
    width: 40,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 56,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  check: {
    width: 60,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
