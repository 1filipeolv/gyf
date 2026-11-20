import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import Button from '../components/Button';
import Tutorial from '../components/Tutorial';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { saveWeight } from '../services/weights';
import { saveMeasurement } from '../services/measurements';
import { SITE_LABELS, SITE_LIST } from '../constants/measurements';
import { MeasurementSite } from '../types';
import { RootStackParamList } from '../navigation/types';
import { checkinState } from '../utils/checkin';
import { formatDateBR, toDateKey } from '../utils/date';
import { parseNum } from '../utils/workout';
import { toast } from '../utils/toast';
import { colors, radius, spacing } from '../theme';

const MAIN: MeasurementSite[] = ['chest', 'waist', 'abdomen', 'hips', 'bicepLeft', 'bicepRight', 'thighLeft', 'thighRight'];
const OTHERS = SITE_LIST.filter((s) => !MAIN.includes(s));
const fmt = (n?: number) => (n ? String(n).replace('.', ',') : '');

export default function CheckinScreen() {
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dash = useDashboard();
  const today = toDateKey();
  const st = useMemo(() => checkinState(dash.weights, dash.measurements, today), [dash.weights, dash.measurements, today]);
  const [kg, setKg] = useState('');
  const [vals, setVals] = useState<Partial<Record<MeasurementSite, string>>>({});
  const [all, setAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const lastW = dash.weights[dash.weights.length - 1];
  const lastM = dash.measurements[dash.measurements.length - 1];

  useEffect(() => {
    if (dash.loading || ready) return;
    const w = dash.weights.find((x) => x.date === st.due);
    const m = dash.measurements.find((x) => x.date === st.due);
    setKg(fmt(w?.weightKg));
    setVals(Object.fromEntries(Object.entries(m?.values ?? {}).map(([k, v]) => [k, fmt(v)])));
    setReady(true);
  }, [dash.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!user) return;
    const w = parseNum(kg);
    if (!w || w < 20 || w > 400) return Alert.alert('Peso inválido', 'Informe o peso em kg (20 a 400).');
    const values: Partial<Record<MeasurementSite, number>> = {};
    for (const s of SITE_LIST) {
      const raw = vals[s];
      if (!raw) continue;
      const v = parseNum(raw);
      if (!v || v < 5 || v > 300) return Alert.alert('Medida inválida', `${SITE_LABELS[s]}: informe em cm (5 a 300).`);
      values[s] = v;
    }
    if (!Object.keys(values).length) return Alert.alert('Medidas', 'Informe ao menos uma medida.');
    setSaving(true);
    try {
      const now = Date.now();
      await saveWeight(user.uid, st.due, w, undefined, now);
      await saveMeasurement(user.uid, st.due, values, now);
      toast.success(st.late ? 'Check-in salvo (atrasado)' : 'Check-in salvo');
      nav.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  const field = (s: MeasurementSite) => (
    <View key={s} style={{ width: '48%' }}>
      <Input
        label={`${SITE_LABELS[s]} (cm)`}
        value={vals[s] ?? ''}
        onChangeText={(t) => setVals((v) => ({ ...v, [s]: t }))}
        keyboardType="decimal-pad"
        placeholder={fmt(lastM?.values[s])}
      />
    </View>
  );

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Tutorial
        id="checkin"
        steps={[
          { title: 'Check-in da semana', text: 'Todo domingo registre peso e medidas. É o que alimenta seus gráficos e a análise.' },
          { title: 'Sem pressão', text: 'Esqueceu? Registre na segunda ou depois, ele só fica marcado como atrasado. O app nunca trava.' },
        ]}
      />
      <Text style={styles.title}>Semana de {formatDateBR(st.due)}</Text>
      {st.late && <Text style={styles.late}>Registro atrasado: será gravado na data do domingo, marcado como atrasado.</Text>}
      {st.done && <Text style={styles.done}>Check-in desta semana já concluído. Você pode corrigir os valores abaixo.</Text>}

      <Input label="Peso (kg)" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder={fmt(lastW?.weightKg)} />

      <Text style={styles.section}>Medidas</Text>
      <View style={styles.grid}>{MAIN.map(field)}</View>
      <Pressable onPress={() => setAll((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>Outras medidas</Text>
        <Ionicons name={all ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </Pressable>
      {all && <View style={styles.grid}>{OTHERS.map(field)}</View>}

      <Pressable onPress={() => nav.navigate('Photos')} style={styles.photo}>
        <Ionicons name="camera-outline" size={22} color={colors.text} />
        <Text style={styles.photoText}>Adicionar foto (opcional)</Text>
      </Pressable>

      <Button title="Salvar check-in" onPress={save} loading={saving} />
      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.sm },
  late: { color: colors.warning, fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
  done: { color: colors.success, fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  toggleText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  photo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  photoText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
