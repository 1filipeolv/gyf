import React, { useCallback, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { listAnalyses, removeAnalysis } from '../services/analyses';
import { Analysis } from '../types';
import { RootStackParamList } from '../navigation/types';
import { STRATEGY_LABELS } from '../constants/analysis';
import { formatDateBR, toDateKey } from '../utils/date';
import { colors, radius, spacing } from '../theme';

export default function AnalysisHistoryScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      listAnalyses(user.uid, 50)
        .then(setItems)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [user])
  );

  const remove = (a: Analysis) => {
    Alert.alert('Excluir análise', formatDateBR(toDateKey(new Date(a.createdAt))), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          try {
            await removeAnalysis(user.uid, a.id);
            setItems((l) => l.filter((x) => x.id !== a.id));
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        },
      },
    ]);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
      data={items}
      keyExtractor={(a) => a.id}
      ListEmptyComponent={<EmptyState icon="sparkles-outline" title="Nenhuma análise salva" hint="Gere uma análise na aba Análise." />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Pressable style={styles.main} onPress={() => nav.navigate('AnalysisDetail', { analysis: item })}>
            <Text style={styles.date}>{formatDateBR(toDateKey(new Date(item.createdAt)))}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tag, item.kind === 'weekly' && styles.tagWeekly]}>
                <Text style={styles.tagText}>{item.kind === 'weekly' ? 'Resumo semanal' : 'Análise completa'}</Text>
              </View>
            </View>
            <Text style={styles.sub}>
              {item.input.workoutsCount} treinos
              {item.kind === 'weekly'
                ? ` · ${formatDateBR(item.input.periodStart)} a ${formatDateBR(item.input.periodEnd)}`
                : ` · ${item.input.photoIds?.length ?? 0} fotos${
                    item.nutrition?.strategy ? ` · ${STRATEGY_LABELS[item.nutrition.strategy] ?? ''}` : ''
                  }`}
            </Text>
            <Text style={styles.summary} numberOfLines={2}>
              {item.summary}
            </Text>
          </Pressable>
          <Pressable onPress={() => remove(item)} style={styles.del} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.muted} />
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  main: { flex: 1, padding: spacing.md, minHeight: 64 },
  date: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  tagRow: { flexDirection: 'row', marginTop: 4 },
  tag: { backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: colors.border },
  tagWeekly: { borderColor: colors.primary },
  tagText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  summary: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 6 },
  del: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
