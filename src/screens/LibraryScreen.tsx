import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Input from '../components/Input';
import Chips from '../components/Chips';
import ExerciseFormModal from '../components/ExerciseFormModal';
import { useExercises } from '../hooks/useExercises';
import { useAuth } from '../contexts/AuthContext';
import { removeExercise, saveExercise, ExerciseDraft } from '../services/exercises';
import { Exercise, MuscleGroup } from '../types';
import { MUSCLE_LABELS, MUSCLE_LIST } from '../constants/muscles';
import { EQUIPMENT_LABELS } from '../constants/equipment';
import { colors, radius, spacing } from '../theme';

type Filter = MuscleGroup | 'all';

const filterOpts: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  ...MUSCLE_LIST.map((k) => ({ key: k as Filter, label: MUSCLE_LABELS[k] })),
];

export default function LibraryScreen() {
  const { user } = useAuth();
  const { all, reload } = useExercises();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter(
      (e) => (filter === 'all' || e.primaryMuscle === filter) && (!t || e.name.toLowerCase().includes(t))
    );
  }, [all, q, filter]);

  const save = async (d: ExerciseDraft) => {
    if (!user) return;
    await saveExercise(user.uid, d);
    await reload();
    setForm(false);
    setEditing(null);
  };

  const remove = (e: Exercise) =>
    Alert.alert('Excluir exercício', e.name, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          await removeExercise(user.uid, e.id);
          reload();
        },
      },
    ]);

  return (
    <View style={styles.wrap}>
      <Input label="Buscar" value={q} onChangeText={setQ} placeholder="Nome do exercício" />
      <Chips options={filterOpts} value={filter} onChange={setFilter} />
      <Pressable
        onPress={() => {
          setEditing(null);
          setForm(true);
        }}
        style={styles.create}
      >
        <Text style={styles.createText}>+ Criar exercício</Text>
      </Pressable>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            disabled={!item.isCustom}
            onPress={() => {
              setEditing(item);
              setForm(true);
            }}
            onLongPress={() => remove(item)}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {MUSCLE_LABELS[item.primaryMuscle]} · {EQUIPMENT_LABELS[item.equipment]}
              </Text>
            </View>
            {item.isCustom && <Text style={styles.badge}>Meu</Text>}
          </Pressable>
        )}
      />
      <ExerciseFormModal
        visible={form}
        initial={editing}
        onClose={() => {
          setForm(false);
          setEditing(null);
        }}
        onSave={save}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  create: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  createText: { color: colors.primary, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  badge: { color: colors.primary, fontWeight: '700', fontSize: 12 },
});