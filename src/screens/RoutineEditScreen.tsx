import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import Button from '../components/Button';
import ExercisePickerModal from '../components/ExercisePickerModal';
import { useAuth } from '../contexts/AuthContext';
import { removeRoutine, saveRoutine } from '../services/routines';
import { Exercise, RoutineExercise } from '../types';
import { RootStackParamList } from '../navigation/types';
import { MUSCLE_LABELS } from '../constants/muscles';
import { uid } from '../utils/workout';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutineEdit'>;

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function RoutineEditScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const routine = route.params?.routine;
  const [name, setName] = useState(routine?.name ?? '');
  const [items, setItems] = useState<RoutineExercise[]>(
    routine ? [...routine.exercises].sort((a, b) => a.order - b.order) : []
  );
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = (ex: Exercise) =>
    setItems((l) => [
      ...l,
      {
        id: uid(),
        exerciseId: ex.id,
        exerciseName: ex.name,
        primaryMuscle: ex.primaryMuscle,
        order: l.length,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
      },
    ]);

  const patch = (id: string, p: Partial<RoutineExercise>) =>
    setItems((l) => l.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const move = (i: number, d: number) =>
    setItems((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const save = async () => {
    if (!user) return;
    if (!name.trim()) return Alert.alert('Informe o nome da rotina.');
    if (!items.length) return Alert.alert('Adicione ao menos um exercício.');
    setSaving(true);
    try {
      await saveRoutine(user.uid, {
        id: routine?.id,
        createdAt: routine?.createdAt,
        name: name.trim(),
        exercises: items.map((e, i) => ({ ...e, order: i })),
      });
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert('Excluir rotina', routine?.name, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!user || !routine) return;
          await removeRoutine(user.uid, routine.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <View style={styles.wrap}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Input label="Nome da rotina" value={name} onChangeText={setName} autoCapitalize="sentences" />
        {items.map((e, i) => (
          <View key={e.id} style={styles.card}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{e.exerciseName}</Text>
                <Text style={styles.meta}>{MUSCLE_LABELS[e.primaryMuscle]}</Text>
              </View>
              <Pressable onPress={() => move(i, -1)} hitSlop={8} style={styles.icon}>
                <Ionicons name="chevron-up" size={22} color={colors.muted} />
              </Pressable>
              <Pressable onPress={() => move(i, 1)} hitSlop={8} style={styles.icon}>
                <Ionicons name="chevron-down" size={22} color={colors.muted} />
              </Pressable>
              <Pressable
                onPress={() => setItems((l) => l.filter((x) => x.id !== e.id))}
                hitSlop={8}
                style={styles.icon}
              >
                <Ionicons name="trash-outline" size={20} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.steppers}>
              <Stepper
                label="Séries"
                value={e.targetSets}
                min={1}
                max={10}
                onChange={(v) => patch(e.id, { targetSets: v })}
              />
              <Stepper
                label="Reps mín"
                value={e.targetRepsMin}
                min={1}
                max={e.targetRepsMax}
                onChange={(v) => patch(e.id, { targetRepsMin: v })}
              />
              <Stepper
                label="Reps máx"
                value={e.targetRepsMax}
                min={e.targetRepsMin}
                max={50}
                onChange={(v) => patch(e.id, { targetRepsMax: v })}
              />
            </View>
          </View>
        ))}
        <Pressable onPress={() => setPicker(true)} style={styles.add}>
          <Text style={styles.addText}>+ Adicionar exercício</Text>
        </Pressable>
        <Button title="Salvar rotina" onPress={save} loading={saving} />
        {routine && (
          <>
            <View style={{ height: spacing.sm }} />
            <Button title="Excluir rotina" onPress={remove} variant="danger" />
          </>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
      <ExercisePickerModal visible={picker} onClose={() => setPicker(false)} onSelect={add} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  icon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  steppers: { flexDirection: 'row', gap: spacing.sm },
  stepper: { flex: 1, alignItems: 'center' },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.text, fontSize: 20, fontWeight: '700' },
  stepValue: { color: colors.text, fontSize: 17, fontWeight: '800', minWidth: 22, textAlign: 'center' },
  add: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  addText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
});