import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  hint?: string;
};

export default function EmptyState({ icon, title, hint }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={44} color={colors.border} />
      <Text style={styles.title}>{title}</Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
