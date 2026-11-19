import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from './Input';
import Button from './Button';
import Chips from './Chips';
import { Activity, CardioType } from '../types';
import { ACTIVITY_LABELS } from '../constants/activities';
import { estimateKcal, paceText } from '../utils/energy';
import { saveActivity } from '../services/activities';
import { parseNum } from '../utils/workout';
import { toDateKey } from '../utils/date';
import { toast } from '../utils/toast';
import { colors, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  uid: string;
  weightKg: number | null;
  editing?: Activity | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (a: Activity) => void;
};

const TYPES: CardioType[] = ['run', 'walk', 'bike', 'swim', 'other'];
const OPTIONS = TYPES.map((t) => ({ key: t, label: ACTIVITY_LABELS[t] }));

const num = (v: number | undefined, mult = 1) => (v ? String(Math.round(v * mult * 100) / 100) : '');

export default function ActivityFormModal({ visible, uid, weightKg, editing, onClose, onSaved, onDelete }: Props) {
  const [type, setType] = useState<CardioType>('run');
  const [date, setDate] = useState(toDateKey());
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [hr, setHr] = useState('');
  const [kcal, setKcal] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = editing?.type ?? 'run';
    setType(t);
    setDate(editing?.date ?? toDateKey());
    setDuration(num(editing?.durationMin));
    setDistance(num(editing?.distanceKm, t === 'swim' ? 1000 : 1));
    setHr(num(editing?.avgHr));
    setKcal(editing?.kcalSource === 'manual' ? num(editing.kcal) : '');
    setNotes(editing?.notes ?? '');
  }, [visible, editing]);

  const swim = type === 'swim';
  const durationMin = parseNum(duration);
  const distanceKm = distance ? (swim ? parseNum(distance) / 1000 : parseNum(distance)) : 0;
  const manualKcal = Math.round(parseNum(kcal));

  const preview = useMemo(() => {
    if (durationMin <= 0) return null;
    return {
      kcal: weightKg ? estimateKcal(type, durationMin, distanceKm || undefined, weightKg) : null,
      pace: paceText(type, durationMin, distanceKm || undefined),
    };
  }, [type, durationMin, distanceKm, weightKg]);

  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > toDateKey())
      return Alert.alert('Data inválida', 'Use AAAA-MM-DD, sem datas futuras.');
    if (durationMin < 1 || durationMin > 1440) return Alert.alert('Duração inválida', 'Informe de 1 a 1440 minutos.');
    const hrVal = Math.round(parseNum(hr));
    if (hr && (hrVal < 30 || hrVal > 230)) return Alert.alert('Frequência cardíaca inválida');
    let finalKcal = manualKcal;
    let source: 'estimated' | 'manual' = 'manual';
    if (!(manualKcal > 0)) {
      if (!weightKg)
        return Alert.alert('Sem peso registrado', 'Registre seu peso em Progresso > Peso ou informe as kcal manualmente.');
      finalKcal = estimateKcal(type, durationMin, distanceKm || undefined, weightKg);
      source = 'estimated';
    }
    setSaving(true);
    try {
      await saveActivity(uid, {
        id: editing?.id,
        date,
        type,
        durationMin,
        distanceKm: distanceKm > 0 ? Math.round(distanceKm * 1000) / 1000 : undefined,
        avgHr: hrVal > 0 ? hrVal : undefined,
        kcal: finalKcal,
        kcalSource: source,
        notes,
      });
      toast.success('Atividade salva');
      onSaved();
    } catch {
      toast.error('Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.head}>
            <Text style={styles.title}>{editing ? 'Editar atividade' : 'Nova atividade'}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Chips options={OPTIONS} value={type} onChange={setType} />
            <Input label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
            <Input label="Duração (min)" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" />
            <Input
              label={swim ? 'Distância (m), opcional' : 'Distância (km), opcional'}
              value={distance}
              onChangeText={setDistance}
              keyboardType="decimal-pad"
            />
            <Input label="FC média (bpm), opcional" value={hr} onChangeText={setHr} keyboardType="number-pad" />
            <Input
              label="Kcal (opcional, sobrescreve a estimativa)"
              value={kcal}
              onChangeText={setKcal}
              keyboardType="number-pad"
            />
            <Input label="Notas, opcional" value={notes} onChangeText={setNotes} autoCapitalize="sentences" />

            <View style={styles.preview}>
              {preview ? (
                <>
                  {preview.pace && <Text style={styles.previewText}>Ritmo: {preview.pace}</Text>}
                  <Text style={styles.previewText}>
                    {manualKcal > 0
                      ? `Kcal: ${manualKcal} (manual)`
                      : preview.kcal !== null
                        ? `Gasto estimado: ~${preview.kcal} kcal`
                        : 'Sem peso registrado: informe as kcal ou registre seu peso.'}
                  </Text>
                  <Text style={styles.previewHint}>
                    Estimativa por MET e peso ({weightKg ? `${weightKg} kg` : 'sem peso'}). Não é medição.
                  </Text>
                </>
              ) : (
                <Text style={styles.previewHint}>Informe a duração para ver o ritmo e o gasto estimado.</Text>
              )}
            </View>

            <Button title="Salvar" onPress={save} loading={saving} />
            {editing && onDelete && (
              <View style={{ marginTop: spacing.sm }}>
                <Button title="Excluir atividade" onPress={() => onDelete(editing)} variant="danger" />
              </View>
            )}
            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '700' },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md },
  preview: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  previewText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  previewHint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
