import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = TextInputProps & { label: string };

export default function Input({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        autoCapitalize="none"
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: 13, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    height: 52,
    fontSize: 16,
  },
});