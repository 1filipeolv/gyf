import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import Input from '../components/Input';
import PairBars from '../components/PairBars';
import { useDashboard } from '../hooks/useDashboard';
import { RootStackParamList } from '../navigation/types';
import { dayEnergy, lastDays, learnedTdee, missingProfile, weightOn } from '../utils/balance';
import { computeTargets, GOAL_RULES, GoalKey, Targets } from '../utils/energy';
import { parseNum } from '../utils/workout';
import { toDateKey } from '../utils/date';
import { toast } from '../utils/toast';
import { colors, radius, spacing } from '../theme';

const KEY = 'energy_targets';
type Overrides = { kcal?: number; proteinG?: number; fatG?: number };

const n0 = (v: number) => Math.round(v).toLocaleString('pt-BR');
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n0(Math.abs(v))}`;

export default function BalanceScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dash = useDashboard();
  const today = toDateKey();
  const [over, setOver] = useState<Overrides>({});
  const [kcalT, setKcalT] = useState('');
  const [protT, setProtT] = useState('');
  const [fatT, setFatT] = useState('');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY)
        .then((v) => {
          const o: Overrides = v ? JSON.parse(v) : {};
          setOver(o);
          setKcalT(o.kcal ? String(o.kcal) : '');
          setProtT(o.proteinG ? String(o.proteinG) : '');
          setFatT(o.fatG ? String(o.fatG) : '');
        })
        .catch(() => {});
    }, [])
  );

  const inp = useMemo(
    () => ({
      profile: dash.profile,
      weights: dash.weights,
      workouts: dash.workouts,
      activities: dash.activities,
      dailyLogs: dash.dailyLogs,
    }),
    [dash.profile, dash.weights, dash.workouts, dash.activities, dash.dailyLogs]
  );

  const missing = missingProfile(dash.profile, dash.weights.length > 0);
  const todayE = useMemo(() => dayEnergy(today, inp), [today, inp]);
  const days = useMemo(() => lastDays(today, 7, inp), [today, inp]);
  const tdee = useMemo(() => learnedTdee(dash.weights, dash.dailyLogs, today), [dash.weights, dash.dailyLogs, today]);

  const withBal = days.filter((d) => d.balance !== null);
  const avgBal = withBal.length ? withBal.reduce((a, d) => a + (d.balance as number), 0) / withBal.length : null;
  const avgExp = days.length ? days.reduce((a, d) => a + d.total, 0) / days.length : 0;
  const weightKg = weightOn(dash.weights, today);

  const base = useMemo(() => {
    if (!todayE || !weightKg) return null;
    if (tdee.ok) return { value: tdee.value.tdee, source: 'gasto real aprendido' };
    return { value: Math.max(Math.round(avgExp), Math.round(todayE.bmr * 1.2)), source: 'gasto estimado dos últimos 7 dias (mínimo TMB × 1,2)' };
  }, [todayE, weightKg, tdee, avgExp]);

  const auto: Targets | null = useMemo(
    () =>
      base && todayE && weightKg
        ? computeTargets((dash.profile?.goal ?? 'maintenance') as GoalKey, base.value, weightKg, todayE.bmr)
        : null,
    [base, todayE, weightKg, dash.profile?.goal]
  );

  const shown = auto
    ? (() => {
        const kcal = over.kcal ?? auto.kcal;
        const proteinG = over.proteinG ?? auto.proteinG;
        const fatG = over.fatG ?? auto.fatG;
        return { kcal, proteinG, fatG, carbG: Math.max(0, Math.round((kcal - 4 * proteinG - 9 * fatG) / 4)) };
      })()
    : null;

  const saveOver = async () => {
    const o: Overrides = {};
    const k = Math.round(parseNum(kcalT));
    const p = Math.round(parseNum(protT));
    const f = Math.round(parseNum(fatT));
    if (kcalT && (k < 800 || k > 8000)) return toast.error('Calorias entre 800 e 8000');
    if (protT && (p < 20 || p > 500)) return toast.error('Proteína entre 20 e 500 g');
    if (fatT && (f < 10 || f > 300)) return toast.error('Gordura entre 10 e 300 g');
    if (k) o.kcal = k;
    if (p) o.proteinG = p;
    if (f) o.fatG = f;
    setOver(o);
    await AsyncStorage.setItem(KEY, JSON.stringify(o)).catch(() => {});
    toast.success('Metas salvas');
  };

  const resetOver = async () => {
    setOver({});
    setKcalT('');
    setProtT('');
    setFatT('');
    await AsyncStorage.removeItem(KEY).catch(() => {});
    toast.info('Metas automáticas');
  };

  if (dash.loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );

  if (missing.length)
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Complete o perfil para ver o balanço</Text>
          <Text style={styles.hint}>
            O cálculo usa a taxa metabólica basal (Mifflin-St Jeor). Falta: {missing.join(', ')}. Sem esses dados o app não mostra números.
          </Text>
          <Button title="Abrir perfil" onPress={() => nav.navigate('Tabs', { screen: 'Profile' })} />
        </View>
      </ScrollView>
    );

  const chart = days.map((d) => ({ label: d.date.slice(8), a: d.intake ?? 0, b: Math.round(d.total) }));
  const goalRule = GOAL_RULES[(dash.profile?.goal ?? 'maintenance') as GoalKey];

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.warn}>Tudo aqui é estimativa. Use como tendência, não como medição exata.</Text>

      <Text style={styles.section}>Hoje</Text>
      {todayE && (
        <View style={styles.card}>
          <View style={styles.kpis}>
            <Kpi label="Ingestão" value={todayE.intake === null ? '—' : `${n0(todayE.intake)}`} />
            <Kpi label="Gasto" value={n0(todayE.total)} />
            <Kpi
              label="Balanço"
              value={todayE.balance === null ? '—' : signed(todayE.balance)}
              color={todayE.balance === null ? undefined : todayE.balance > 0 ? colors.warning : colors.success}
            />
          </View>
          {todayE.balance !== null ? (
            <Text style={styles.hint}>
              Faixa de incerteza: {signed(todayE.balance - todayE.band)} a {signed(todayE.balance + todayE.band)} kcal.
            </Text>
          ) : (
            <Pressable onPress={() => nav.navigate('Nutrition')}>
              <Text style={styles.link}>Sem alimentação hoje. Registrar kcal e macros</Text>
            </Pressable>
          )}
          <Text style={styles.hint}>
            Gasto = TMB {n0(todayE.bmr)} + treino {n0(todayE.workout)} + atividades {n0(todayE.activity)} + passos {n0(todayE.steps)}
            {todayE.stepsCounted > 0 ? ` (${n0(todayE.stepsCounted)} passos, sem contar os já presentes nas atividades)` : ''}.
          </Text>
        </View>
      )}

      <Text style={styles.section}>Últimos 7 dias</Text>
      <View style={styles.card}>
        <PairBars data={chart} aLabel="Ingestão" bLabel="Gasto estimado" />
        <Text style={[styles.hint, { marginTop: spacing.sm }]}>
          {avgBal === null
            ? 'Registre a alimentação para ver o balanço médio.'
            : `Balanço médio: ${signed(avgBal)} kcal/dia (${withBal.length} de ${days.length} dias com alimentação). Gasto médio ${n0(avgExp)} kcal.`}
        </Text>
      </View>

      <Pressable onPress={() => nav.navigate('RealExpenditure')} style={styles.linkCard}>
        <Ionicons name="trending-up-outline" size={22} color={colors.text} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Gasto real estimado</Text>
          <Text style={styles.hint2}>
            {tdee.ok
              ? `${n0(tdee.value.tdee)} kcal/dia · confiança ${tdee.value.confidence === 'high' ? 'alta' : 'média'}`
              : 'Aprendido de peso + ingestão. Ainda sem dados suficientes.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      <Text style={styles.section}>Metas</Text>
      {auto && shown ? (
        <View style={styles.card}>
          <View style={styles.kpis}>
            <Kpi label="Kcal" value={n0(shown.kcal)} />
            <Kpi label="Proteína g" value={String(shown.proteinG)} />
            <Kpi label="Gordura g" value={String(shown.fatG)} />
            <Kpi label="Carbo g" value={String(shown.carbG)} />
          </View>
          {todayE?.intake != null && (
            <Text style={styles.hint}>
              Hoje: {n0(todayE.intake)} de {n0(shown.kcal)} kcal ({Math.round((todayE.intake / shown.kcal) * 100)}%).
            </Text>
          )}
          <Text style={styles.hint}>
            Kcal: referência de {n0(base!.value)} kcal ({base!.source}) com {goalRule.label.toLowerCase()}
            {auto.flooredToBmr ? '; limitada à TMB por segurança' : ''}.
          </Text>
          <Text style={styles.hint}>
            Proteína: {auto.proteinRangeG[0]} a {auto.proteinRangeG[1]} g/dia é a faixa para o seu objetivo; a meta automática fica em
            {' '}{auto.proteinG} g. Gordura: no mínimo 0,8 g/kg e 20% das kcal. Carboidrato: o que sobra.
          </Text>
          <Text style={styles.label}>Editar (vazio = automático)</Text>
          <Input label="Calorias (kcal)" value={kcalT} onChangeText={setKcalT} keyboardType="number-pad" placeholder={String(auto.kcal)} />
          <Input label="Proteína (g)" value={protT} onChangeText={setProtT} keyboardType="number-pad" placeholder={String(auto.proteinG)} />
          <Input label="Gordura (g)" value={fatT} onChangeText={setFatT} keyboardType="number-pad" placeholder={String(auto.fatG)} />
          <Button title="Salvar metas" onPress={saveOver} />
          <View style={{ height: spacing.sm }} />
          <Button title="Voltar ao automático" variant="ghost" onPress={resetOver} />
        </View>
      ) : (
        <Text style={styles.hint}>Metas indisponíveis sem peso e perfil.</Text>
      )}
      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  warn: { color: colors.warning, fontSize: 12, lineHeight: 17 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  hint2: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: spacing.sm, minHeight: 44, textAlignVertical: 'center' },
  kpis: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, alignItems: 'center' },
  kpiValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  kpiLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 60,
  },
});
