import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Chips from './Chips';
import { Analysis, AnalysisRecommendation } from '../types';
import { MUSCLE_LABELS } from '../constants/muscles';
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  DISCLAIMER,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STRATEGY_LABELS,
} from '../constants/analysis';
import { formatDateBR, toDateKey } from '../utils/date';
import { colors, radius, spacing } from '../theme';

type CardProps = {
  title: string;
  detail: string;
  evidence?: string;
  accent: string;
  badges?: { label: string; color: string }[];
};

function ExpandCard({ title, detail, evidence, accent, badges }: CardProps) {
  const [open, setOpen] = useState(false);
  const [showEv, setShowEv] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          {!!badges?.length && (
            <View style={styles.badgeRow}>
              {badges.map((b) => (
                <View key={b.label} style={[styles.badge, { borderColor: b.color }]}>
                  <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </View>
      {open && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={styles.body}>{detail}</Text>
          {!!evidence && (
            <View>
              <Pressable onPress={() => setShowEv((v) => !v)} style={styles.evBtn}>
                <Text style={styles.evBtnText}>{showEv ? 'Ocultar evidência' : 'Ver evidência'}</Text>
              </Pressable>
              {showEv && <Text style={styles.ev}>{evidence}</Text>}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.section}>
        {title}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
      {children}
    </View>
  );
}

const PRIORITY_COLOR = { high: colors.danger, medium: colors.warning, low: colors.muted } as const;

type Filter = 'all' | AnalysisRecommendation['category'];

function WeeklyView({ analysis }: { analysis: Analysis }) {
  const w = analysis.weekly!;
  return (
    <View>
      <View style={styles.badgeRow}>
        <View style={styles.pill}>
          <Ionicons name="calendar-outline" size={13} color={colors.muted} />
          <Text style={styles.pillText}>{formatDateBR(toDateKey(new Date(analysis.createdAt)))}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="today-outline" size={13} color={colors.muted} />
          <Text style={styles.pillText}>
            Resumo semanal · {formatDateBR(analysis.input.periodStart)} a {formatDateBR(analysis.input.periodEnd)}
          </Text>
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>{analysis.summary}</Text>
      </View>

      {!!w.wentWell.length && (
        <Section title="O que foi bem">
          {w.wentWell.map((t, i) => (
            <View key={i} style={[styles.card, { borderLeftColor: colors.success }]}>
              <Text style={styles.body}>{t}</Text>
            </View>
          ))}
        </Section>
      )}

      {!!w.toAdjust.length && (
        <Section title="Ajustar na próxima semana">
          {w.toAdjust.map((t, i) => (
            <View key={i} style={[styles.card, { borderLeftColor: colors.warning }]}>
              <Text style={styles.body}>{t}</Text>
            </View>
          ))}
        </Section>
      )}

      {!!w.actions.length && (
        <Section title="3 ações">
          {w.actions.map((a, i) => (
            <View key={i} style={[styles.card, { borderLeftColor: colors.primary }]}>
              <Text style={styles.cardTitle}>
                {i + 1}. {a.title}
              </Text>
              <Text style={[styles.body, { marginTop: 4 }]}>{a.detail}</Text>
            </View>
          ))}
        </Section>
      )}

      <Text style={styles.disc}>{DISCLAIMER}</Text>
    </View>
  );
}

export default function AnalysisView({ analysis }: { analysis: Analysis }) {
  const [filter, setFilter] = useState<Filter>('all');
  const strengths = analysis.strengths ?? [];
  const weaknesses = analysis.weaknesses ?? [];
  const adjustments = analysis.trainingAdjustments ?? [];
  const n = analysis.nutrition;

  const recs = useMemo(
    () =>
      [...(analysis.recommendations ?? [])].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
      ),
    [analysis]
  );

  const filterOptions = useMemo(() => {
    const cats = Array.from(new Set(recs.map((r) => r.category)));
    return [
      { key: 'all' as Filter, label: 'Todas' },
      ...cats.map((c) => ({ key: c as Filter, label: CATEGORY_LABELS[c] ?? c })),
    ];
  }, [recs]);

  const shownRecs = filter === 'all' ? recs : recs.filter((r) => r.category === filter);

  if (analysis.kind === 'weekly' && analysis.weekly) return <WeeklyView analysis={analysis} />;

  const stats: { label: string; value: string }[] = [];
  if (n?.calorieTargetKcal) stats.push({ label: 'Calorias', value: `${n.calorieTargetKcal} kcal` });
  if (n?.proteinGPerKg)
    stats.push({
      label: 'Proteína',
      value: n.proteinTotalG ? `${n.proteinTotalG} g` : `${n.proteinGPerKg} g/kg`,
    });
  if (n?.fatGPerKg) stats.push({ label: 'Gordura', value: `${n.fatGPerKg} g/kg` });

  return (
    <View>
      <View style={styles.badgeRow}>
        <View style={styles.pill}>
          <Ionicons name="calendar-outline" size={13} color={colors.muted} />
          <Text style={styles.pillText}>{formatDateBR(toDateKey(new Date(analysis.createdAt)))}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="barbell-outline" size={13} color={colors.muted} />
          <Text style={styles.pillText}>{analysis.input.workoutsCount} treinos</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="camera-outline" size={13} color={colors.muted} />
          <Text style={styles.pillText}>{analysis.input.photoIds?.length ?? 0} fotos</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>{analysis.summary}</Text>
      </View>

      {!!strengths.length && (
        <Section title="Pontos fortes" count={strengths.length}>
          {strengths.map((f, i) => (
            <ExpandCard key={i} title={f.title} detail={f.detail} evidence={f.evidence} accent={colors.success} />
          ))}
        </Section>
      )}

      {!!weaknesses.length && (
        <Section title="Pontos a melhorar" count={weaknesses.length}>
          {weaknesses.map((f, i) => (
            <ExpandCard key={i} title={f.title} detail={f.detail} evidence={f.evidence} accent={colors.danger} />
          ))}
        </Section>
      )}

      {!!recs.length && (
        <Section title="Recomendações" count={recs.length}>
          {filterOptions.length > 2 && <Chips options={filterOptions} value={filter} onChange={setFilter} />}
          {shownRecs.map((r, i) => (
            <ExpandCard
              key={`${r.title}-${i}`}
              title={r.title}
              detail={r.detail}
              evidence={r.evidence}
              accent={PRIORITY_COLOR[r.priority] ?? colors.muted}
              badges={[
                {
                  label: `Prioridade ${PRIORITY_LABELS[r.priority] ?? r.priority}`,
                  color: PRIORITY_COLOR[r.priority] ?? colors.muted,
                },
                { label: CATEGORY_LABELS[r.category] ?? r.category, color: colors.primary },
              ]}
            />
          ))}
        </Section>
      )}

      {!!adjustments.length && (
        <Section title="Ajustes de treino" count={adjustments.length}>
          {adjustments.map((t, i) => {
            const muscle = t.muscle ? MUSCLE_LABELS[t.muscle] ?? t.muscle : null;
            const action = ACTION_LABELS[t.action] ?? t.action;
            return (
              <ExpandCard
                key={i}
                title={muscle ? `${muscle}: ${action}` : action}
                detail={t.detail}
                evidence={t.evidence}
                accent={colors.primary}
              />
            );
          })}
        </Section>
      )}

      {!!n && (
        <Section title="Nutrição">
          <View style={[styles.card, { borderLeftColor: colors.warning }]}>
            <Text style={styles.cardTitle}>{STRATEGY_LABELS[n.strategy] ?? n.strategy}</Text>
            {!!stats.length && (
              <View style={styles.statsRow}>
                {stats.map((s) => (
                  <View key={s.label} style={styles.stat}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}
            {!!n.proteinGPerKg && !!n.proteinTotalG && (
              <Text style={styles.body}>
                Proteína: {n.proteinGPerKg} g/kg ({n.proteinTotalG} g/dia)
              </Text>
            )}
            {!!n.carbsNote && <Text style={[styles.body, { marginTop: 4 }]}>Carboidratos: {n.carbsNote}</Text>}
            {!!n.rationale && <Text style={styles.ev}>{n.rationale}</Text>}
          </View>
        </Section>
      )}

      <Text style={styles.disc}>{DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 28,
  },
  pillText: { color: colors.muted, fontSize: 12 },
  summary: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  summaryText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    minHeight: 52,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  body: { color: colors.text, fontSize: 14, lineHeight: 20 },
  evBtn: { minHeight: 44, justifyContent: 'center' },
  evBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  ev: { color: colors.muted, fontSize: 12, lineHeight: 18, fontStyle: 'italic', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  disc: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
});
