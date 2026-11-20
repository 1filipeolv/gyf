import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import Button from '../components/Button';
import Chips from '../components/Chips';
import BarChart from '../components/BarChart';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { useTargets } from '../hooks/useTargets';
import { saveDailyLog } from '../services/dailyLogs';
import { macroKcal, macroKcalGap, parseMacros } from '../utils/nutrition';
import { foodDay, monthStartKey, periodBalance, weekStartKey } from '../utils/foodStatus';
import { parseNum } from '../utils/workout';
import { addDays, formatDateBR, toDateKey } from '../utils/date';
import { cancelFoodReminder, ensureNotificationPermission, scheduleFoodReminder } from '../utils/notify';
import { DEFAULT_FOOD_HOUR, FOOD_REMINDER_KEY, readFoodReminder } from '../utils/reminders';
import { toast } from '../utils/toast';
import { haptic } from '../utils/haptics';
import Tutorial from '../components/Tutorial';
import { colors, radius, spacing } from '../theme';

const HOURS = [20, 21, 22, 23].map((h) => ({ key: String(h), label: `${h}h` }));
const WD = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const n0 = (v: number) => Math.round(v).toLocaleString('pt-BR');
const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n0(Math.abs(v))}`;
const str = (n?: number) => (n ? String(n).replace('.', ',') : '');
const avg = (vals: number[]) => (vals.length ? n0(vals.reduce((a, b) => a + b, 0) / vals.length) : '—');

export default function NutritionScreen() {
  const { user } = useAuth();
  const dash = useDashboard();
  const target = useTargets(dash);
  const today = toDateKey();
  const [date, setDate] = useState(today);
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');
  const [paste, setPaste] = useState('');
  const [full, setFull] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminder, setReminder] = useState<number | null>(DEFAULT_FOOD_HOUR);

  const logs = dash.dailyLogs;
  const dayLog = logs.find((l) => l.date === date);

  const fill = useCallback(() => {
    setKcal(str(dayLog?.kcal));
    setProtein(str(dayLog?.proteinG));
    setCarb(str(dayLog?.carbG));
    setFat(str(dayLog?.fatG));
    setNotes(dayLog?.foodNotes ?? '');
    setPaste('');
    if (dayLog?.carbG || dayLog?.fatG) setFull(true);
  }, [dayLog]);

  useEffect(() => {
    if (!dash.loading) fill();
  }, [date, dash.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      readFoodReminder().then(setReminder);
    }, [])
  );

  const move = (delta: number) => {
    const next = addDays(date, delta);
    if (next > today) return;
    haptic.select();
    setDate(next);
  };

  const extract = () => {
    const m = parseMacros(paste);
    let n = 0;
    if (m.kcal !== null) (setKcal(str(m.kcal)), n++);
    if (m.proteinG !== null) (setProtein(str(m.proteinG)), n++);
    if (m.carbG !== null) (setCarb(str(m.carbG)), setFull(true), n++);
    if (m.fatG !== null) (setFat(str(m.fatG)), setFull(true), n++);
    if (n === 0) return toast.info('Não encontrei números no texto');
    haptic.success();
    toast.success(`${n} de 4 valores preenchidos. Confira antes de salvar`);
  };

  const k = parseNum(kcal);
  const p = parseNum(protein);
  const c = parseNum(carb);
  const f = parseNum(fat);
  const gap = macroKcalGap(k, p, c, f);

  const save = async () => {
    if (!user) return;
    if (!k || k > 10000) return Alert.alert('Calorias inválidas', 'Informe de 1 a 10000 kcal.');
    if (protein && p > 1000) return Alert.alert('Proteína inválida', 'Informe até 1000 g.');
    if (carb && c > 1000) return Alert.alert('Carboidrato inválido', 'Informe até 1000 g.');
    if (fat && f > 1000) return Alert.alert('Gordura inválida', 'Informe até 1000 g.');
    setSaving(true);
    try {
      await saveDailyLog(user.uid, date, {
        kcal: Math.round(k),
        proteinG: p ? Math.round(p * 10) / 10 : undefined,
        carbG: c ? Math.round(c * 10) / 10 : undefined,
        fatG: f ? Math.round(f * 10) / 10 : undefined,
        foodNotes: notes.trim() || undefined,
        foodLoggedAt: Date.now(),
      });
      toast.success(date < today ? 'Salvo (marcado como atrasado)' : 'Alimentação salva');
      await dash.reload();
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (on: boolean) => {
    if (!on) {
      setReminder(null);
      await AsyncStorage.setItem(FOOD_REMINDER_KEY, 'off').catch(() => {});
      await cancelFoodReminder();
      return;
    }
    if (!(await ensureNotificationPermission())) return toast.error('Permita as notificações nas configurações do aparelho');
    setReminder(DEFAULT_FOOD_HOUR);
    await AsyncStorage.setItem(FOOD_REMINDER_KEY, String(DEFAULT_FOOD_HOUR)).catch(() => {});
    await scheduleFoodReminder(DEFAULT_FOOD_HOUR);
  };

  const changeHour = async (h: number) => {
    setReminder(h);
    await AsyncStorage.setItem(FOOD_REMINDER_KEY, String(h)).catch(() => {});
    await scheduleFoodReminder(h);
  };

  const tk = target?.kcal ?? null;
  const week = useMemo(() => periodBalance(logs, weekStartKey(today), today, tk), [logs, today, tk]);
  const month = useMemo(() => periodBalance(logs, monthStartKey(today), today, tk), [logs, today, tk]);
  const days7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => foodDay(logs.find((l) => l.date === addDays(today, i - 6)), addDays(today, i - 6), tk)),
    [logs, today, tk]
  );
  const todayFd = foodDay(logs.find((l) => l.date === today), today, tk);

  const series = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(today, -13 + i);
        const l = logs.find((x) => x.date === d);
        return { label: d.slice(8), kcal: l?.kcal ?? 0, protein: l?.proteinG ?? 0 };
      }),
    [logs, today]
  );
  const kcalDays = series.filter((s) => s.kcal);
  const protDays = series.filter((s) => s.protein);

  const color = (s: 'pending' | 'ok' | 'over') => (s === 'ok' ? colors.success : s === 'over' ? colors.warning : colors.border);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Tutorial id="nutrition" steps={[{ title: 'Alimentação', text: 'O obrigatório é a kcal total do dia. Calcule com a outra IA, cole o texto aqui e toque em extrair.' }, { title: 'Saldo e atrasos', text: 'Dia sem registro fica pendente. Registro feito depois do dia aparece como atrasado, mas conta no saldo.' }]} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Meta e saldo</Text>
        {tk ? (
          <>
            <Text style={styles.meta}>
              Meta {n0(tk)} kcal · hoje {todayFd.kcal === null ? 'pendente' : `${n0(todayFd.kcal)} (${sg(todayFd.delta ?? 0)})`}
            </Text>
            <View style={styles.kpis}>
              <Kpi label={`Semana (${week.logged} dias)`} value={sg(week.saldo)} warn={week.saldo > 0} />
              <Kpi label={`Mês (${month.logged} dias)`} value={sg(month.saldo)} warn={month.saldo > 0} />
              <Kpi label="Excesso na semana" value={week.excess ? `+${n0(week.excess)}` : '0'} warn={week.excess > 0} />
            </View>
            {week.excess > 0 && (
              <Text style={styles.hint}>
                Você comeu {n0(week.excess)} kcal acima da meta nos dias em que passou; isso desloca o saldo semanal em {sg(week.saldo)} kcal.
              </Text>
            )}
            {week.pendingPast > 0 && <Text style={styles.hint}>{week.pendingPast} dia(s) pendente(s) nesta semana, fora do saldo.</Text>}
          </>
        ) : (
          <Text style={styles.hint}>A meta aparece quando o perfil (sexo, nascimento, altura) e o peso estiverem preenchidos. Veja Balanço.</Text>
        )}
        <View style={styles.days}>
          {days7.map((d) => (
            <View key={d.date} style={styles.dayCol}>
              <View style={[styles.dayDot, { backgroundColor: color(d.status) }]}>
                {d.late && <Ionicons name="time" size={12} color="#000" />}
              </View>
              <Text style={styles.dayLbl}>{WD[new Date(d.date + 'T12:00:00').getDay()]}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.hint}>Cinza = pendente · verde = dentro da meta · amarelo = acima · relógio = lançado depois do dia</Text>
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => move(-1)} style={styles.navBtn} hitSlop={6}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.date}>{date === today ? 'Hoje' : formatDateBR(date)}</Text>
          {date !== today && <Text style={styles.dateHint}>Registro atrasado</Text>}
        </View>
        <Pressable onPress={() => move(1)} disabled={date >= today} style={[styles.navBtn, date >= today && { opacity: 0.3 }]} hitSlop={6}>
          <Ionicons name="chevron-forward" size={26} color={colors.text} />
        </Pressable>
      </View>

      <Input label="Calorias do dia (kcal) · obrigatório" value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="Ex: 2300" />
      <Input
        label={`Proteína (g) · recomendado${target ? ` · meta ${target.proteinG} g` : ''}`}
        value={protein}
        onChangeText={setProtein}
        keyboardType="decimal-pad"
      />
      <Input
        label="Texto da IA (opcional)"
        value={paste}
        onChangeText={setPaste}
        multiline
        placeholder="Cole o resumo com calorias e macros"
        style={{ height: 88, paddingTop: spacing.sm, textAlignVertical: 'top' }}
      />
      <Button title="Extrair números do texto" variant="ghost" onPress={extract} />

      <Pressable onPress={() => setFull((v) => !v)} style={styles.toggle}>
        <Text style={styles.toggleText}>Macros completos e notas (opcional)</Text>
        <Ionicons name={full ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </Pressable>
      {full && (
        <View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Input label="Carbo (g)" value={carb} onChangeText={setCarb} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Gordura (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
            </View>
          </View>
          {gap !== null && gap > 0.15 && (
            <Text style={styles.warn}>
              Pelos macros (4P + 4C + 9G) o total seria ≈ {macroKcal(p, c, f)} kcal, mas você informou {Math.round(k)}. Confira.
            </Text>
          )}
          <Input
            label="O que comeu"
            value={notes}
            onChangeText={setNotes}
            multiline
            autoCapitalize="sentences"
            style={{ height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' }}
          />
        </View>
      )}
      <Text style={styles.hint}>Tudo é estimativa. Campos vazios não alteram o que já está salvo.</Text>
      <Button title="Salvar" onPress={save} loading={saving} />

      <Text style={styles.section}>Últimos 14 dias</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Calorias · média {avg(kcalDays.map((s) => s.kcal))} kcal</Text>
        <BarChart data={series.map((s) => ({ label: s.label, value: s.kcal }))} format={(v) => String(Math.round(v))} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Proteína (g) · média {avg(protDays.map((s) => s.protein))}</Text>
        <BarChart data={series.map((s) => ({ label: s.label, value: s.protein }))} format={(v) => String(Math.round(v))} />
      </View>

      <View style={styles.card}>
        <View style={styles.remRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Lembrete diário da kcal</Text>
            <Text style={styles.hint}>Ligado por padrão, todo dia no horário escolhido.</Text>
          </View>
          <Switch value={reminder !== null} onValueChange={toggleReminder} trackColor={{ true: colors.primary }} />
        </View>
        {reminder !== null && <Chips options={HOURS} value={String(reminder)} onChange={(x) => changeHour(Number(x))} />}
      </View>
      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.kpiV, warn && { color: colors.warning }]}>{value}</Text>
      <Text style={styles.kpiL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  nav: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.sm },
  navBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  date: { color: colors.text, fontSize: 22, fontWeight: '800' },
  dateHint: { color: colors.warning, fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm, marginBottom: spacing.xs },
  warn: { color: colors.warning, fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
  row2: { flexDirection: 'row', gap: spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  toggleText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.text, fontSize: 14, marginTop: spacing.sm },
  kpis: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  kpiV: { color: colors.text, fontSize: 20, fontWeight: '800' },
  kpiL: { color: colors.muted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  days: { flexDirection: 'row', marginTop: spacing.md },
  dayCol: { flex: 1, alignItems: 'center' },
  dayDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayLbl: { color: colors.muted, fontSize: 11, marginTop: 4 },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
