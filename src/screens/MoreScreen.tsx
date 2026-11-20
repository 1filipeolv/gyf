import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/types';
import { resetTutorials } from '../utils/tutorial';
import { toast } from '../utils/toast';
import { colors, radius, spacing } from '../theme';

export default function MoreScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const rows: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress: () => void }[] = [
    { icon: 'person-outline', title: 'Perfil', sub: 'Dados pessoais, objetivo e descanso', onPress: () => nav.navigate('Tabs', { screen: 'Profile' }) },
    { icon: 'sparkles-outline', title: 'Análise com IA', sub: 'Análise completa e resumo semanal', onPress: () => nav.navigate('Tabs', { screen: 'Analysis' }) },
    { icon: 'time-outline', title: 'Histórico de treinos', sub: 'Todos os treinos salvos', onPress: () => nav.navigate('Tabs', { screen: 'History' }) },
    { icon: 'add-circle-outline', title: 'Mais registros', sub: 'Passos, sono, água, atividades e presença', onPress: () => nav.navigate('MoreRecords') },
    { icon: 'cloud-download-outline', title: 'Dados e backup', sub: 'Exportar e restaurar', onPress: () => nav.navigate('Backup') },
    {
      icon: 'help-circle-outline',
      title: 'Rever tutoriais',
      sub: 'Os passos de primeiro uso voltam a aparecer',
      onPress: async () => {
        await resetTutorials();
        toast.success('Os tutoriais vão aparecer de novo ao abrir cada área');
      },
    },
  ];
  return (
    <ScreenContainer title="Mais">
      <ScrollView showsVerticalScrollIndicator={false}>
        {rows.map((r) => (
          <Pressable key={r.title} onPress={r.onPress} style={styles.row}>
            <Ionicons name={r.icon} size={26} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{r.title}</Text>
              <Text style={styles.sub}>{r.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
