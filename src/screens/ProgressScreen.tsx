import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ScreenContainer from '../components/ScreenContainer';
import BarChart from '../components/BarChart';
import { useDashboard } from '../hooks/useDashboard';
import { RootStackParamList } from '../navigation/types';
import { SITE_LABELS } from '../constants/measurements';
import Tutorial from '../components/Tutorial';
import { activitySummary, measurementDeltas, nutritionSummary, streakWeeks, weeklyVolume, weightSummary } from '../utils/dashboard';
import { countPRs, fmtKg } from '../utils/stats';
import { addDays, formatDateBR, toDateKey } from '../utils/date';
import { photoUri } from '../services/photos';
import { MeasurementSite } from '../types';
import { colors, radius, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const sign = (v: number) => (v > 0 ? '+' : '');

export default function ProgressScreen() {
  const nav = useNavigation<Nav>();
  const { profile, workouts, weights, measurements, photos, activities, dailyLogs, loading } = useDashboard();

  const d = useMemo(() => {
    const vol = weeklyVolume(workouts, 8);
    const today = toDateKey();
    const last30 = workouts.filter((w) => w.date >= addDays(today, -29));
    const prs30 = last30.reduce((a, w) => a + countPRs(w), 0);
    const target = profile?.weeklyFrequencyTarget ?? 3;
    const front = photos.filter((p) => p.angle === 'front');
    return {
      vol,
      freq: vol[vol.length - 1].count,
      target,
      streak: streakWeeks(workouts, target),
      prs30,
      w: weightSummary(weights),
      deltas: measurementDeltas(measurements).slice(0, 4),
      before: front[0],
      after: front.length > 1 ? front[front.length - 1] : undefined,
      lastWorkout: workouts[0],
    };
  }, [workouts, weights, measurements, photos, profile]);

  const act = useMemo(() => activitySummary(activities, dailyLogs), [activities, dailyLogs]);
  const nut = useMemo(() => nutritionSummary(dailyLogs), [dailyLogs]);

  const Link = ({ icon, title, to }: { icon: keyof typeof Ionicons.glyphMap; title: string; to: keyof RootStackParamList }) => (
    <Pressable onPress={() => nav.navigate(to as never)} style={styles.link}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.linkText}>{title}</Text>
    </Pressable>
  );

  if (loading)
    return (
      <ScreenContainer title="Progresso">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );

  return (
    <ScreenContainer title="Progresso">
      <Tutorial
        id="progress"
        steps={[
          { title: 'Seu progresso', text: 'Aqui ficam os gráficos de volume, peso, medidas e fotos. Tudo vem do check-in semanal e dos treinos.' },
          { title: 'Fotos em linha do tempo', text: 'A primeira foto é o Dia 1. As demais mostram quantos dias se passaram desde ela.' },
        ]}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <Kpi label="Treinos na semana" value={`${d.freq}/${d.target}`} ok={d.freq >= d.target} />
          <Kpi label="Sequência (sem.)" value={String(d.streak)} />
          <Kpi label="PRs em 30d" value={String(d.prs30)} />
        </View>

        <Pressable onPress={() => nav.navigate('Calendar')} style={styles.calLink}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.calTitle}>Frequência</Text>
            <Text style={styles.calHint}>Calendário mensal de treinos e presença</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Text style={styles.section}>Volume semanal</Text>
        <View style={styles.card}>
          {workouts.length ? <BarChart data={d.vol} /> : <Text style={styles.empty}>Sem treinos.</Text>}
          {d.lastWorkout && (
            <Text style={styles.sub}>
              Último: {d.lastWorkout.name} · {formatDateBR(d.lastWorkout.date)} · {fmtKg(d.lastWorkout.totalVolumeKg)}
            </Text>
          )}
        </View>

        <Text style={styles.section}>Peso</Text>
        <Pressable onPress={() => nav.navigate('Weight')} style={styles.card}>
          {d.w ? (
            <View style={styles.row}>
              <Kpi label="Atual" value={`${fmt(d.w.current)} kg`} flat />
              <Kpi label="Média 7d" value={`${fmt(d.w.avg)} kg`} flat />
              <Kpi
                label="Tendência/sem"
                value={d.w.rate !== null ? `${sign(d.w.rate)}${fmt(d.w.rate, 2)} kg` : '-'}
                flat
              />
            </View>
          ) : (
            <Text style={styles.empty}>Registre seu peso.</Text>
          )}
          {d.w && <Text style={styles.sub}>30 dias: {sign(d.w.change30)}{fmt(d.w.change30)} kg (média móvel)</Text>}
        </Pressable>

        <Text style={styles.section}>Medidas</Text>
        <Pressable onPress={() => nav.navigate('Measurements')} style={styles.card}>
          {d.deltas.length ? (
            d.deltas.map((m) => (
              <View key={m.site} style={styles.mRow}>
                <Text style={styles.mName}>{SITE_LABELS[m.site as MeasurementSite]}</Text>
                <Text style={styles.mFrom}>
                  {fmt(m.first)} → {fmt(m.last)} cm
                </Text>
                <Text style={styles.mDiff}>
                  {sign(m.diff)}
                  {fmt(m.diff)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>Registre medições em 2 datas para ver a variação.</Text>
          )}
        </Pressable>

        <Text style={styles.section}>Fotos</Text>
        <Pressable onPress={() => nav.navigate('PhotoCompare')} style={styles.card}>
          {d.before && d.after ? (
            <View style={styles.photos}>
              <View style={styles.ph}>
                <Image source={{ uri: photoUri(d.before) }} style={styles.img} contentFit="cover" />
                <Text style={styles.sub}>{formatDateBR(d.before.date)}</Text>
              </View>
              <View style={styles.ph}>
                <Image source={{ uri: photoUri(d.after) }} style={styles.img} contentFit="cover" />
                <Text style={styles.sub}>{formatDateBR(d.after.date)}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>Adicione 2 fotos de frente para comparar.</Text>
          )}
        </Pressable>

        <Text style={styles.section}>Alimentação</Text>
        <Pressable onPress={() => nav.navigate('Nutrition')} style={[styles.card, styles.row]}>
          <Kpi label="Kcal (média 7d)" value={nut.kcalAvg === null ? '—' : nut.kcalAvg.toLocaleString('pt-BR')} flat />
          <Kpi label="Proteína g (7d)" value={nut.proteinAvg === null ? '—' : String(nut.proteinAvg)} flat />
        </Pressable>

        <Text style={styles.section}>Registrar</Text>
        <View style={styles.links}>
          <Link icon="scale-outline" title="Peso" to="Weight" />
          <Link icon="resize-outline" title="Medidas" to="Measurements" />
          <Link icon="camera-outline" title="Fotos" to="Photos" />
        </View>
        <View style={[styles.links, { marginTop: spacing.sm }]}>
          <Link icon="checkbox-outline" title="Check-in" to="Checkin" />
          <Link icon="restaurant-outline" title="Alimentação" to="Nutrition" />
          <Link icon="calendar-outline" title="Calendário" to="Calendar" />
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function Kpi({ label, value, ok, flat }: { label: string; value: string; ok?: boolean; flat?: boolean }) {
  return (
    <View style={[styles.kpi, flat && { backgroundColor: 'transparent', paddingVertical: 0 }]}>
      <Text style={[styles.kpiValue, ok && { color: colors.success }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  kpi: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  kpiValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  kpiLabel: { color: colors.muted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md },
  sub: { color: colors.muted, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.sm },
  mRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  mName: { color: colors.text, flex: 1, fontSize: 14 },
  mFrom: { color: colors.muted, fontSize: 12, marginRight: spacing.md },
  mDiff: { color: colors.text, fontWeight: '800', width: 48, textAlign: 'right' },
  photos: { flexDirection: 'row', gap: spacing.sm },
  ph: { flex: 1 },
  img: { width: '100%', aspectRatio: 0.72, borderRadius: radius.sm, backgroundColor: colors.bg },
  calLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  calTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  calHint: { color: colors.muted, fontSize: 13, marginTop: 2 },
  links: { flexDirection: 'row', gap: spacing.sm },
  link: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  linkText: { color: colors.text, fontSize: 13, fontWeight: '600' },
});