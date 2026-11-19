import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import Button from '../components/Button';
import Chips from '../components/Chips';
import BarChart from '../components/BarChart';
import { useAuth } from '../contexts/AuthContext';
import { getDailyLog, listDailyLogs, saveWater } from '../services/dailyLogs';
import { getLatestWeightKg } from '../services/weights';
import { DailyLog } from '../types';
import { parseNum } from '../utils/workout';
import { addDays, formatDateBR, toDateKey } from '../utils/date';
import { ensureNotificationPermission } from '../utils/notify';
import {
  DEFAULT_WATER,
  loadWaterSettings,
  refreshWaterReminders,
  resolveGoalMl,
  saveWaterSettings,
  suggestedGoalMl,
  WaterSettings,
} from '../utils/water';
import { toast } from '../utils/toast';
import { haptic } from '../utils/haptics';
import { colors, radius, spacing } from '../theme';

const CUPS = [200, 250, 300, 500].map((v) => ({ key: String(v), label: `${v} ml` }));
const FROM = [6, 7, 8, 9, 10].map((v) => ({ key: String(v), label: `${v}h` }));
const TO = [18, 19, 20, 21, 22].map((v) => ({ key: String(v), label: `${v}h` }));
const EVERY = [1, 2, 3].map((v) => ({ key: String(v), label: `${v}h` }));

const fmtL = (ml: number) => (ml / 1000).toFixed(2).replace('.', ',');

