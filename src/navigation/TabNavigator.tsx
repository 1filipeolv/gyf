import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { TabParamList } from './types';
import WorkoutScreen from '../screens/WorkoutScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const icons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Workout: 'barbell',
  History: 'time',
  Progress: 'trending-up',
  Analysis: 'sparkles',
  Profile: 'person',
};

const labels: Record<keyof TabParamList, string> = {
  Workout: 'Treino',
  History: 'Histórico',
  Progress: 'Progresso',
  Analysis: 'Análise',
  Profile: 'Perfil',
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabel: labels[route.name],
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Analysis" component={AnalysisScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
