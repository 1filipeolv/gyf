import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ActivityFormModal from '../components/ActivityFormModal';
import { useAuth } from '../contexts/AuthContext';
import { listActivities, removeActivity } from '../services/activities';
import { getLatestWeightKg } from '../services/weights';
import { Activity } from '../types';
import { ACTIVITY_COLORS, ACTIVITY_ICONS, ACTIVITY_LABELS } from '../constants/activities';
import { paceText } from '../utils/energy';
import { activitySummary } from '../utils/dashboard';
import { formatDateBR } from '../utils/date';
import { toast } from '../utils/toast';
import { colors, radius, spacing } from '../theme';

const fmtDist = (a: Activity) =>
  a.distanceKm ? (a.type === 'swim' ? `${Math.round(a.distanceKm * 1000)} m` : `${a.distanceKm.toFixed(2).replace('.', ',')} km`) : null;

export default function ActivitiesScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Activity[]>([]);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [a, w] = await Promise.all([listActivities(user.uid), getLatestWeightKg(user.uid)]);
      setList(a);
      setWeightKg(w);
    } catch {
      toast.error('Não foi possível carregar');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const week = useMemo(() => activitySummary(list, []), [list]);

  const open = (a: Activity | null) => {
    setEditing(a);
    setForm(true);
  };

  const remove = (a: Activity) =>
    Alert.alert('Excluir atividade', `${ACTIVITY_LABELS[a.type]} em ${formatDateBR(a.date)}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeActivity(user!.uid, a.id);
            setForm(false);
            await load();
          } catch {
            toast.error('Não foi possível excluir');
          }
        },
      },
    ]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.sumItem}>
            <Text style={styles.sumValue}>{week.weekCount}</Text>
            <Text style={styles.sumLabel}>Atividades na semana</Text>
          </View>
          <View style={styles.sumItem}>
            <Text style={styles.sumValue}>{week.weekMinutes}</Text>
            <Text style={styles.sumLabel}>Minutos na semana</Text>
          </View>
        </View>
        <Button title="Nova atividade" onPress={() => open(null)} />
        <Text style={styles.section}>Histórico</Text>
        {list.length === 0 && (
          <EmptyState icon="walk-outline" title="Nenhuma atividade" hint="Registre corrida, natação, caminhada ou bicicleta." />
        )}
        {list.map((a) => {
          const pace = paceText(a.type, a.durationMin, a.distanceKm);
          const dist = fmtDist(a);
          return (
            <Pressable key={a.id} onPress={() => open(a)} style={styles.item}>
              <View style={[styles.icon, { backgroundColor: ACTIVITY_COLORS[a.type] }]}>
                <Ionicons name={ACTIVITY_ICONS[a.type]} size={20} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {ACTIVITY_LABELS[a.type]} · {formatDateBR(a.date)}
                </Text>
                <Text style={styles.itemMeta}>
                  {[`${a.durationMin} min`, dist, pace].filter(Boolean).join(' · ')}
                </Text>
                <Text style={styles.itemKcal}>
                  {a.kcalSource === 'manual' ? `${a.kcal} kcal (manual)` : `~${a.kcal} kcal (estimada)`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          );
        })}
        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
      {user && (
        <ActivityFormModal
          visible={form}
          uid={user.uid}
          weightKg={weightKg}
          editing={editing}
          onClose={() => setForm(false)}
          onSaved={() => {
            setForm(false);
            load();
          }}
          onDelete={remove}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  summary: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sumItem: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  sumValue: { color: colors.text, fontSize: 24, fontWeight: '800' },
  sumLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 68,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  itemMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  itemKcal: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
