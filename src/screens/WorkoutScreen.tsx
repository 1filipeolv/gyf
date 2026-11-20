import React, { useCallback, useEffect, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { toast } from '../utils/toast';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
import Tutorial from '../components/Tutorial';
import Input from '../components/Input';
import Button from '../components/Button';
import ExerciseCard from '../components/ExerciseCard';
import ExercisePickerModal from '../components/ExercisePickerModal';
import RestTimer from '../components/RestTimer';
import { useWorkout } from '../contexts/WorkoutContext';
import { useAuth } from '../contexts/AuthContext';
import { useNow } from '../hooks/useNow';
import { useExercises } from '../hooks/useExercises';
import { useExerciseHistory } from '../hooks/useExerciseHistory';
import { listRoutines } from '../services/routines';
import { Routine } from '../types';
import { RootStackParamList } from '../navigation/types';
import { formatDuration } from '../utils/date';
import { setVolume } from '../utils/workout';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

const WEEKDAY_SHORT_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export default function WorkoutScreen() {
  const { active, start, startFromRoutine, discard, finish, addExercise } = useWorkout();
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const now = useNow(!!active);
  const { custom } = useExercises();
  const { history } = useExerciseHistory(!!active, active?.startedAt);

  useEffect(() => {
    if (!active) return;
    activateKeepAwakeAsync('workout').catch(() => {});
    return () => {
      deactivateKeepAwake('workout').catch(() => {});
    };
  }, [!!active]);

  useFocusEffect(
    useCallback(() => {
      if (user) listRoutines(user.uid).then(setRoutines).catch(() => {});
    }, [user])
  );

  if (!active) {
    const wd = new Date().getDay();
    const todays = routines.find((r) => r.weekdays?.includes(wd));
    const others = routines.filter((r) => r.id !== todays?.id);
    return (
      <ScreenContainer title="Treino">
        <Tutorial
          id="workout"
          steps={[
            { title: 'Treino do dia', text: 'Defina os dias da semana em cada rotina e o treino de hoje abre aqui, pronto para iniciar.' },
            { title: 'Durante o treino', text: 'Marque cada série concluída. O descanso conta sozinho e a carga anterior aparece como referência.' },
          ]}
        />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {todays ? (
            <View style={styles.today}>
              <Text style={styles.todayTag}>TREINO DE HOJE</Text>
              <Text style={styles.todayName}>{todays.name}</Text>
              {todays.exercises.slice(0, 6).map((e) => (
                <Text key={e.id} style={styles.todayEx}>
                  {e.exerciseName} · {e.targetSets}x{e.targetRepsMin === e.targetRepsMax ? e.targetRepsMin : `${e.targetRepsMin}-${e.targetRepsMax}`}
                </Text>
              ))}
              {todays.exercises.length > 6 && <Text style={styles.todayEx}>+ {todays.exercises.length - 6} exercícios</Text>}
              <Pressable onPress={() => startFromRoutine(todays, custom)} style={styles.bigBtn}>
                <Text style={styles.bigBtnText}>Iniciar</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.today}>
              <Text style={styles.todayTag}>HOJE</Text>
              <Text style={styles.todayName}>{routines.length ? 'Sem treino planejado' : 'Nenhuma rotina criada'}</Text>
              <Text style={styles.todayEx}>
                {routines.length
                  ? 'Defina os dias da semana de cada rotina em "Gerenciar rotinas" ou escolha um treino em Mais opções.'
                  : 'Crie sua rotina (ou importe sua planilha) para ver o treino do dia aqui.'}
              </Text>
            </View>
          )}

          <Pressable onPress={() => setMore((m) => !m)} style={styles.moreBtn}>
            <Text style={styles.moreText}>Mais opções</Text>
            <Ionicons name={more ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
          </Pressable>

          {more && (
            <View>
              {others.map((r) => (
                <Pressable key={r.id} onPress={() => startFromRoutine(r, custom)} style={styles.routine}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routineName}>{r.name}</Text>
                    <Text style={styles.routineMeta}>
                      {r.exercises.length} exercícios
                      {r.weekdays?.length ? ` · ${r.weekdays.map((d) => WEEKDAY_SHORT_PT[d]).join(', ')}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.play}>Iniciar</Text>
                </Pressable>
              ))}
              <Input
                label="Treino livre (nome)"
                value={name}
                onChangeText={setName}
                placeholder="Ex: Peito e tríceps"
                autoCapitalize="sentences"
              />
              <Button
                title="Iniciar treino vazio"
                onPress={() => {
                  start(name);
                  setName('');
                }}
              />
              <View style={{ height: spacing.sm }} />
              <Button title="Gerenciar rotinas" onPress={() => nav.navigate('Routines')} variant="ghost" />
              <View style={{ height: spacing.sm }} />
              <Button title="Biblioteca de exercícios" onPress={() => nav.navigate('Library')} variant="ghost" />
              <View style={{ height: spacing.sm }} />
              <Button title="Histórico de treinos" onPress={() => nav.navigate('Tabs', { screen: 'History' })} variant="ghost" />
            </View>
          )}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  const sets = active.exercises.flatMap((e) => e.sets);
  const done = sets.filter((s) => s.completed).length;
  const volume = Math.round(sets.reduce((a, s) => a + setVolume(s), 0));

  const onFinish = async () => {
    if (!done) {
      Alert.alert('Nenhuma série concluída', 'Marque ao menos uma série para salvar.');
      return;
    }
    setSaving(true);
    try {
      await finish();
      toast.success('Treino salvo');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o treino.');
    } finally {
      setSaving(false);
    }
  };

  const onDiscard = () =>
    Alert.alert('Descartar treino', 'Todos os dados deste treino serão perdidos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: discard },
    ]);

  return (
    <ScreenContainer title={active.name}>
      <View style={styles.stats}>
        <Stat label="Duração" value={formatDuration(Math.floor((now - active.startedAt) / 1000))} />
        <Stat label="Séries" value={String(done)} />
        <Stat label="Volume" value={`${volume} kg`} />
      </View>
      <RestTimer />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
        {active.exercises.map((e) => (
          <ExerciseCard key={e.id} ex={e} history={history.get(e.exerciseId)} />
        ))}
        <Pressable onPress={() => setModal(true)} style={styles.addEx}>
          <Text style={styles.addExText}>+ Adicionar exercício</Text>
        </Pressable>
        <View style={styles.actions}>
          <Button title="Finalizar treino" onPress={onFinish} loading={saving} />
          <View style={{ height: spacing.sm }} />
          <Button title="Descartar" onPress={onDiscard} variant="ghost" />
        </View>
      </ScrollView>
      <ExercisePickerModal
        visible={modal}
        onClose={() => setModal(false)}
        onSelect={(ex) => addExercise(ex.name, ex.primaryMuscle, ex.id, ex.equipment)}
      />
    </ScreenContainer>
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
  today: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.primary },
  todayTag: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  todayName: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4, marginBottom: spacing.sm },
  todayEx: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  bigBtn: { height: 64, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  bigBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, marginTop: spacing.md },
  moreText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.sm },
  empty: { color: colors.muted },
  routine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  routineName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  routineMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  play: { color: colors.primary, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  addEx: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  addExText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  actions: { marginBottom: spacing.xl },
});