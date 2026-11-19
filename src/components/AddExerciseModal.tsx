import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Input from './Input';
import Button from './Button';
import { MuscleGroup } from '../types';
import { MUSCLE_LABELS, MUSCLE_LIST } from '../constants/muscles';
import { colors, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, muscle: MuscleGroup) => void;
};

export default function AddExerciseModal({ visible, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');

  const submit = () => {
    if (!name.trim()) return;
    onAdd(name, muscle);
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Novo exercício</Text>
        <Input label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
        <Text style={styles.label}>Grupo muscular</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {MUSCLE_LIST.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMuscle(m)}
              style={[styles.chip, muscle === m && styles.chipOn]}
            >
              <Text style={styles.chipText}>{MUSCLE_LABELS[m]}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Button title="Adicionar" onPress={submit} />
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
  chips: { flexGrow: 0, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    height: 40,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
});