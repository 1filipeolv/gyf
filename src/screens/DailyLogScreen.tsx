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
import { getLatestWeightKg } from '../services/weights';
import { DailyLog } from '../types';
import { stepsKcal } from '../utils/energy';
import { parseNum } from '../utils/workout';
import { addDays, formatDateBR, toDateKey } from '../utils/date';
import { cancelDailyReminder, ensureNotificationPermission, scheduleDailyReminder } from '../utils/notify';
import { toast } from '../utils/toast';
import { haptic } from '../utils/haptics';
import { colors, radius, spacing } from '../theme';

const REMINDER_KEY = 'daily_reminder_hour';
const HOURS = [19, 20, 21, 22].map((h) => ({ key: String(h), label: `${h}h` }));
const QUALITY = [1, 2, 3, 4, 5];

const avg = (vals: number[], digits: number) =>
  vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(digits).replace('.', ',') : '—';

export default function DailyLogScreen() {
  const { user } = useAuth();
  const today = toDateKey();
  const [date, setDate] = useState(today);
  const [steps, setSteps] = useState('');
  const [sleep, setSleep] = useState('');
  const [quality, setQuality] = useState(0);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [reminder, setReminder] = useState<number | null>(null);

  const loadDay = useCallback(async () => {
    if (!user) return;
    try {
      const l = await getDailyLog(user.uid, date);
      setSteps(l?.steps ? String(l.steps) : '');
      setSleep(l?.sleepHours ? String(l.sleepHours).replace('.', ',') : '');
      setQuality(l?.sleepQuality ?? 0);
    } catch {}
  }, [user, date]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const [l, w] = await Promise.all([
        listDailyLogs(user.uid, addDays(today, -13), today),
        getLatestWeightKg(user.uid),
      ]);
      setLogs(l);
      setWeightKg(w);
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

  const save = async () => {
    if (!user) return;
    const stepsVal = Math.round(parseNum(steps));
    const sleepVal = parseNum(sleep);
    if (steps && (stepsVal < 1 || stepsVal > 100000)) return Alert.alert('Passos inválidos', 'Informe de 1 a 100000.');
    if (sleep && (sleepVal <= 0 || sleepVal > 24)) return Alert.alert('Sono inválido', 'Informe de 0,5 a 24 horas.');
    if (!stepsVal && !sleepVal && !quality) return toast.info('Preencha ao menos um campo');
    setSaving(true);
    try {
      await saveDailyLog(user.uid, date, {
        steps: stepsVal || undefined,
        sleepHours: sleepVal || undefined,
        sleepQuality: quality || undefined,
      });
      toast.success('Registro salvo');
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
      await cancelDailyReminder();
      return;
    }
    if (!(await ensureNotificationPermission())) {
      toast.error('Permita as notificações nas configurações do aparelho');
      return;
    }
    setReminder(21);
    await AsyncStorage.setItem(REMINDER_KEY, '21').catch(() => {});
    await scheduleDailyReminder(21);
  };

  const changeHour = async (h: number) => {
    setReminder(h);
    await AsyncStorage.setItem(REMINDER_KEY, String(h)).catch(() => {});
    await scheduleDailyReminder(h);
  };

  const series = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(today, -13 + i);
        const l = logs.find((x) => x.date === d);
        return { date: d, label: d.slice(8), steps: l?.steps ?? 0, sleep: l?.sleepHours ?? 0 };
      }),
    [logs, today]
  );

  const stepsNum = Math.round(parseNum(steps));

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
        <Pressable
          onPress={() => move(1)}
          disabled={date >= today}
          style={[styles.navBtn, date >= today && { opacity: 0.3 }]}
          hitSlop={6}
        >
          <Ionicons name="chevron-forward" size={26} color={colors.text} />
        </Pressable>
      </View>

      <Input label="Passos" value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder="Número que o relógio mostra" />
      {stepsNum > 0 && weightKg && (
        <Text style={styles.hint}>
          ≈ {stepsKcal(stepsNum, weightKg)} kcal em passos (estimativa). Pode se sobrepor ao gasto das atividades; o
          balanço calórico do Nível S trata disso.
        </Text>
      )}
      <Input label="Sono (horas)" value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" placeholder="Ex: 7,5" />
      <Text style={styles.label}>Qualidade do sono</Text>
      <View style={styles.quality}>
        {QUALITY.map((q) => (
          <Pressable
            key={q}
            onPress={() => {
              haptic.select();
              setQuality(quality === q ? 0 : q);
            }}
            style={[styles.qBtn, quality === q && styles.qOn]}
          >
            <Text style={styles.qText}>{q}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>1 = péssima, 5 = ótima. Campos vazios não são alterados.</Text>
      <Button title="Salvar" onPress={save} loading={saving} />

      <Text style={styles.section}>Últimos 14 dias</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Passos · média {avg(series.filter((s) => s.steps).map((s) => s.steps), 0)}
        </Text>
        <BarChart data={series.map((s) => ({ label: s.label, value: s.steps }))} format={(v) => String(Math.round(v / 100) / 10).replace('.', ',') + 'k'} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sono (h) · média {avg(series.filter((s) => s.sleep).map((s) => s.sleep), 1)}</Text>
        <BarChart data={series.map((s) => ({ label: s.label, value: s.sleep }))} format={(v) => String(Math.round(v * 10) / 10).replace('.', ',')} />
      </View>

      <Text style={styles.section}>Lembrete diário</Text>
      <View style={styles.card}>
        <View style={styles.remRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Lembrar de registrar passos e sono</Text>
            <Text style={styles.hint}>Notificação local, todo dia no horário escolhido.</Text>
          </View>
          <Switch value={reminder !== null} onValueChange={toggleReminder} trackColor={{ true: colors.primary }} />
        </View>
        {reminder !== null && <Chips options={HOURS} value={String(reminder)} onChange={(k) => changeHour(Number(k))} />}
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
  label: { color: colors.muted, fontSize: 13, marginBottom: spacing.xs },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  quality: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  qBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  qText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
