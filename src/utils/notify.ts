import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL = 'rest';
const REMINDER_CHANNEL = 'reminders';
const REMINDER_ID = 'daily-log-reminder';
let initialized = false;
let currentId: string | null = null;
let chain: Promise<void> = Promise.resolve();

const enqueue = (fn: () => Promise<void>) => {
  chain = chain.then(fn).catch(() => {});
  return chain;
};

export async function initNotifications() {
  if (initialized) return;
  initialized = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: false,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Descanso',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 150, 300],
        sound: 'default',
      });
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
        name: 'Lembretes',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) await Notifications.requestPermissionsAsync();
  } catch {}
}

const cancelNow = async () => {
  if (!currentId) return;
  const id = currentId;
  currentId = null;
  await Notifications.cancelScheduledNotificationAsync(id);
};

export const cancelRestAlert = () => enqueue(cancelNow);

export const scheduleRestAlert = (endsAt: number) =>
  enqueue(async () => {
    await cancelNow();
    const seconds = Math.max(1, Math.ceil((endsAt - Date.now()) / 1000));
    currentId = await Notifications.scheduleNotificationAsync({
      content: { title: 'Descanso terminou', body: 'Hora da próxima série.', sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: CHANNEL,
      },
    });
  });

export const scheduleDailyReminder = (hour: number) =>
  enqueue(async () => {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: 'Registro do dia', body: 'Anote seus passos e o sono de hoje.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        channelId: REMINDER_CHANNEL,
      },
    });
  });

export const cancelDailyReminder = () =>
  enqueue(async () => {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  });

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    await initNotifications();
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) return true;
    if (!perm.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

const FOOD_ID = 'food-log-reminder';
const WATER_PREFIX = 'water-';
const WATER_CHANNEL = 'water';

export const scheduleFoodReminder = (hour: number) =>
  enqueue(async () => {
    await Notifications.cancelScheduledNotificationAsync(FOOD_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: FOOD_ID,
      content: { title: 'Alimentação do dia', body: 'Registre as kcal e os macros de hoje.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        channelId: REMINDER_CHANNEL,
      },
    });
  });

export const cancelFoodReminder = () =>
  enqueue(async () => {
    await Notifications.cancelScheduledNotificationAsync(FOOD_ID).catch(() => {});
  });

export const replaceWaterReminders = (dates: Date[]) =>
  enqueue(async () => {
    await initNotifications();
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier.startsWith(WATER_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (!dates.length) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(WATER_CHANNEL, {
        name: 'Água',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    for (const date of dates) {
      await Notifications.scheduleNotificationAsync({
        identifier: WATER_PREFIX + date.getTime(),
        content: { title: 'Hora de beber água', body: 'Beba um copo de água.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: WATER_CHANNEL },
      });
    }
  });

const CHECKIN_ID = 'checkin-weekly';

export const scheduleCheckinReminder = (hour = 9) =>
  enqueue(async () => {
    await Notifications.cancelScheduledNotificationAsync(CHECKIN_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: CHECKIN_ID,
      content: { title: 'Check-in da semana', body: 'Hoje é dia de registrar peso e medidas.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour,
        minute: 0,
        channelId: REMINDER_CHANNEL,
      },
    });
  });
