import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import Chips from '../components/Chips';
import { useAuth } from '../contexts/AuthContext';
import { listPhotos, photoUri } from '../services/photos';
import { PhotoAngle, ProgressPhoto } from '../types';
import { formatDateBR } from '../utils/date';
import { colors, radius, spacing } from '../theme';

const angleOpts: { key: PhotoAngle; label: string }[] = [
  { key: 'front', label: 'Frente' },
  { key: 'side', label: 'Lado' },
  { key: 'back', label: 'Costas' },
];

const W = (Dimensions.get('window').width - spacing.lg * 2 - spacing.sm) / 2;
const fmt = (v: number) => v.toFixed(1).replace('.', ',');

export default function PhotoCompareScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<ProgressPhoto[]>([]);
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) listPhotos(user.uid).then(setList).catch(() => {});
    }, [user])
  );

  const byAngle = useMemo(() => list.filter((p) => p.angle === angle), [list, angle]);
  const left = byAngle.find((p) => p.id === leftId) ?? byAngle[0];
  const right = byAngle.find((p) => p.id === rightId) ?? byAngle[byAngle.length - 1];

  const diffDays =
    left && right
      ? Math.round(
          (new Date(right.date).getTime() - new Date(left.date).getTime()) / 86400000
        )
      : 0;
  const diffKg = left?.weightKg && right?.weightKg ? right.weightKg - left.weightKg : null;

  const Side = ({ p, label }: { p?: ProgressPhoto; label: string }) => (
    <View style={{ width: W }}>
      <Text style={styles.label}>{label}</Text>
      {p ? (
        <>
          <Image source={{ uri: photoUri(p) }} style={styles.img} contentFit="cover" />
          <Text style={styles.date}>{formatDateBR(p.date)}</Text>
          {!!p.weightKg && <Text style={styles.kg}>{fmt(p.weightKg)} kg</Text>}
        </>
      ) : (
        <View style={[styles.img, styles.ph]}>
          <Text style={styles.kg}>Sem foto</Text>
        </View>
      )}
    </View>
  );

  const Strip = ({ sel, onPick }: { sel?: string; onPick: (id: string) => void }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
      {byAngle.map((p) => (
        <Pressable key={p.id} onPress={() => onPick(p.id)} style={styles.chip}>
          <Image
            source={{ uri: photoUri(p) }}
            style={[styles.mini, sel === p.id && styles.miniOn]}
            contentFit="cover"
          />
          <Text style={styles.miniText}>{formatDateBR(p.date).slice(0, 5)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: spacing.lg }}>
      <Chips options={angleOpts} value={angle} onChange={setAngle} />
      {byAngle.length < 2 ? (
        <Text style={styles.empty}>Adicione ao menos 2 fotos deste ângulo para comparar.</Text>
      ) : (
        <>
          <View style={styles.pair}>
            <Side p={left} label="Antes" />
            <Side p={right} label="Depois" />
          </View>
          <Text style={styles.diff}>
            {diffDays} dias{diffKg !== null ? ` · ${diffKg > 0 ? '+' : ''}${fmt(diffKg)} kg` : ''}
          </Text>
          <Text style={styles.sub}>Antes</Text>
          <Strip sel={left?.id} onPick={setLeftId} />
          <Text style={styles.sub}>Depois</Text>
          <Strip sel={right?.id} onPick={setRightId} />
        </>
      )}
      <Text style={styles.hint}>Use a mesma luz, distância e pose para comparar com precisão.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  pair: { flexDirection: 'row', gap: spacing.sm },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  img: { width: W, height: W * 1.4, borderRadius: radius.md, backgroundColor: colors.card },
  ph: { alignItems: 'center', justifyContent: 'center' },
  date: { color: colors.text, textAlign: 'center', marginTop: 4, fontWeight: '600' },
  kg: { color: colors.muted, textAlign: 'center', fontSize: 12 },
  diff: { color: colors.primary, textAlign: 'center', fontWeight: '700', marginVertical: spacing.md },
  sub: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  chip: { marginRight: spacing.sm, alignItems: 'center' },
  mini: { width: 56, height: 76, borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent' },
  miniOn: { borderColor: colors.primary },
  miniText: { color: colors.muted, fontSize: 10, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.lg },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
});