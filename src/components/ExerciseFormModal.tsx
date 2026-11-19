import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Input from './Input';
import Button from './Button';
import Chips from './Chips';
import { Equipment, Exercise, MuscleGroup } from '../types';
import { MUSCLE_LABELS, MUSCLE_LIST } from '../constants/muscles';
import { EQUIPMENT_LABELS, EQUIPMENT_LIST } from '../constants/equipment';
import { ExerciseDraft } from '../services/exercises';
import { colors, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  initial?: Exercise | null;
  onClose: () => void;
  onSave: (d: ExerciseDraft) => void | Promise<void>;
};

const muscleOpts = MUSCLE_LIST.map((k) => ({ key: k, label: MUSCLE_LABELS[k] }));
const equipOpts = EQUIPMENT_LIST.map((k) => ({ key: k, label: EQUIPMENT_LABELS[k] }));

export default function ExerciseFormModal({ visible, initial, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState<Equipment>('barbell');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setMuscle(initial?.primaryMuscle ?? 'chest');
    setEquipment(initial?.equipment ?? 'barbell');
  }, [visible, initial]);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        createdAt: initial?.createdAt,
        name,
        primaryMuscle: muscle,
        equipment,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>{initial ? 'Editar exercício' : 'Novo exercício'}</Text>
        <Input label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
        <Text style={styles.label}>Grupo muscular</Text>
        <Chips options={muscleOpts} value={muscle} onChange={setMuscle} />
        <Text style={styles.label}>Equipamento</Text>
        <Chips options={equipOpts} value={equipment} onChange={setEquipment} />
        <Button title="Salvar" onPress={submit} loading={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: 13, marginBottom: spacing.xs },
});