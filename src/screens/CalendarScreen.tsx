import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, listByDateRange } from '../services/db';
import { listAttendance, removeAttendance, saveAttendance } from '../services/attendance';
import { Activity, Attendance, Workout } from '../types';
import { listActivitiesRange } from '../services/activities';
import { getLatestWeightKg } from '../services/weights';
import { paceText, workoutKcal } from '../utils/energy';
import { RootStackParamList } from '../navigation/types';
import { ACTIVITY_COLORS, ACTIVITY_ICONS, ACTIVITY_LABELS } from '../constants/activities';
import {
  buildDayMap,
  buildMonthGrid,
  currentMonth,
  MONTH_NAMES,
  monthEnd,
  monthStart,
  monthStats,
  sameMonth,
  shiftMonth,
  streakDays,
  streakWeeksByDays,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
} from '../utils/calendar';
import { addDays, formatDateBR, formatDuration, fromDateKey, toDateKey } from '../utils/date';
import { toast } from '../utils/toast';
import { haptic } from '../utils/haptics';
import { fmtKg } from '../utils/stats';
import { colors, radius, spacing } from '../theme';

const RECENT_DAYS = 182;

export default function CalendarScreen() {
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const today = toDateKey();
  const nowMonth = currentMonth();
  const [month, setMonth] = useState(nowMonth);
  const [selected, setSelected] = useState<string | null>(today);
  const [monthWorkouts, setMonthWorkouts] = useState<Workout[]>([]);
  const [monthAttendance, setMonthAttendance] = useState<Attendance[]>([]);
  const [monthActivities, setMonthActivities] = useState<Activity[]>([]);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [recentActive, setRecentActive] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState(3);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadMonth = useCallback(
    async (m: typeof month) => {
      if (!user) return;
      try {
        const [w, a, c] = await Promise.all([
          listByDateRange<Workout>(user.uid, 'workouts', monthStart(m), monthEnd(m)),
          listAttendance(user.uid, monthStart(m), monthEnd(m)),
          listActivitiesRange(user.uid, monthStart(m), monthEnd(m)),
        ]);
        setMonthWorkouts(w);
        setMonthAttendance(a);
        setMonthActivities(c);
      } catch {
        toast.error('Não foi possível carregar o mês');
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const loadRecent = useCallback(async () => {
    if (!user) return;
    try {
      const from = addDays(today, -RECENT_DAYS);
      const [w, a, c, p, kg] = await Promise.all([
        listByDateRange<Workout>(user.uid, 'workouts', from, today),
        listAttendance(user.uid, from, today),
        listActivitiesRange(user.uid, from, today),
        getProfile(user.uid),
        getLatestWeightKg(user.uid),
      ]);
      setRecentActive(new Set([...w.map((x) => x.date), ...a.map((x) => x.date), ...c.map((x) => x.date)]));
      setTarget(p?.weeklyFrequencyTarget ?? 3);
      setWeightKg(kg);
    } catch {}
  }, [user, today]);

  useFocusEffect(
    useCallback(() => {
      loadMonth(month);
      loadRecent();
    }, [loadMonth, loadRecent, month])
  );

  const days = useMemo(() => buildDayMap(monthWorkouts, monthAttendance, monthActivities), [monthWorkouts, monthAttendance, monthActivities]);
  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const stats = useMemo(() => monthStats(month, days, today), [month, days, today]);
  const dayStreak = useMemo(() => streakDays(recentActive, today), [recentActive, today]);
  const weekStreak = useMemo(() => streakWeeksByDays(recentActive, target, today), [recentActive, target, today]);

  const isCurrent = sameMonth(month, nowMonth);

  const go = (delta: number) => {
    haptic.select();
    const next = shiftMonth(month, delta);
    setMonth(next);
    setSelected(sameMonth(next, nowMonth) ? today : null);
  };

  const info = selected ? days.get(selected) : undefined;
  const canMark = !!selected && selected <= today && !info?.workouts.length && !info?.attendance;

  const mark = async () => {
    if (!user || !selected || busy) return;
    setBusy(true);
    try {
      await saveAttendance(user.uid, selected, 'strength');
      haptic.success();
      toast.success('Presença marcada');
      await Promise.all([loadMonth(month), loadRecent()]);
    } catch {
      toast.error('Não foi possível marcar a presença');
    } finally {
      setBusy(false);
    }
  };

  const unmark = () => {
    if (!user || !selected) return;
    Alert.alert('Remover presença', formatDateBR(selected), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await removeAttendance(user.uid, selected);
            await Promise.all([loadMonth(month), loadRecent()]);
          } catch {
            toast.error('Não foi possível remover');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const weekday = selected ? WEEKDAY_LONG[fromDateKey(selected).getDay()] : '';

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.nav}>
        <Pressable onPress={() => go(-1)} style={styles.navBtn} hitSlop={6}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[month.month - 1]} {month.year}
        </Text>
        <Pressable
          onPress={() => go(1)}
          disabled={isCurrent}
          style={[styles.navBtn, isCurrent && { opacity: 0.3 }]}
          hitSlop={6}
        >
          <Ionicons name="chevron-forward" size={26} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.weekRow}>
          {WEEKDAY_SHORT.map((d, i) => (
            <Text key={i} style={styles.weekLabel}>
              {d}
            </Text>
          ))}
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : (
          grid.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((key, di) => {
                if (!key) return <View key={di} style={styles.cell} />;
                const d = days.get(key);
                const isToday = key === today;
                const isSel = key === selected;
                return (
                  <Pressable
                    key={di}
                    onPress={() => {
                      haptic.select();
                      setSelected(key);
                    }}
                    style={styles.cell}
                  >
                    <View
                      style={[
                        styles.cellInner,
                        isSel && styles.cellSel,
                        isToday && !isSel && styles.cellToday,
                      ]}
                    >
                      <Text style={[styles.dayNum, d && styles.dayNumActive, key > today && { opacity: 0.45 }]}>
                        {Number(key.split('-')[2])}
                      </Text>
                      <View style={styles.dots}>
                        {d?.types.slice(0, 3).map((t) => (
                          <View key={t} style={[styles.dot, { backgroundColor: ACTIVITY_COLORS[t] }]} />
                        ))}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </View>

      <View style={styles.stats}>
        <Stat label="Treinos" value={String(stats.workouts)} />
        <Stat label="Atividades" value={String(stats.activities)} />
        <Stat label="Dias ativos" value={String(stats.activeDays)} />
      </View>
      <View style={styles.stats}>
        <Stat
          label={`Média/sem (meta ${target})`}
          value={stats.perWeek === null ? '—' : String(stats.perWeek).replace('.', ',')}
          ok={stats.perWeek !== null ? stats.perWeek >= target : undefined}
        />
        <Stat label="Sequência (dias)" value={String(dayStreak)} />
        <Stat label="Sequência (semanas)" value={String(weekStreak)} />
      </View>

      <Text style={styles.section}>{selected ? `${weekday}, ${formatDateBR(selected)}` : 'Dia'}</Text>
      {!selected && <Text style={styles.empty}>Toque em um dia para ver os detalhes.</Text>}
      {selected && !info && (
        <Text style={styles.empty}>{selected > today ? 'Dia futuro.' : 'Nada registrado neste dia.'}</Text>
      )}
      {info?.workouts.map((w) => (
        <Pressable key={w.id} onPress={() => nav.navigate('WorkoutDetail', { workout: w })} style={styles.item}>
          <View style={[styles.itemIcon, { backgroundColor: ACTIVITY_COLORS.strength }]}>
            <Ionicons name={ACTIVITY_ICONS.strength} size={20} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{w.name}</Text>
            <Text style={styles.itemMeta}>
              {formatDuration(w.durationSec)} · {fmtKg(w.totalVolumeKg)} · {w.totalSets} séries
              {weightKg ? ` · ~${workoutKcal(w.durationSec, weightKg)} kcal (est.)` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
      {info?.activities.map((a) => {
        const pace = paceText(a.type, a.durationMin, a.distanceKm);
        const dist = a.distanceKm
          ? a.type === 'swim'
            ? `${Math.round(a.distanceKm * 1000)} m`
            : `${a.distanceKm.toFixed(2).replace('.', ',')} km`
          : null;
        return (
          <Pressable key={a.id} onPress={() => nav.navigate('Activities')} style={styles.item}>
            <View style={[styles.itemIcon, { backgroundColor: ACTIVITY_COLORS[a.type] }]}>
              <Ionicons name={ACTIVITY_ICONS[a.type]} size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{ACTIVITY_LABELS[a.type]}</Text>
              <Text style={styles.itemMeta}>
                {[`${a.durationMin} min`, dist, pace, a.kcalSource === 'manual' ? `${a.kcal} kcal` : `~${a.kcal} kcal (est.)`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        );
      })}
      {info?.attendance && (
        <View style={styles.item}>
          <View style={[styles.itemIcon, { backgroundColor: ACTIVITY_COLORS[info.attendance.type] }]}>
            <Ionicons name={ACTIVITY_ICONS[info.attendance.type]} size={20} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>Presença: {ACTIVITY_LABELS[info.attendance.type]}</Text>
            <Text style={styles.itemMeta}>Marcada manualmente</Text>
          </View>
          <Pressable onPress={unmark} style={styles.removeBtn} hitSlop={6} disabled={busy}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        </View>
      )}
      {canMark && (
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Marcar que fui à academia" onPress={mark} loading={busy} variant="ghost" />
        </View>
      )}
      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, ok === true && { color: colors.success }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  nav: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  navBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 20, fontWeight: '800' },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm },
  weekRow: { flexDirection: 'row' },
  weekLabel: {
    width: '14.2857%',
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
  cell: { width: '14.2857%', height: 52, padding: 2 },
  cellInner: {
    flex: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellSel: { backgroundColor: 'rgba(124,92,255,0.25)', borderColor: colors.primary },
  cellToday: { borderColor: colors.primary },
  dayNum: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  dayNumActive: { color: colors.text, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 3, height: 7, marginTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { color: colors.muted },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  itemMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
