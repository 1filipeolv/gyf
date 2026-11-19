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
import { getDailyLog, listDailyLogs, saveDailyLog } from '../services/dailyLogs';
import { DailyLog } from '../types';
import { macroKcal, macroKcalGap, parseMacros } from '../utils/nutrition';
import { parseNum } from '../utils/workout';
import { addDays, formatDateBR, toDateKey } from '../utils/date';
import { cancelFoodReminder, ensureNotificationPermission, scheduleFoodReminder } from '../utils/notify';
import { toast } from '../utils/toast';
import { haptic } from '../utils/haptics';
import { colors, radius, spacing } from '../theme';

const REMINDER_KEY = 'food_reminder_hour';
const HOURS = [20, 21, 22, 23].map((h) => ({ key: String(h), label: `${h}h` }));

const avg = (vals: number[], digits = 0) =>
  vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(digits).replace('.', ',') : '—';

const str = (n?: number) => (n ? String(n).replace('.', ',') : '');

export default function NutritionScreen() {
  const { user } = useAuth();
  const today = toDateKey();
  const [date, setDate] = useState(today);
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');
  const [paste, setPaste] = useState('');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [reminder, setReminder] = useState<number | null>(null);

  const loadDay = useCallback(async () => {
    if (!user) return;
    try {
      const l = await getDailyLog(user.uid, date);
      setKcal(str(l?.kcal));
      setProtein(str(l?.proteinG));
      setCarb(str(l?.carbG));
      setFat(str(l?.fatG));
      setNotes(l?.foodNotes ?? '');
      setPaste('');
    } catch {}
  }, [user, date]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      setLogs(await listDailyLogs(user.uid, addDays(today, -13), today));
    } catch {}
  }, [user, today]);

  useFocusEffect(
    useCallback(() => {
      loadDay();
      loadHistory();
    }, [loadDay, loadHistory])
  );

  useEffect(() => {
    AsyncStorage.getItem(REMINDER_KEY)
      .then((v) => v && setReminder(Number(v)))
      .catch(() => {});
  }, []);

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
    if (m.carbG !== null) (setCarb(str(m.carbG)), n++);
    if (m.fatG !== null) (setFat(str(m.fatG)), n++);
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
      });
      toast.success('Alimentação salva');
      await loadHistory();
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (on: boolean) => {
    if (!on) {
      setReminder(null);
      await AsyncStorage.removeItem(REMINDER_KEY).catch(() => {});
      await cancelFoodReminder();
      return;
    }
    if (!(await ensureNotificationPermission())) {
      toast.error('Permita as notificações nas configurações do aparelho');
      return;
    }
    setReminder(22);
    await AsyncStorage.setItem(REMINDER_KEY, '22').catch(() => {});
    await scheduleFoodReminder(22);
  };

  const changeHour = async (h: number) => {
    setReminder(h);
    await AsyncStorage.setItem(REMINDER_KEY, String(h)).catch(() => {});
    await scheduleFoodReminder(h);
  };

  const series = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(today, -13 + i);
        const l = logs.find((x) => x.date === d);
        return { date: d, label: d.slice(8), kcal: l?.kcal ?? 0, protein: l?.proteinG ?? 0 };
      }),
    [logs, today]
  );
  const last7 = series.slice(-7);
  const kcalDays = series.filter((s) => s.kcal);
  const protDays = series.filter((s) => s.protein);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.nav}>
        <Pressable onPress={() => move(-1)} style={styles.navBtn} hitSlop={6}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.date}>{date === today ? 'Hoje' : formatDateBR(date)}</Text>
          {date !== today && <Text style={styles.dateHint}>{date}</Text>}
        </View>
        <Pressable onPress={() => move(1)} disabled={date >= today} style={[styles.navBtn, date >= today && { opacity: 0.3 }]} hitSlop={6}>
          <Ionicons name="chevron-forward" size={26} color={colors.text} />
        </Pressable>
      </View>

      <Text style={styles.hint}>
        No fim do dia, calcule o total com outra IA e cole o texto abaixo (ou digite os números). Tudo é estimativa.
      </Text>
      <Input
        label="Texto da IA (opcional)"
        value={paste}
        onChangeText={setPaste}
        multiline
        placeholder="Cole aqui o resumo com calorias e macros"
        style={{ height: 96, paddingTop: spacing.sm, textAlignVertical: 'top' }}
      />
      <Button title="Extrair números do texto" variant="ghost" onPress={extract} />
      <View style={{ height: spacing.md }} />

      <Input label="Calorias (kcal)" value={kcal} onChangeText={setKcal} keyboardType="number-pad" placeholder="Ex: 2300" />
      <View style={styles.row3}>
        <View style={{ flex: 1 }}>
          <Input label="Proteína (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Carbo (g)" value={carb} onChangeText={setCarb} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Gordura (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
        </View>
      </View>
      {gap !== null && gap > 0.15 && (
        <Text style={styles.warn}>
          Pelos macros (4P + 4C + 9G) o total seria ≈ {macroKcal(p, c, f)} kcal, mas você informou {Math.round(k)}. Confira os números.
        </Text>
      )}
      <Input
        label="O que comeu (opcional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Resumo livre do dia"
        autoCapitalize="sentences"
        style={{ height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' }}
      />
      <Text style={styles.hint}>Campos de macros vazios não são alterados. Salvar de novo na mesma data atualiza o dia.</Text>
      <Button title="Salvar" onPress={save} loading={saving} />

      <Text style={styles.section}>Últimos 14 dias</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Calorias · média {avg(kcalDays.map((s) => s.kcal))} kcal · 7d {avg(last7.filter((s) => s.kcal).map((s) => s.kcal))}
        </Text>
        <BarChart data={series.map((s) => ({ label: s.label, value: s.kcal }))} format={(v) => String(Math.round(v))} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Proteína (g) · média {avg(protDays.map((s) => s.protein))} · 7d {avg(last7.filter((s) => s.protein).map((s) => s.protein))}
        </Text>
        <BarChart data={series.map((s) => ({ label: s.label, value: s.protein }))} format={(v) => String(Math.round(v))} />
      </View>

      <Text style={styles.section}>Lembrete diário</Text>
      <View style={styles.card}>
        <View style={styles.remRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Lembrar de registrar a alimentação</Text>
            <Text style={styles.hint}>Notificação local, todo dia no horário escolhido.</Text>
          </View>
          <Switch value={reminder !== null} onValueChange={toggleReminder} trackColor={{ true: colors.primary }} />
        </View>
        {reminder !== null && <Chips options={HOURS} value={String(reminder)} onChange={(x) => changeHour(Number(x))} />}
      </View>
      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  nav: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  navBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  date: { color: colors.text, fontSize: 22, fontWeight: '800' },
  dateHint: { color: colors.muted, fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  warn: { color: colors.warning, fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
  row3: { flexDirection: 'row', gap: spacing.sm },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
