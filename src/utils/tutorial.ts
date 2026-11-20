import AsyncStorage from '@react-native-async-storage/async-storage';

export const TUTORIAL_IDS = ['workout', 'checkin', 'progress', 'nutrition'] as const;
const key = (id: string) => `tutorial_seen_${id}`;

export const isTutorialSeen = async (id: string) => (await AsyncStorage.getItem(key(id)).catch(() => null)) === '1';
export const markTutorialSeen = (id: string) => AsyncStorage.setItem(key(id), '1').catch(() => {});
export const resetTutorials = () => AsyncStorage.multiRemove(TUTORIAL_IDS.map(key)).catch(() => {});
