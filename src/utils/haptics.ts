import * as Haptics from 'expo-haptics';

const safe = (p: Promise<void>) => {
  p.catch(() => {});
};

export const haptic = {
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  select: () => safe(Haptics.selectionAsync()),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
