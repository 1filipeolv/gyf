import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { useWorkout } from '../contexts/WorkoutContext';
import { useNow } from '../hooks/useNow';
import { formatDuration } from '../utils/date';
import { colors, radius, spacing } from '../theme';

const AUTO_DISMISS_SEC = 300;

export default function RestTimer() {
  const { restEndsAt, adjustRest, skipRest } = useWorkout();
  const running = restEndsAt !== null;
  const now = useNow(running);
  const [blink, setBlink] = useState(false);
  const firedFor = useRef<number | null>(null);

  const diff = restEndsAt ? Math.ceil((restEndsAt - now) / 1000) : 0;
  const remaining = Math.max(0, diff);
  const over = running && diff <= 0;
  const overSec = restEndsAt && over ? Math.max(0, Math.floor((now - restEndsAt) / 1000)) : 0;
  const phase = over ? 'over' : diff <= 10 ? 'warn' : 'normal';

  useEffect(() => {
    if (restEndsAt !== null && over && firedFor.current !== restEndsAt) {
      firedFor.current = restEndsAt;
      Vibration.vibrate([0, 300, 150, 300, 150, 300]);
    }
    if (over && overSec >= AUTO_DISMISS_SEC) skipRest();
  }, [over, restEndsAt, overSec]);

  useEffect(() => {
    if (!over) {
      setBlink(false);
      return;
    }
    const i = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(i);
  }, [over]);

  if (!running) return null;

  const accent =
    phase === 'over' ? (blink ? colors.danger : colors.success) : phase === 'warn' ? colors.warning : colors.primary;
  const bg =
    phase === 'over'
      ? blink
        ? 'rgba(255,69,58,0.22)'
        : 'rgba(52,199,89,0.22)'
      : phase === 'warn'
        ? 'rgba(255,214,10,0.12)'
        : colors.card;

  return (
    <View style={[styles.panel, { borderColor: accent, backgroundColor: bg }]}>
      <Text style={[styles.label, { color: accent }]}>
        {over ? `PRONTO! +${formatDuration(overSec)}` : 'DESCANSO'}
      </Text>
      <Text style={[styles.time, { color: accent }]} adjustsFontSizeToFit numberOfLines={1}>
        {formatDuration(remaining)}
      </Text>
      <View style={styles.row}>
        <Pressable onPress={() => adjustRest(-15)} style={styles.btn}>
          <Text style={styles.btnText}>-15s</Text>
        </Pressable>
        <Pressable onPress={() => adjustRest(15)} style={styles.btn}>
          <Text style={styles.btnText}>+15s</Text>
        </Pressable>
        <Pressable onPress={skipRest} style={[styles.btn, { backgroundColor: over ? colors.success : colors.primary }]}>
          <Text style={styles.btnText}>{over ? 'Próxima' : 'Pular'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  time: { fontSize: 88, fontWeight: '900', lineHeight: 96, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.xs },
  btn: {
    flex: 1,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.text, fontWeight: '800', fontSize: 18 },
});
