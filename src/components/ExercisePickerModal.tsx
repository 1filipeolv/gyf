import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from './Input';
import Chips from './Chips';
import ExerciseFormModal from './ExerciseFormModal';
import { useExercises } from '../hooks/useExercises';
import { useAuth } from '../contexts/AuthContext';
import { saveExercise, ExerciseDraft } from '../services/exercises';
import { Exercise, MuscleGroup } from '../types';
import { MUSCLE_LABELS, MUSCLE_LIST } from '../constants/muscles';
import { EQUIPMENT_LABELS } from '../constants/equipment';
import { colors, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (ex: Exercise) => void;
};

type Filter = MuscleGroup | 'all';

const filterOpts: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  ...MUSCLE_LIST.map((k) => ({ key: k as Filter, label: MUSCLE_LABELS[k] })),
];

export default function ExercisePickerModal({ visible, onClose, onSelect }: Props) {
  const { user } = useAuth();
  const { all, reload } = useExercises();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setForm] = useState(false);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter(
      (e) => (filter === 'all' || e.primaryMuscle === filter) && (!t || e.name.toLowerCase().includes(t))
    );
  }, [all, q, filter]);

  const pick = (e: Exercise) => {
    onSelect(e);
    setQ('');
    onClose();
  };

  const create = async (d: ExerciseDraft) => {
    if (!user) return;
    const id = await saveExercise(user.uid, d);
    await reload();
    setForm(false);
    const now = Date.now();
    pick({
      id,
      name: d.name.trim(),
      primaryMuscle: d.primaryMuscle,
      secondaryMuscles: [],
      equipment: d.equipment,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    });
  };

  return (
    <>
      <Modal visible={visible && !form} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.head}>
            <Text style={styles.title}>Exercícios</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <Input label="Buscar" value={q} onChangeText={setQ} placeholder="Nome do exercício" />
          <Chips options={filterOpts} value={filter} onChange={setFilter} />
          <Pressable onPress={() => setForm(true)} style={styles.create}>
            <Text style={styles.createText}>+ Criar exercício</Text>
          </Pressable>
          <FlatList
            data={list}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item)} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {MUSCLE_LABELS[item.primaryMuscle]} · {EQUIPMENT_LABELS[item.equipment]}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
      <ExerciseFormModal visible={visible && form} onClose={() => setForm(false)} onSave={create} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
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
});