export default function WaterScreen() {
  const { user } = useAuth();
  const today = toDateKey();
  const [date, setDate] = useState(today);
  const [ml, setMl] = useState(0);
  const [settings, setSettings] = useState<WaterSettings>(DEFAULT_WATER);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [goalText, setGoalText] = useState('');
  const [logs, setLogs] = useState<DailyLog[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [s, w, l, day] = await Promise.all([
        loadWaterSettings(),
        getLatestWeightKg(user.uid),
        listDailyLogs(user.uid, addDays(today, -13), today),
        getDailyLog(user.uid, date),
      ]);
      setSettings(s);
      setWeightKg(w);
      setLogs(l);
      setMl(day?.waterMl ?? 0);
      setGoalText(s.goalMl ? String(s.goalMl) : '');
    } catch {}
  }, [user, date, today]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goal = resolveGoalMl(settings, weightKg);
  const pct = Math.min(1, ml / goal);

  const move = (delta: number) => {
    const next = addDays(date, delta);
    if (next > today) return;
    haptic.select();
    setDate(next);
  };

  const persist = async (next: number, s = settings) => {
    if (!user) return;
    setMl(next);
    try {
      await saveWater(user.uid, date, next);
      setLogs((prev) => {
        const rest = prev.filter((x) => x.date !== date);
        const cur = prev.find((x) => x.date === date);
        return [...rest, { ...(cur ?? ({ id: date, date, createdAt: Date.now(), updatedAt: Date.now() } as DailyLog)), waterMl: next }];
      });
      if (date === today) refreshWaterReminders(user.uid, { settings: s, waterMl: next, weightKg }).catch(() => {});
    } catch {
      toast.error('Não foi possível salvar');
    }
  };

  const add = () => {
    haptic.light();
    const next = ml + settings.cupMl;
    persist(next);
    if (ml < goal && next >= goal) toast.success('Meta de água batida!');
  };

  const remove = () => {
    if (ml <= 0) return;
    haptic.select();
    persist(Math.max(0, ml - settings.cupMl));
  };

  const update = async (patch: Partial<WaterSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveWaterSettings(next);
    if (user) refreshWaterReminders(user.uid, { settings: next, waterMl: date === today ? ml : undefined, weightKg }).catch(() => {});
  };

  const saveGoal = async () => {
    const v = Math.round(parseNum(goalText));
    if (goalText && (v < 500 || v > 10000)) return toast.error('Meta entre 500 e 10000 ml');
    await update({ goalMl: v || null });
    toast.success(v ? 'Meta salva' : 'Meta automática');
  };

  const toggleReminder = async (on: boolean) => {
    if (on && !(await ensureNotificationPermission())) {
      toast.error('Permita as notificações nas configurações do aparelho');
      return;
    }
    await update({ reminder: { ...settings.reminder, on } });
  };

  const setWindow = (patch: Partial<WaterSettings['reminder']>) => {
    const r = { ...settings.reminder, ...patch };
    if (r.to <= r.from) return toast.info('O fim deve ser depois do início');
    update({ reminder: r });
  };

  const series = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(today, -13 + i);
        return { label: d.slice(8), value: logs.find((x) => x.date === d)?.waterMl ?? 0 };
      }),
    [logs, today]
  );
  const filled = series.filter((s) => s.value > 0);
  const mean = filled.length ? fmtL(filled.reduce((a, b) => a + b.value, 0) / filled.length) : '—';

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

      <View style={styles.card}>
        <Text style={styles.big}>{fmtL(ml)} L</Text>
        <Text style={styles.hint}>
          Meta {fmtL(goal)} L · {Math.round(pct * 100)}%{settings.goalMl ? '' : weightKg ? ' (35 ml/kg)' : ' (padrão, sem peso)'}
        </Text>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: ml >= goal ? colors.success : colors.primary }]} />
        </View>
        <View style={styles.btns}>
          <Pressable onPress={remove} style={[styles.minus, ml <= 0 && { opacity: 0.4 }]} disabled={ml <= 0}>
            <Ionicons name="remove" size={28} color={colors.text} />
          </Pressable>
          <Pressable onPress={add} style={styles.plus}>
            <Ionicons name="water" size={26} color="#fff" />
            <Text style={styles.plusText}>+ 1 copo ({settings.cupMl} ml)</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.section}>Últimos 14 dias</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Água (L) · média {mean}</Text>
        <BarChart data={series} format={(v) => fmtL(v)} />
      </View>

      <Text style={styles.section}>Ajustes</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Tamanho do copo</Text>
        <Chips options={CUPS} value={String(settings.cupMl)} onChange={(k) => update({ cupMl: Number(k) })} />
        <Input
          label={`Meta diária (ml) · sugerida ${suggestedGoalMl(weightKg)}`}
          value={goalText}
          onChangeText={setGoalText}
          keyboardType="number-pad"
          placeholder="Vazio = automática (35 ml/kg)"
        />
        <Button title="Salvar meta" onPress={saveGoal} />
      </View>

      <Text style={styles.section}>Lembretes</Text>
      <View style={styles.card}>
        <View style={styles.remRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Lembrar de beber água</Text>
            <Text style={styles.hint}>
              Notificações locais na janela escolhida. Param no dia em que a meta é batida (abra o app de vez em quando para renovar a agenda).
            </Text>
          </View>
          <Switch value={settings.reminder.on} onValueChange={toggleReminder} trackColor={{ true: colors.primary }} />
        </View>
        {settings.reminder.on && (
          <>
            <Text style={styles.label}>Início</Text>
            <Chips options={FROM} value={String(settings.reminder.from)} onChange={(k) => setWindow({ from: Number(k) })} />
            <Text style={styles.label}>Fim</Text>
            <Chips options={TO} value={String(settings.reminder.to)} onChange={(k) => setWindow({ to: Number(k) })} />
            <Text style={styles.label}>A cada</Text>
            <Chips options={EVERY} value={String(settings.reminder.every)} onChange={(k) => setWindow({ every: Number(k) })} />
          </>
        )}
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
  big: { color: colors.text, fontSize: 40, fontWeight: '800', textAlign: 'center' },
  bar: { height: 14, borderRadius: 7, backgroundColor: colors.border, overflow: 'hidden', marginBottom: spacing.md },
  fill: { height: '100%', borderRadius: 7 },
  btns: { flexDirection: 'row', gap: spacing.sm },
  minus: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    flex: 1,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  plusText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
