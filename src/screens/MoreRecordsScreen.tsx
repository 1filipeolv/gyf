import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Item = { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; to: keyof RootStackParamList };

const RECOMMENDED: Item[] = [{ icon: 'moon-outline', title: 'Passos e sono', sub: 'Gráficos de 14 dias e lembrete', to: 'DailyLog' }];
const OPTIONAL: Item[] = [
  { icon: 'water-outline', title: 'Água', sub: 'Contador e lembretes (desligados por padrão)', to: 'Water' },
  { icon: 'walk-outline', title: 'Atividades extras', sub: 'Corrida, caminhada, bicicleta, natação', to: 'Activities' },
  { icon: 'calendar-outline', title: 'Calendário e presença', sub: 'Marcar presença manual e ver sequências', to: 'Calendar' },
  { icon: 'flame-outline', title: 'Balanço e gasto real', sub: 'Gasto estimado, metas e aprendizado do gasto', to: 'Balance' },
];

export default function MoreRecordsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const render = (items: Item[]) =>
    items.map((r) => (
      <Pressable key={r.title} onPress={() => nav.navigate(r.to as never)} style={styles.row}>
        <Ionicons name={r.icon} size={26} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{r.title}</Text>
          <Text style={styles.sub}>{r.sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    ));
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={styles.hint}>
        O essencial (treino, peso e medidas semanais, kcal do dia) fica fora daqui. Estes registros ajudam, mas não são obrigatórios.
      </Text>
      <Text style={styles.section}>Recomendados</Text>
      {render(RECOMMENDED)}
      <Text style={styles.section}>Opcionais</Text>
      {render(OPTIONAL)}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: spacing.sm },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 68,
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
