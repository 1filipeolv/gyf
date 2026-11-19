import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeToast, ToastMsg } from '../utils/toast';
import { colors, radius, spacing } from '../theme';

const ICONS = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' } as const;
const TINT = { success: colors.success, error: colors.danger, info: colors.primary } as const;

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      subscribeToast((m) => {
        if (timer.current) clearTimeout(timer.current);
        setMsg(m);
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        timer.current = setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMsg(null));
        }, 2600);
      }),
    [opacity]
  );

  if (!msg) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + 90, opacity }]}
    >
      <Ionicons name={ICONS[msg.kind]} size={20} color={TINT[msg.kind]} />
      <Text style={styles.text}>{msg.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
});
