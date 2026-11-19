import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { removeWorkout } from '../services/workouts';
import { RootStackParamList } from '../navigation/types';
import { MUSCLE_LABELS } from '../constants/muscles';
import { exerciseVolume, est1RM, fmtKg } from '../utils/stats';
import { formatDateBR, formatDuration } from '../utils/date';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>;

export default function WorkoutDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const w = route.params.workout;
  const [busy, setBusy] = useState(false);

  const remove = () =>
    Alert.alert('Excluir treino', w.name, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          setBusy(true);
          try {
            await removeWorkout(user.uid, w.id);
            navigation.goBack();
          } catch {
            setBusy(false);
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        },
      },
    ]);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>{w.name}</Text>
      <Text style={styles.date}>{formatDateBR(w.date)}</Text>
      <View style={styles.stats}>
        <Stat label="Duração" value={formatDuration(w.durationSec)} />
        <Stat label="Séries" value={String(w.totalSets)} />
        <Stat label="Volume" value={fmtKg(w.totalVolumeKg)} />
      </View>
      {w.exercises.map((e) => (
        <View key={e.id} style={styles.card}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{e.exerciseName}</Text>
              <Text style={styles.meta}>
                {MUSCLE_LABELS[e.primaryMuscle]} · {fmtKg(exerciseVolume(e))}
              </Text>
            </View>
          </View>
          {e.sets.map((s, i) => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.idx}>{i + 1}</Text>
              <Text style={styles.set}>
                {s.weightKg} kg × {s.reps}
                {typeof s.restSec === 'number' ? `  ·  desc. ${formatDuration(s.restSec)}` : ''}
              </Text>
              <Text style={styles.e1}>1RM ~{Math.round(est1RM(s.weightKg, s.reps))}</Text>
              {s.isPR && (
                <View style={styles.pr}>
                  <Text style={styles.prText}>PR</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
      <Button title="Excluir treino" onPress={remove} variant="danger" loading={busy} />
      <View style={{ height: spacing.xl }} />
    </ScrollView>
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
  wrap: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  date: { color: colors.muted, marginTop: 2, marginBottom: spacing.md },
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
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: spacing.sm },
  idx: { color: colors.muted, width: 20, fontWeight: '600' },
  set: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  e1: { color: colors.muted, fontSize: 12 },
  pr: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  prText: { color: colors.text, fontSize: 11, fontWeight: '800' },
});