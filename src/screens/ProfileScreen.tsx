import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import Button from '../components/Button';
import Input from '../components/Input';
import Chips from '../components/Chips';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/auth';
import { getProfile } from '../services/db';
import { updateProfile } from '../services/profile';
import { EXPERIENCE_LABELS, GOAL_LABELS, SEX_LABELS, toOptions } from '../constants/profile';
import { ExperienceLevel, Goal, Sex } from '../types';
import { fromDateKey, toDateKey } from '../utils/date';
import { toast } from '../utils/toast';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

const FREQ_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'].map((k) => ({ key: k, label: `${k}x` }));
const REST_BASE = [60, 90, 120, 180, 240];

const num = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const ageFrom = (key: string) => {
  const b = fromDateKey(key);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1;
  return a;
};

const validDate = (t: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = fromDateKey(t);
  return toDateKey(d) === t && t <= toDateKey() && d.getFullYear() >= 1900;
};

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');
  const [sex, setSex] = useState<Sex | ''>('');
  const [birth, setBirth] = useState('');
  const [height, setHeight] = useState('');
  const [target, setTarget] = useState('');
  const [freq, setFreq] = useState('3');
  const [rest, setRest] = useState('90');

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid)
      .then((p) => {
        setName(p?.name ?? user.displayName ?? '');
        if (p) {
          setGoal(p.goal ?? 'hypertrophy');
          setExperience(p.experience ?? 'beginner');
          setSex(p.sex ?? '');
          setBirth(p.birthDate ?? '');
          setHeight(p.heightCm ? String(p.heightCm) : '');
          setTarget(p.targetWeightKg ? String(p.targetWeightKg) : '');
          setFreq(String(p.weeklyFrequencyTarget ?? 3));
          setRest(String(p.restTimerDefaultSec ?? 90));
        }
      })
      .catch(() => toast.error('Não foi possível carregar o perfil.'))
      .finally(() => setReady(true));
  }, [user]);

  const restOptions = useMemo(() => {
    const cur = Number(rest);
    const list = REST_BASE.includes(cur) || !cur ? REST_BASE : [...REST_BASE, cur].sort((a, b) => a - b);
    return list.map((s) => ({ key: String(s), label: s % 60 === 0 ? `${s / 60} min` : `${s}s` }));
  }, [rest]);

  const age = validDate(birth) ? ageFrom(birth) : null;

  const save = async () => {
    if (!user || saving) return;
    const h = height.trim() ? num(height) : undefined;
    const t = target.trim() ? num(target) : undefined;
    const b = birth.trim();
    if (!name.trim()) return toast.error('Informe seu nome.');
    if (b && !validDate(b)) return toast.error('Nascimento inválido. Use AAAA-MM-DD.');
    if (b && (ageFrom(b) < 10 || ageFrom(b) > 100)) return toast.error('Confira a data de nascimento.');
    if (h !== undefined && (Number.isNaN(h) || h < 100 || h > 250)) return toast.error('Altura entre 100 e 250 cm.');
    if (t !== undefined && (Number.isNaN(t) || t < 30 || t > 300)) return toast.error('Peso meta entre 30 e 300 kg.');
    setSaving(true);
    try {
      await updateProfile(user.uid, {
        name: name.trim(),
        goal,
        experience,
        sex: sex || undefined,
        birthDate: b || undefined,
        heightCm: h,
        targetWeightKg: t,
        weeklyFrequencyTarget: Number(freq),
        restTimerDefaultSec: Number(rest),
        weightUnit: 'kg',
      });
      toast.success('Perfil salvo');
    } catch {
      toast.error('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Sair', 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);

  return (
    <ScreenContainer title="Perfil">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <Input label="Nome" value={name} onChangeText={setName} autoCapitalize="words" editable={ready} />

          <Text style={styles.label}>Objetivo</Text>
          <Chips options={toOptions(GOAL_LABELS)} value={goal} onChange={setGoal} />

          <Text style={styles.label}>Experiência</Text>
          <Chips options={toOptions(EXPERIENCE_LABELS)} value={experience} onChange={setExperience} />

          <Text style={styles.label}>Sexo</Text>
          <Chips options={toOptions(SEX_LABELS)} value={sex as Sex} onChange={setSex} />

          <Input
            label={age !== null ? `Nascimento (AAAA-MM-DD) · ${age} anos` : 'Nascimento (AAAA-MM-DD)'}
            value={birth}
            onChangeText={setBirth}
            placeholder="1995-04-23"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="175" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Peso meta (kg)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="80" />
            </View>
          </View>

          <Text style={styles.label}>Meta de treinos por semana</Text>
          <Chips options={FREQ_OPTIONS} value={freq} onChange={setFreq} />

          <Text style={styles.label}>Descanso padrão entre séries</Text>
          <Chips options={restOptions} value={rest} onChange={setRest} />

          <Text style={styles.note}>Unidade de peso: kg. Sexo, idade e altura são usados pela IA para estimar calorias.</Text>

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Button title="Dados e backup" onPress={() => nav.navigate('Backup')} variant="ghost" />
            <Button title="Sair da conta" onPress={confirmLogout} variant="ghost" />
          </View>
          <View style={{ height: spacing.xl }} />
        </ScrollView>
        <View style={styles.bar}>
          <Button title="Salvar perfil" onPress={save} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  email: { color: colors.muted, fontSize: 14 },
  label: { color: colors.muted, fontSize: 13, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  bar: { paddingVertical: spacing.sm, backgroundColor: colors.bg },
});
