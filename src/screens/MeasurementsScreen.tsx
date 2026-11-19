import React, { useCallback, useMemo, useState } from 'react';
import { toast } from '../utils/toast';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../components/Input';
import Button from '../components/Button';
import Chips from '../components/Chips';
import LineChart from '../components/LineChart';
import { useAuth } from '../contexts/AuthContext';
import { listMeasurements, removeMeasurement, saveMeasurement } from '../services/measurements';
import { Measurement, MeasurementSite } from '../types';
import { SITE_LABELS, SITE_LIST } from '../constants/measurements';
import { Pt } from '../utils/trend';
import { parseNum } from '../utils/workout';
import { formatDateBR, fromDateKey, toDateKey } from '../utils/date';
import { colors, radius, spacing } from '../theme';

const siteOpts = SITE_LIST.map((k) => ({ key: k, label: SITE_LABELS[k] }));
const fmt = (v: number) => v.toFixed(1).replace('.', ',');

export default function MeasurementsScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Measurement[]>([]);
  const [date, setDate] = useState(toDateKey());
  const [inputs, setInputs] = useState<Partial<Record<MeasurementSite, string>>>({});
  const [site, setSite] = useState<MeasurementSite>('waist');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setList(await listMeasurements(user.uid));
    } catch {}
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const series = useMemo(() => {
    const pts: Pt[] = list
      .filter((m) => m.values[site])
      .map((m) => ({ x: fromDateKey(m.date).getTime(), y: m.values[site] as number }));
    const first = pts[0]?.y;
    const last = pts[pts.length - 1]?.y;
    return { pts, first, last, diff: first !== undefined && last !== undefined ? last - first : null };
  }, [list, site]);

  const prefill = (m: Measurement) => {
    setDate(m.date);
    const next: Partial<Record<MeasurementSite, string>> = {};
    SITE_LIST.forEach((s) => {
      if (m.values[s]) next[s] = String(m.values[s]).replace('.', ',');
    });
    setInputs(next);
  };

  const save = async () => {
    if (!user) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > toDateKey())
      return Alert.alert('Data inválida', 'Use AAAA-MM-DD, sem datas futuras.');
    const values: Partial<Record<MeasurementSite, number>> = {};
    SITE_LIST.forEach((s) => {
      const v = parseNum(inputs[s] ?? '');
      if (v >= 5 && v <= 250) values[s] = v;
    });
    if (!Object.keys(values).length) return Alert.alert('Informe ao menos uma medida (cm).');
    setSaving(true);
    try {
      await saveMeasurement(user.uid, date, values);
      setInputs({});
      setDate(toDateKey());
      await load();
      toast.success('Medições salvas');
    } catch {
      toast.error('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (m: Measurement) =>
    Alert.alert('Excluir medições', formatDateBR(m.date), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          await removeMeasurement(user.uid, m.id);
          load();
        },
      },
    ]);

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{ padding: spacing.lg }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Input label="Data" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />
      <View style={styles.grid}>
        {SITE_LIST.map((s) => (
          <View key={s} style={styles.cell}>
            <Text style={styles.label}>{SITE_LABELS[s]}</Text>
            <TextInput
              style={styles.input}
              value={inputs[s] ?? ''}
              onChangeText={(t) => setInputs((p) => ({ ...p, [s]: t }))}
              keyboardType="decimal-pad"
              placeholder="cm"
              placeholderTextColor={colors.muted}
              selectTextOnFocus
            />
          </View>
        ))}
      </View>
      <Button title="Salvar medições" onPress={save} loading={saving} />

      <Text style={styles.section}>Evolução</Text>
      <Chips options={siteOpts} value={site} onChange={setSite} />
      <View style={styles.stats}>
        <Stat label="Primeira" value={series.first ? `${fmt(series.first)} cm` : '-'} />
        <Stat label="Atual" value={series.last ? `${fmt(series.last)} cm` : '-'} />
        <Stat
          label="Variação"
          value={series.diff !== null ? `${series.diff > 0 ? '+' : ''}${fmt(series.diff)} cm` : '-'}
        />
      </View>
      <View style={styles.chart}>
        {series.pts.length ? (
          <LineChart raw={series.pts} trend={series.pts.length > 1 ? series.pts : []} />
        ) : (
          <Text style={styles.empty}>Sem dados para {SITE_LABELS[site].toLowerCase()}.</Text>
        )}
      </View>

      <Text style={styles.section}>Registros</Text>
      {[...list].reverse().map((m) => (
        <Pressable key={m.id} onPress={() => prefill(m)} onLongPress={() => remove(m)} style={styles.row}>
          <Text style={styles.rowDate}>{formatDateBR(m.date)}</Text>
          <Text style={styles.rowMeta}>{Object.keys(m.values).length} medidas</Text>
        </Pressable>
      ))}
      {!list.length && <Text style={styles.empty}>Nenhuma medição registrada.</Text>}
      <Text style={styles.hint}>Toque para editar · segure para excluir</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  cell: { width: '48.5%' },
  label: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  input: {
    height: 46,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.sm },
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
  chart: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 60,
    justifyContent: 'center',
  },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowDate: { color: colors.text, flex: 1, fontSize: 15 },
  rowMeta: { color: colors.muted, fontSize: 13 },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
});