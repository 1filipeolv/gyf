import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { refreshWaterReminders } from '../utils/water';
import { AuthStackParamList, RootStackParamList } from './types';
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RoutinesScreen from '../screens/RoutinesScreen';
import RoutineEditScreen from '../screens/RoutineEditScreen';
import LibraryScreen from '../screens/LibraryScreen';
import { useAuth } from '../contexts/AuthContext';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import WeightScreen from '../screens/WeightScreen';
import MeasurementsScreen from '../screens/MeasurementsScreen';
import PhotosScreen from '../screens/PhotosScreen';
import PhotoCompareScreen from '../screens/PhotoCompareScreen';
import AnalysisHistoryScreen from '../screens/AnalysisHistoryScreen';
import AnalysisDetailScreen from '../screens/AnalysisDetailScreen';
import BackupScreen from '../screens/BackupScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import DailyLogScreen from '../screens/DailyLogScreen';
import NutritionScreen from '../screens/NutritionScreen';
import WaterScreen from '../screens/WaterScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) refreshWaterReminders(user.uid).catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="Routines" component={RoutinesScreen} options={{ headerShown: true, title: 'Rotinas' }} />
          <Stack.Screen name="RoutineEdit" component={RoutineEditScreen} options={{ headerShown: true, title: 'Rotina' }} />
          <Stack.Screen name="Library" component={LibraryScreen} options={{ headerShown: true, title: 'Biblioteca' }} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ headerShown: true, title: 'Treino' }} />
          <Stack.Screen name="Weight" component={WeightScreen} options={{ headerShown: true, title: 'Peso corporal' }} />
          <Stack.Screen name="Measurements" component={MeasurementsScreen} options={{ headerShown: true, title: 'Medições' }} />
          <Stack.Screen name="Photos" component={PhotosScreen} options={{ headerShown: true, title: 'Fotos' }} />
          <Stack.Screen name="PhotoCompare" component={PhotoCompareScreen} options={{ headerShown: true, title: 'Comparar' }} />
          <Stack.Screen name="Backup" component={BackupScreen} options={{ headerShown: true, title: 'Dados e backup' }} />
          <Stack.Screen name="Calendar" component={CalendarScreen} options={{ headerShown: true, title: 'Frequência' }} />
          <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ headerShown: true, title: 'Atividades' }} />
          <Stack.Screen name="DailyLog" component={DailyLogScreen} options={{ headerShown: true, title: 'Registro do dia' }} />
          <Stack.Screen name="Nutrition" component={NutritionScreen} options={{ headerShown: true, title: 'Alimentação' }} />
          <Stack.Screen name="Water" component={WaterScreen} options={{ headerShown: true, title: 'Água' }} />
          <Stack.Screen name="AnalysisHistory" component={AnalysisHistoryScreen} options={{ headerShown: true, title: 'Análises anteriores' }} />
          <Stack.Screen name="AnalysisDetail" component={AnalysisDetailScreen} options={{ headerShown: true, title: 'Análise' }} />
        </Stack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
