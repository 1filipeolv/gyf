import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { authError, login, resetPassword } from '../services/auth';
import { AuthStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(authError(e));
      setLoading(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError('Informe o e-mail para recuperar a senha.');
      return;
    }
    try {
      await resetPassword(email);
      Alert.alert('Pronto', 'Enviamos um link de recuperação para seu e-mail.');
    } catch (e) {
      setError(authError(e));
    }
  };

  return (
    <AuthLayout title="Entrar" subtitle="Acompanhe seu progresso com ciência">
      <Input
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Input
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Entrar" onPress={submit} loading={loading} />
      <View style={styles.gap} />
      <Button title="Esqueci minha senha" onPress={forgot} variant="ghost" />
      <View style={styles.gap} />
      <Button title="Criar conta" onPress={() => navigation.navigate('Register')} variant="ghost" />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
  gap: { height: spacing.sm },
});