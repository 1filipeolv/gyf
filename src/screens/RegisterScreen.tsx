import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { authError, register } from '../services/auth';
import { AuthStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Informe seu nome.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (e) {
      setError(authError(e));
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Criar conta" subtitle="Comece a registrar seus treinos">
      <Input label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
      <Input
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
      <Input label="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Cadastrar" onPress={submit} loading={loading} />
      <View style={styles.gap} />
      <Button title="Já tenho conta" onPress={() => navigation.goBack()} variant="ghost" />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
  gap: { height: spacing.sm },
});