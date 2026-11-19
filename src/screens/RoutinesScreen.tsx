import React, { useCallback, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { listRoutines } from '../services/routines';
import { Routine } from '../types';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Routines'>;

export default function RoutinesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (user) listRoutines(user.uid).then(setRoutines).catch(() => {});
    }, [user])
  );

  return (
    <View style={styles.wrap}>
      <Button title="Nova rotina" onPress={() => navigation.navigate('RoutineEdit', {})} />
      <FlatList
        style={{ marginTop: spacing.md }}
        data={routines}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<EmptyState icon="list-outline" title="Nenhuma rotina" hint="Crie uma rotina para iniciar treinos mais rápido." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('RoutineEdit', { routine: item })}
            style={styles.card}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.exercises.length} exercícios</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, marginTop: 2 },
});