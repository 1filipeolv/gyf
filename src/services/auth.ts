import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { createProfile } from './db';

export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function register(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim() });
  await createProfile(cred.user.uid, name.trim(), email.trim());
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logout() {
  await signOut(auth);
}

export function authError(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/missing-password': 'Informe a senha.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'E-mail já cadastrado.',
    'auth/weak-password': 'Senha deve ter ao menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco.',
    'auth/network-request-failed': 'Sem conexão.',
  };
  return map[code] ?? 'Erro inesperado. Tente novamente.';
}
