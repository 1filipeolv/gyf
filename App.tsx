import React from 'react';
import ToastHost from './src/components/ToastHost';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { WorkoutProvider } from './src/contexts/WorkoutContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <WorkoutProvider>
          <RootNavigator />
          <ToastHost />
        </WorkoutProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}