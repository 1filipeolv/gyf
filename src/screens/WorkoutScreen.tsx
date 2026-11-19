import React, { useCallback, useEffect, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { toast } from '../utils/toast';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
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
import { colors, radius, spacing } from '../theme';

export default function WorkoutScreen() {
  const { active, start, startFromRoutine, discard, finish, addExercise } = useWorkout();
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
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
    return (
      <ScreenContainer title="Treino">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Input
            label="Nome do treino"
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
          <Text style={styles.section}>Minhas rotinas</Text>
          {routines.length === 0 && <Text style={styles.empty}>Nenhuma rotina criada.</Text>}
          {routines.map((r) => (
            <Pressable key={r.id} onPress={() => startFromRoutine(r, custom)} style={styles.routine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineName}>{r.name}</Text>
                <Text style={styles.routineMeta}>{r.exercises.length} exercícios</Text>
              </View>
              <Text style={styles.play}>Iniciar</Text>
            </Pressable>
          ))}
          <View style={{ height: spacing.md }} />
          <Button title="Gerenciar rotinas" onPress={() => nav.navigate('Routines')} variant="ghost" />
          <View style={{ height: spacing.sm }} />
          <Button title="Biblioteca de exercícios" onPress={() => nav.navigate('Library')} variant="ghost" />
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