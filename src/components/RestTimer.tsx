import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useWorkout } from '../contexts/WorkoutContext';
import { useNow } from '../hooks/useNow';
import { formatDuration } from '../utils/date';
import { colors, radius, spacing } from '../theme';

export default function RestTimer() {
  const { restEndsAt, adjustRest, skipRest } = useWorkout();
  const now = useNow(restEndsAt !== null);
  const remaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (restEndsAt !== null && remaining === 0) {
      Vibration.vibrate([0, 300, 150, 300]);
      skipRest();
    }
  }, [remaining, restEndsAt]);

  if (restEndsAt === null) return null;

  return (
    <View style={styles.bar}>
      <Pressable onPress={() => adjustRest(-15)} style={styles.btn}>
        <Text style={styles.btnText}>-15</Text>
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.label}>DESCANSO</Text>
        <Text style={styles.time}>{formatDuration(remaining)}</Text>
      </View>
      <Pressable onPress={() => adjustRest(15)} style={styles.btn}>
        <Text style={styles.btnText}>+15</Text>
      </Pressable>
      <Pressable onPress={skipRest} style={[styles.btn, styles.skip]}>
        <Text style={styles.btnText}>Pular</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center' },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  time: { color: colors.text, fontSize: 28, fontWeight: '800' },
  btn: {
    height: 48,
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { backgroundColor: colors.primary },
  btnText: { color: colors.text, fontWeight: '700' },
});