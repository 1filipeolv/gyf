import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';

type Opt<T extends string> = { key: T; label: string };
type Props<T extends string> = { options: Opt<T>[]; value: T; onChange: (k: T) => void };

export default function Chips<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wrap}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[styles.chip, value === o.key && styles.on]}
        >
          <Text style={styles.text}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 0, marginBottom: spacing.md },
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
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.text, fontWeight: '600' },
});