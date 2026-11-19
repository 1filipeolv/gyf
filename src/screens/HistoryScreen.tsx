import React, { useCallback, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../contexts/AuthContext';
import { listWorkouts } from '../services/workouts';
import { Workout } from '../types';
import { RootStackParamList } from '../navigation/types';
import { MUSCLE_LABELS } from '../constants/muscles';
import { countPRs, fmtKg, periodStats, setsByMuscle } from '../utils/stats';
import { addDays, formatDateBR, formatDuration, toDateKey } from '../utils/date';
import { colors, radius, spacing } from '../theme';

const TARGET_SETS = 10;

export default function HistoryScreen() {
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      listWorkouts(user.uid)
        .then(setWorkouts)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [user])
  );

  const summary = useMemo(() => {
    const today = toDateKey();
    const from = addDays(today, -6);
    const cur = periodStats(workouts, from, today);
    const prev = periodStats(workouts, addDays(today, -13), addDays(today, -7));
    const muscles = Object.entries(setsByMuscle(workouts, from)).sort((a, b) => b[1] - a[1]);
    return { cur, prev, muscles };
  }, [workouts]);

  const delta = (a: number, b: number) => {
    if (!b) return null;
    const p = Math.round(((a - b) / b) * 100);
    return `${p >= 0 ? '+' : ''}${p}%`;
  };

  const header = (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.section}>Últimos 7 dias</Text>
      <View style={styles.stats}>
        <Stat label="Treinos" value={String(summary.cur.count)} />
        <Stat label="Séries" value={String(summary.cur.sets)} />
        <Stat
          label={`Volume ${delta(summary.cur.volume, summary.prev.volume) ?? ''}`.trim()}
          value={fmtKg(summary.cur.volume)}
        />
      </View>
      {summary.muscles.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Séries por grupo (meta {TARGET_SETS}/sem)</Text>
          {summary.muscles.map(([m, n]) => (
            <View key={m} style={styles.mRow}>
              <Text style={styles.mName}>{MUSCLE_LABELS[m as keyof typeof MUSCLE_LABELS]}</Text>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, (n / TARGET_SETS) * 100)}%`,
                      backgroundColor: n >= TARGET_SETS ? colors.success : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.mVal}>{n}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.section}>Treinos</Text>
    </View>
  );

  if (loading)
    return (
      <ScreenContainer title="Histórico">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );

  return (
    <ScreenContainer title="Histórico">
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="barbell-outline" title="Nenhum treino ainda" hint="Inicie um treino na aba Treino." />}
        renderItem={({ item }) => {
          const prs = countPRs(item);
          return (
            <Pressable onPress={() => nav.navigate('WorkoutDetail', { workout: item })} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {formatDateBR(item.date)} · {formatDuration(item.durationSec)} · {item.totalSets} séries ·{' '}
                  {fmtKg(item.totalVolumeKg)}
                </Text>
              </View>
              {prs > 0 && (
                <View style={styles.pr}>
                  <Text style={styles.prText}>{prs} PR</Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  cardTitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  mName: { color: colors.text, width: 90, fontSize: 13 },
  bar: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  mVal: { color: colors.muted, width: 24, textAlign: 'right', fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  pr: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  prText: { color: colors.text, fontSize: 12, fontWeight: '800' },
});