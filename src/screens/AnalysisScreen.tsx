import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import Button from '../components/Button';
import AnalysisView from '../components/AnalysisView';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { runAnalysis, runWeeklySummary } from '../services/ai';
import { listAnalyses, saveAnalysis } from '../services/analyses';
import { Analysis } from '../types';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

const WAIT_MESSAGES = [
  'Reunindo seus registros...',
  'Analisando treinos e volume por grupo muscular...',
  'Avaliando peso, medidas e fotos...',
  'Montando recomendações...',
  'Quase pronto, isso pode levar até 1 minuto...',
];

function Check({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={ok ? colors.success : colors.muted}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.checkLabel}>{label}</Text>
        {!ok && <Text style={styles.checkHint}>{hint}</Text>}
      </View>
    </View>
  );
}

export default function AnalysisScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const dash = useDashboard();
  const [last, setLast] = useState<Analysis | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingLast, setLoadingLast] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      listAnalyses(user.uid, 20)
        .then((l) => {
          setLast(l[0] ?? null);
          setTotal(l.length);
        })
        .catch(() => {})
        .finally(() => setLoadingLast(false));
    }, [user])
  );

  useEffect(() => {
    if (!busy) {
      setMsgIdx(0);
      return;
    }
    const t = setInterval(() => setMsgIdx((i) => Math.min(i + 1, WAIT_MESSAGES.length - 1)), 7000);
    return () => clearInterval(t);
  }, [busy]);

  const hasWorkouts = dash.workouts.length > 0;
  const hasWeights = dash.weights.length > 0;
  const hasMeasures = dash.measurements.length > 0;
  const hasPhotos = dash.photos.length > 0;
  const canGenerate = hasWorkouts || hasWeights;

  const generate = async (kind: 'full' | 'weekly' = 'full') => {
    if (!user || busy) return;
    if (!canGenerate) {
      setError('Registre treinos ou peso antes de analisar.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const a = kind === 'weekly' ? await runWeeklySummary(dash) : await runAnalysis(dash);
      const id = await saveAnalysis(user.uid, a);
      const now = Date.now();
      setLast({ ...a, id, createdAt: now, updatedAt: now });
      setTotal((t) => t + 1);
    } catch (e) {
      setError((e as Error).message || 'Não foi possível gerar a análise.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title="Análise">
      <ScrollView showsVerticalScrollIndicator={false}>
        {loadingLast || dash.loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <View>
            {!last && !busy && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Análise inteligente</Text>
                <Text style={styles.cardText}>
                  A IA avalia seus treinos, peso, medidas e fotos para apontar pontos fortes, fracos e próximos passos.
                  Quanto mais dados, melhor.
                </Text>
                <View style={{ marginTop: spacing.sm }}>
                  <Check ok={hasWorkouts} label="Treinos" hint="Registre ao menos um treino" />
                  <Check ok={hasWeights} label="Peso corporal" hint="Registre seu peso na aba Progresso" />
                  <Check ok={hasMeasures} label="Medições" hint="Opcional: registre medidas corporais" />
                  <Check ok={hasPhotos} label="Fotos de progresso" hint="Opcional: adicione fotos de frente, lado e costas" />
                  <Check
                    ok={!!dash.profile?.heightCm && !!dash.profile?.sex && !!dash.profile?.birthDate}
                    label="Perfil completo"
                    hint="Sexo, idade e altura permitem estimar calorias"
                  />
                </View>
              </View>
            )}

            <View style={{ marginTop: spacing.sm }}>
              <Button title={last ? 'Gerar nova análise' : 'Gerar análise'} onPress={() => generate('full')} loading={busy} />
              <View style={{ height: spacing.sm }} />
              <Button title="Resumo semanal (sem fotos)" variant="ghost" onPress={() => generate('weekly')} />
            </View>

            {busy && (
              <View style={[styles.card, styles.waitCard]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.waitText}>{WAIT_MESSAGES[msgIdx]}</Text>
              </View>
            )}

            {!!error && !busy && (
              <View style={[styles.card, styles.errCard]}>
                <Ionicons name="alert-circle" size={22} color={colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errTitle}>Algo deu errado</Text>
                  <Text style={styles.cardText}>{error}</Text>
                  {canGenerate && (
                    <Pressable onPress={() => generate()} style={styles.retry}>
                      <Text style={styles.retryText}>Tentar de novo</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {total > 0 && !busy && (
              <Pressable onPress={() => nav.navigate('AnalysisHistory')} style={styles.histBtn}>
                <Ionicons name="time-outline" size={20} color={colors.text} />
                <Text style={styles.histText}>Análises anteriores ({total})</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            )}

            {!!last && !busy && <AnalysisView analysis={last} />}
          </View>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xl * 2, alignItems: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  checkLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  checkHint: { color: colors.muted, fontSize: 12 },
  waitCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waitText: { color: colors.text, fontSize: 14, flex: 1 },
  errCard: { flexDirection: 'row', gap: spacing.sm, borderWidth: 1, borderColor: colors.danger },
  errTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 2 },
  retry: { minHeight: 44, justifyContent: 'center' },
  retryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  histBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  histText: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '600' },
});
