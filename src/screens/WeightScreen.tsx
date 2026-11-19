import React, { useCallback, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { toast } from '../utils/toast';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../components/Input';
import Button from '../components/Button';
import Chips from '../components/Chips';
import LineChart from '../components/LineChart';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/db';
import { listWeights, removeWeight, saveWeight } from '../services/weights';
import { BodyWeight } from '../types';
import { movingAvg, toPts, weeklyRate } from '../utils/trend';
import { parseNum } from '../utils/workout';
import { addDays, formatDateBR, toDateKey } from '../utils/date';
import { colors, radius, spacing } from '../theme';

type Range = '30' | '90' | '365' | 'all';

const rangeOpts: { key: Range; label: string }[] = [
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: '365', label: '1 ano' },
  { key: 'all', label: 'Tudo' },
];

const fmt = (v: number) => v.toFixed(1).replace('.', ',');

export default function WeightScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<BodyWeight[]>([]);
  const [target, setTarget] = useState<number | undefined>();
  const [range, setRange] = useState<Range>('90');
  const [date, setDate] = useState(toDateKey());
  const [kg, setKg] = useState('');
  const [bf, setBf] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [w, p] = await Promise.all([listWeights(user.uid), getProfile(user.uid)]);
      setList(w);
      setTarget(p?.targetWeightKg);
    } catch {}
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const data = useMemo(() => {
    const allPts = toPts(list);
    const avgAll = movingAvg(allPts);
    const from = range === 'all' ? '' : addDays(toDateKey(), -Number(range));
    const idx = list.map((w, i) => (w.date >= from ? i : -1)).filter((i) => i >= 0);
    const raw = idx.map((i) => allPts[i]);
    const trend = idx.map((i) => avgAll[i]);
    const rate = weeklyRate(avgAll);
    const last = avgAll[avgAll.length - 1];
    return { raw, trend, rate, avg: last?.y, current: list[list.length - 1]?.weightKg };
  }, [list, range]);

  const save = async () => {
    if (!user) return;
    const w = parseNum(kg);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > toDateKey())
      return Alert.alert('Data inválida', 'Use AAAA-MM-DD, sem datas futuras.');
    if (w < 20 || w > 400) return Alert.alert('Peso inválido');
    setSaving(true);
    try {
      await saveWeight(user.uid, date, w, parseNum(bf) || undefined);
      setKg('');
      setBf('');
      setDate(toDateKey());
      await load();
      toast.success('Peso salvo');
    } catch {
      toast.error('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (w: BodyWeight) =>
    Alert.alert('Excluir registro', `${formatDateBR(w.date)} · ${fmt(w.weightKg)} kg`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          await removeWeight(user.uid, w.id);
          load();
        },
      },
    ]);

  const pctWeek = data.rate && data.avg ? (data.rate / data.avg) * 100 : null;

  const header = (
    <View>
      <View style={styles.form}>
        <View style={{ flex: 1.3 }}>
          <Input label="Peso (kg)" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="0,0" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="% gordura" value={bf} onChangeText={setBf} keyboardType="decimal-pad" placeholder="opcional" />
        </View>
      </View>
      <Input label="Data" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />
      <Button title="Salvar peso" onPress={save} loading={saving} />
      <View style={{ height: spacing.lg }} />
      <View style={styles.stats}>
        <Stat label="Atual" value={data.current ? `${fmt(data.current)} kg` : '-'} />
        <Stat label="Média 7d" value={data.avg ? `${fmt(data.avg)} kg` : '-'} />
        <Stat
          label="Tendência/sem"
          value={data.rate !== null ? `${data.rate > 0 ? '+' : ''}${fmt(data.rate)} kg` : '-'}
        />
      </View>
      {pctWeek !== null && (
        <Text style={styles.note}>
          {pctWeek > 0 ? '+' : ''}
          {pctWeek.toFixed(2).replace('.', ',')}% do peso por semana (regressão linear, últimos 28 dias)
        </Text>
      )}
      <Chips options={rangeOpts} value={range} onChange={setRange} />
      <View style={styles.chart}>
        <LineChart raw={data.raw} trend={data.trend} target={target} />
        <View style={styles.legend}>
          <Text style={styles.legendText}>● Peso diário</Text>
          <Text style={[styles.legendText, { color: colors.primary }]}>━ Média móvel 7d</Text>
          {target && <Text style={[styles.legendText, { color: colors.success }]}>┅ Meta</Text>}
        </View>
      </View>
      <Text style={styles.section}>Registros</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        data={[...list].reverse()}
        keyExtractor={(w) => w.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState icon="speedometer-outline" title="Nenhum peso registrado" hint="Informe seu peso acima para ver a tendência." />}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => remove(item)} style={styles.row}>
            <Text style={styles.rowDate}>{formatDateBR(item.date)}</Text>
            {!!item.bodyFatPct && <Text style={styles.rowBf}>{fmt(item.bodyFatPct)}% BF</Text>}
            <Text style={styles.rowKg}>{fmt(item.weightKg)} kg</Text>
          </Pressable>
        )}
      />
    </View>
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
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  form: { flexDirection: 'row', gap: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  note: { color: colors.muted, fontSize: 12, marginBottom: spacing.md },
  chart: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  legend: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  legendText: { color: colors.muted, fontSize: 11 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowDate: { color: colors.text, flex: 1, fontSize: 15 },
  rowBf: { color: colors.muted, fontSize: 12, marginRight: spacing.md },
  rowKg: { color: colors.text, fontSize: 16, fontWeight: '800' },
});