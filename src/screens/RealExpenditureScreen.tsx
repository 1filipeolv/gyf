import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import BarChart from '../components/BarChart';
import { useDashboard } from '../hooks/useDashboard';
import { learnedTdee, MIN_FOOD_PCT, MIN_SPAN_DAYS, MIN_WEIGHINS, tdeeSeries } from '../utils/balance';
import { formatDateBR, toDateKey } from '../utils/date';
import { colors, radius, spacing } from '../theme';

const n0 = (v: number) => Math.round(v).toLocaleString('pt-BR');
const CONF = { high: 'alta', medium: 'média' } as const;

export default function RealExpenditureScreen() {
  const dash = useDashboard();
  const today = toDateKey();
  const now = useMemo(() => learnedTdee(dash.weights, dash.dailyLogs, today), [dash.weights, dash.dailyLogs, today]);
  const series = useMemo(() => tdeeSeries(dash.weights, dash.dailyLogs, today, 8), [dash.weights, dash.dailyLogs, today]);

  if (dash.loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.warn}>Estimativa. Depende da qualidade do peso e da alimentação registrada.</Text>

      <View style={styles.card}>
        {now.ok ? (
          <>
            <Text style={styles.big}>{n0(now.value.tdee)} kcal/dia</Text>
            <Text style={styles.hint}>Confiança {CONF[now.value.confidence]} · janela de {now.value.windowDays} dias</Text>
            <Text style={styles.hint}>
              Ingestão média {n0(now.value.avgIntake)} kcal ({now.value.foodDays} dias registrados) e tendência de peso de{' '}
              {String(now.value.slopeKgPerWeek).replace('.', ',')} kg/semana ({now.value.weighIns} pesagens).
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Ainda sem dados suficientes</Text>
            <Text style={styles.hint}>{now.reason}</Text>
          </>
        )}
      </View>

      <Text style={styles.section}>Ao longo das semanas</Text>
      <View style={styles.card}>
        {series.length ? (
          <>
            <BarChart
              data={series.map((p) => ({ label: p.date.slice(8) + '/' + p.date.slice(5, 7), value: p.tdee }))}
              format={(v) => String(Math.round(v))}
            />
            <Text style={styles.hint}>Cada barra é a estimativa de uma janela de 28 dias terminando em {formatDateBR(series[series.length - 1].date)}.</Text>
          </>
        ) : (
          <Text style={styles.hint}>O gráfico aparece quando houver ao menos uma janela com dados suficientes.</Text>
        )}
      </View>

      <Text style={styles.section}>Como é calculado</Text>
      <View style={styles.card}>
        <Text style={styles.hint2}>
          Gasto real = ingestão média − (variação diária da tendência de peso × 7700 kcal/kg). Se o peso cai com a mesma ingestão, o gasto é maior que a ingestão; se sobe, é menor.
        </Text>
        <Text style={styles.hint}>
          Requisitos por janela de 28 dias: alimentação em pelo menos {Math.round(MIN_FOOD_PCT * 100)}% dos dias, {MIN_WEIGHINS} pesagens ou mais cobrindo {MIN_SPAN_DAYS} dias ou mais. Confiança alta: 85% dos dias com alimentação e 14 pesagens.
        </Text>
        <Text style={styles.hint}>
          Se o que você registra for sistematicamente menor ou maior que a realidade, o gasto aprendido sai deslocado na mesma direção. Variações de água e glicogênio mexem no peso em janelas curtas.
        </Text>
      </View>
      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  warn: { color: colors.warning, fontSize: 12, lineHeight: 17, marginBottom: spacing.sm },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  big: { color: colors.text, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  hint2: { color: colors.text, fontSize: 13, lineHeight: 19 },
});
