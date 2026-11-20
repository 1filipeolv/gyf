import React, { useEffect, useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../contexts/AuthContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { useDashboard } from '../hooks/useDashboard';
import { useExercises } from '../hooks/useExercises';
import { useTargets } from '../hooks/useTargets';
import { listRoutines } from '../services/routines';
import { Routine } from '../types';
import { RootStackParamList } from '../navigation/types';
import { checkinState, missingLabel } from '../utils/checkin';
import { foodDay, periodBalance, weekStartKey } from '../utils/foodStatus';
import { formatDateBR, toDateKey } from '../utils/date';
import { colors, radius, spacing } from '../theme';

const n0 = (v: number) => Math.round(v).toLocaleString('pt-BR');
const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n0(Math.abs(v))}`;

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { active, startFromRoutine } = useWorkout();
  const { custom } = useExercises();
  const dash = useDashboard();
  const target = useTargets(dash);
  const today = toDateKey();
  const [routines, setRoutines] = useState<Routine[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (user) listRoutines(user.uid).then(setRoutines).catch(() => {});
    }, [user])
  );

  const todays = routines.find((r) => r.weekdays?.includes(new Date().getDay()));
  const ck = checkinState(dash.weights, dash.measurements, today);
  const tk = target?.kcal ?? null;
  const fd = foodDay(dash.dailyLogs.find((l) => l.date === today), today, tk);
  const week = periodBalance(dash.dailyLogs, weekStartKey(today), today, tk);

  const startToday = () => {
    if (!todays) return;
    startFromRoutine(todays, custom);
    nav.navigate('Tabs', { screen: 'Workout' });
  };

  return (
    <ScreenContainer title="Hoje">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>{formatDateBR(today)}</Text>

        {!ck.done && (
          <Pressable onPress={() => nav.navigate('Checkin')} style={styles.banner}>
            <Ionicons name="alert-circle" size={24} color="#000" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Você ainda não concluiu o check-in da semana</Text>
              <Text style={styles.bannerSub}>
                Falta {missingLabel(ck)}
                {ck.late ? ` · atrasado desde ${formatDateBR(ck.due)}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </Pressable>
        )}

        <View style={styles.card}>
          <Text style={styles.tag}>{active ? 'TREINO EM ANDAMENTO' : 'TREINO DE HOJE'}</Text>
          <Text style={styles.big}>{active ? active.name : todays ? todays.name : 'Sem treino planejado'}</Text>
          {!active && todays && (
            <Text style={styles.sub}>{todays.exercises.length} exercícios</Text>
          )}
          <Pressable
            onPress={active ? () => nav.navigate('Tabs', { screen: 'Workout' }) : todays ? startToday : () => nav.navigate('Tabs', { screen: 'Workout' })}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{active ? 'Continuar' : todays ? 'Iniciar' : 'Abrir treino'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => nav.navigate('Nutrition')} style={styles.card}>
          <Text style={styles.tag}>KCAL DO DIA</Text>
          {fd.kcal === null ? (
            <>
              <Text style={styles.big}>Pendente</Text>
              <Text style={styles.sub}>{tk ? `Meta ${n0(tk)} kcal. Toque para registrar.` : 'Toque para registrar a kcal de hoje.'}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.big, fd.status === 'over' && { color: colors.warning }]}>{n0(fd.kcal)} kcal</Text>
              <Text style={styles.sub}>
                {tk ? `Meta ${n0(tk)} · ${fd.status === 'over' ? 'acima da meta' : 'dentro da meta'} (${sg(fd.delta ?? 0)})` : 'Meta indisponível sem perfil completo'}
              </Text>
            </>
          )}
          {tk && week.logged > 0 && (
            <Text style={styles.sub}>
              Saldo da semana: {sg(week.saldo)} kcal em {week.logged} dia(s)
            </Text>
          )}
        </Pressable>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.muted, fontSize: 14, marginBottom: spacing.md, marginTop: -spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 64,
    marginBottom: spacing.md,
  },
  bannerTitle: { color: '#000', fontSize: 15, fontWeight: '800' },
  bannerSub: { color: '#000', fontSize: 12, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  tag: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  big: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  sub: { color: colors.muted, fontSize: 14, marginTop: 4 },
  cta: { height: 64, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  ctaText: { color: '#fff', fontSize: 20, fontWeight: '800' },
});
