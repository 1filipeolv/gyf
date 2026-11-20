import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { TabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import MoreScreen from '../screens/MoreScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const icons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Today: 'home',
  Workout: 'barbell',
  Progress: 'trending-up',
  More: 'ellipsis-horizontal-circle',
  History: 'time',
  Analysis: 'sparkles',
  Profile: 'person',
};

const labels: Record<keyof TabParamList, string> = {
  Today: 'Hoje',
  Workout: 'Treino',
  Progress: 'Progresso',
  More: 'Mais',
  History: 'Histórico',
  Analysis: 'Análise',
  Profile: 'Perfil',
};

const hidden = { tabBarButton: () => null };

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 68, paddingTop: 6, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarLabel: labels[route.name],
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size + 2} color={color} />,
      })}
    >
      <Tab.Screen name="Today" component={HomeScreen} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
      <Tab.Screen name="History" component={HistoryScreen} options={hidden} />
      <Tab.Screen name="Analysis" component={AnalysisScreen} options={hidden} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={hidden} />
    </Tab.Navigator>
  );
}
