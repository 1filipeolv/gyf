import { DashData } from '../hooks/useDashboard';
import { AnalysisInputSummary, MuscleGroup, ProgressPhoto } from '../types';
import { MUSCLE_LABELS } from '../constants/muscles';
import { ACTIVITY_LABELS } from '../constants/activities';
import { SITE_LABELS } from '../constants/measurements';
import { addDays, fromDateKey, toDateKey } from '../utils/date';
import { est1RM, setsByMuscle } from '../utils/stats';
import { movingAvg, toPts, weeklyRate } from '../utils/trend';
import { EnergyInputs, lastDays, learnedTdee } from '../utils/balance';

const PERIOD_DAYS = 90;
const r1 = (v: number) => Math.round(v * 10) / 10;

const meanOf = (vals: number[], digits = 0) => {
  if (!vals.length) return null;
  const f = 10 ** digits;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * f) / f;
};

const energyBlock = (d: DashData, today: string) => {
  const ei: EnergyInputs = {
    profile: d.profile,
    weights: d.weights,
    workouts: d.workouts,
    activities: d.activities,
    dailyLogs: d.dailyLogs,
  };
  const days = lastDays(today, 7, ei);
  if (!days.length) return 'sem registros (perfil incompleto ou sem peso)';
  const withBal = days.filter((x) => x.balance !== null);
  const t = learnedTdee(d.weights, d.dailyLogs, today);
  return {
    observacao: 'estimativas: gasto = TMB + treino + atividades + passos sem sobreposição, incerteza de cerca de 15%',
    gastoEstimadoMedio7d: meanOf(days.map((x) => x.total)),
    diasComIngestao: withBal.length,
    balancoMedio7d: withBal.length ? meanOf(withBal.map((x) => x.balance as number)) : 'sem registros',
    gastoRealAprendido: t.ok
      ? {
          kcal: t.value.tdee,
          confianca: t.value.confidence === 'high' ? 'alta' : 'média',
          janelaDias: t.value.windowDays,
          ingestaoMedia: t.value.avgIntake,
          tendenciaPesoKgPorSemana: t.value.slopeKgPerWeek,
        }
      : `indisponível: ${t.reason}`,
  };
};

const periodStats = (d: DashData, from: string, to: string) => {
  const w = d.workouts.filter((x) => x.date >= from && x.date <= to);
  const a = d.activities.filter((x) => x.date >= from && x.date <= to);
  const l = d.dailyLogs.filter((x) => x.date >= from && x.date <= to);
  const wt = d.weights.filter((x) => x.date >= from && x.date <= to);
  const nums = (f: (x: (typeof l)[number]) => number | undefined) => l.map(f).filter((v): v is number => !!v);
  const food = nums((x) => x.kcal);
  return {
    de: from,
    ate: to,
    treinos: w.length,
    series: w.reduce((s, x) => s + x.totalSets, 0),
    volumeKg: Math.round(w.reduce((s, x) => s + x.totalVolumeKg, 0)),
    atividades: a.length,
    atividadesMinutos: Math.round(a.reduce((s, x) => s + x.durationMin, 0)),
    atividadesKcal: Math.round(a.reduce((s, x) => s + x.kcal, 0)),
    diasComPassos: nums((x) => x.steps).length,
    passosMedia: meanOf(nums((x) => x.steps)) ?? 'sem registros',
    diasComSono: nums((x) => x.sleepHours).length,
    sonoMediaHoras: meanOf(nums((x) => x.sleepHours), 1) ?? 'sem registros',
    sonoQualidadeMedia1a5: meanOf(nums((x) => x.sleepQuality), 1) ?? 'sem registros',
    diasComAgua: nums((x) => x.waterMl).length,
    aguaMediaMl: meanOf(nums((x) => x.waterMl)) ?? 'sem registros',
    diasComAlimentacao: food.length,
    kcalMedia: meanOf(food) ?? 'sem registros',
    proteinaMediaG: meanOf(nums((x) => x.proteinG)) ?? 'sem registros',
    carboidratoMediaG: meanOf(nums((x) => x.carbG)) ?? 'sem registros',
    gorduraMediaG: meanOf(nums((x) => x.fatG)) ?? 'sem registros',
    pesagens: wt.length,
    pesoMedioKg: meanOf(wt.map((x) => x.weightKg), 1) ?? 'sem registros',
  };
};

export function buildWeeklyInput(d: DashData) {
  const today = toDateKey();
  const cur = periodStats(d, addDays(today, -6), today);
  const prev = periodStats(d, addDays(today, -13), addDays(today, -7));
  const p = d.profile;
  const rate = weeklyRate(movingAvg(toPts(d.weights), 7), 28);
  const payload = {
    perfil: {
      objetivo: p?.goal,
      experiencia: p?.experience,
      pesoMetaKg: p?.targetWeightKg ?? 'não definido',
      frequenciaMetaSemanal: p?.weeklyFrequencyTarget ?? 'não definida',
    },
    semanaAtual: cur,
    semanaAnterior: prev,
    tendenciaPesoKgPorSemana28d: rate !== null ? Math.round(rate * 100) / 100 : 'sem dados suficientes',
    balancoEGastoReal: energyBlock(d, today),
  };
  const summary: AnalysisInputSummary = {
    periodStart: addDays(today, -6),
    periodEnd: today,
    workoutsCount: cur.treinos,
    weightEntries: cur.pesagens,
    measurementEntries: 0,
    activitiesCount: cur.atividades,
    dailyLogsCount: d.dailyLogs.filter((x) => x.date >= addDays(today, -6)).length,
    photoIds: [],
  };
  return { payload, summary };
}

export function pickPhotos(photos: ProgressPhoto[]): ProgressPhoto[] {
  const front = photos.filter((p) => p.angle === 'front');
  const side = photos.filter((p) => p.angle === 'side');
  const back = photos.filter((p) => p.angle === 'back');
  const list = [
    front[0],
    front[front.length - 1],
    side[side.length - 1],
    back[back.length - 1],
  ].filter(Boolean) as ProgressPhoto[];
  return list.filter((p, i) => list.findIndex((q) => q.id === p.id) === i);
}

export function buildInput(d: DashData, photoIds: string[]) {
  const today = toDateKey();
  const from = addDays(today, -PERIOD_DAYS);
  const workouts = d.workouts.filter((w) => w.date >= from);
  const weights = d.weights.filter((w) => w.date >= from);
  const t = fromDateKey(today);
  const monday = addDays(today, -((t.getDay() + 6) % 7));

  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = addDays(monday, -7 * (11 - i));
    const end = addDays(start, 6);
    const list = workouts.filter((w) => w.date >= start && w.date <= end);
    return {
      semana: start,
      treinos: list.length,
      series: list.reduce((a, w) => a + w.totalSets, 0),
      volumeKg: Math.round(list.reduce((a, w) => a + w.totalVolumeKg, 0)),
      duracaoMediaMin: list.length
        ? Math.round(list.reduce((a, w) => a + w.durationSec, 0) / list.length / 60)
        : 0,
    };
  });

  const from28 = addDays(today, -27);
  const sets28 = setsByMuscle(workouts, from28);
  const muscles = (Object.keys(MUSCLE_LABELS) as MuscleGroup[])
    .map((m) => {
      const sessions = workouts.filter(
        (w) => w.date >= from28 && w.exercises.some((e) => e.primaryMuscle === m && e.sets.some((s) => s.completed))
      ).length;
      return {
        grupo: MUSCLE_LABELS[m],
        seriesPorSemana: r1((sets28[m] ?? 0) / 4),
        sessoesPorSemana: r1(sessions / 4),
      };
    })
    .filter((m) => m.seriesPorSemana > 0);

  const byEx = new Map<string, { nome: string; pts: { date: string; v: number }[] }>();
  [...workouts].reverse().forEach((w) =>
    w.exercises.forEach((e) => {
      const best = Math.max(
        0,
        ...e.sets.filter((s) => s.completed && s.type !== 'warmup').map((s) => est1RM(s.weightKg, s.reps))
      );
      if (!best) return;
      const cur = byEx.get(e.exerciseId) ?? { nome: e.exerciseName, pts: [] };
      cur.pts.push({ date: w.date, v: best });
      byEx.set(e.exerciseId, cur);
    })
  );
  const progression = [...byEx.values()]
    .filter((x) => x.pts.length >= 2)
    .sort((a, b) => b.pts.length - a.pts.length)
    .slice(0, 10)
    .map((x) => {
      const first = x.pts[0].v;
      const last = x.pts[x.pts.length - 1].v;
      return {
        exercicio: x.nome,
        sessoes: x.pts.length,
        e1rmInicial: r1(first),
        e1rmAtual: r1(last),
        variacaoPct: r1(((last - first) / first) * 100),
      };
    });

  const pts = toPts(weights);
  const avg = movingAvg(pts);
  const step = Math.max(1, Math.ceil(avg.length / 16));
  const wSeries = weights
    .map((w, i) => ({ data: w.date, mediaMovel7dKg: r1(avg[i].y), bf: w.bodyFatPct }))
    .filter((_, i, a) => i % step === 0 || i === a.length - 1);
  const rate = weeklyRate(avg);
  const lastAvg = avg[avg.length - 1]?.y;

  const mList = d.measurements.length > 6 ? [d.measurements[0], ...d.measurements.slice(-5)] : d.measurements;
  const measurements = mList.map((m) => ({
    data: m.date,
    ...Object.fromEntries(Object.entries(m.values).map(([k, v]) => [SITE_LABELS[k as keyof typeof SITE_LABELS], v])),
  }));

  const acts = d.activities.filter((a) => a.date >= from);
  const logs = d.dailyLogs.filter((l) => l.date >= from);
  const avgVals = (vals: number[], digits = 1) => {
    if (!vals.length) return null;
    const f = 10 ** digits;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * f) / f;
  };
  const byType = new Map<string, typeof acts>();
  acts.forEach((a) => byType.set(a.type, [...(byType.get(a.type) ?? []), a]));
  const cardio =
    acts.length === 0
      ? 'sem registros'
      : {
          totalSessoes: acts.length,
          sessoesPorSemanaMedia: r1(acts.length / (PERIOD_DAYS / 7)),
          porTipo: [...byType.entries()].map(([t, list]) => {
            const dist = list.filter((x) => x.distanceKm).reduce((a, x) => a + (x.distanceKm ?? 0), 0);
            return {
              tipo: ACTIVITY_LABELS[t as keyof typeof ACTIVITY_LABELS] ?? t,
              sessoes: list.length,
              minutosTotais: Math.round(list.reduce((a, x) => a + x.durationMin, 0)),
              ...(dist > 0 ? { distanciaKmTotal: r1(dist) } : {}),
              kcalMediaPorSessao: Math.round(list.reduce((a, x) => a + x.kcal, 0) / list.length),
              kcalManuaisDe: list.filter((x) => x.kcalSource === 'manual').length,
            };
          }),
          observacaoKcal: 'estimativa por MET, exceto as marcadas como manuais',
        };
  const stepVals = logs.filter((l) => l.steps).map((l) => l.steps as number);
  const sleepVals = logs.filter((l) => l.sleepHours).map((l) => l.sleepHours as number);
  const qualVals = logs.filter((l) => l.sleepQuality).map((l) => l.sleepQuality as number);
  const dailyRecent = logs
    .filter((l) => l.date >= addDays(today, -13) && (l.steps || l.sleepHours))
    .map((l) => ({
      data: l.date,
      ...(l.steps ? { passos: l.steps } : {}),
      ...(l.sleepHours ? { sonoHoras: l.sleepHours } : {}),
    }));
  const passosESono =
    stepVals.length + sleepVals.length === 0
      ? 'sem registros'
      : {
          diasComPassos: stepVals.length,
          mediaPassosPorDia: avgVals(stepVals, 0) ?? 'sem registros',
          diasComSono: sleepVals.length,
          mediaSonoHoras: avgVals(sleepVals) ?? 'sem registros',
          mediaQualidadeSono1a5: avgVals(qualVals) ?? 'sem registros',
          ultimos14Dias: dailyRecent,
        };

  const foodLogs = logs.filter((l) => l.kcal);
  const waterLogs = logs.filter((l) => l.waterMl);
  const nums = (list: typeof logs, f: (l: (typeof logs)[number]) => number | undefined) =>
    list.map(f).filter((v): v is number => !!v);
  const foodRecent = foodLogs
    .filter((l) => l.date >= addDays(today, -13))
    .map((l) => ({
      data: l.date,
      kcal: l.kcal,
      ...(l.proteinG ? { proteinaG: l.proteinG } : {}),
      ...(l.carbG ? { carboidratoG: l.carbG } : {}),
      ...(l.fatG ? { gorduraG: l.fatG } : {}),
    }));
  const alimentacaoEAgua =
    foodLogs.length + waterLogs.length === 0
      ? 'sem registros'
      : {
          observacao: 'valores digitados pelo usuário, calculados por outra IA: são estimativas',
          diasComAlimentacao: foodLogs.length,
          mediaKcalPorDia: avgVals(nums(foodLogs, (l) => l.kcal), 0) ?? 'sem registros',
          mediaProteinaG: avgVals(nums(foodLogs, (l) => l.proteinG), 0) ?? 'sem registros',
          mediaCarboidratoG: avgVals(nums(foodLogs, (l) => l.carbG), 0) ?? 'sem registros',
          mediaGorduraG: avgVals(nums(foodLogs, (l) => l.fatG), 0) ?? 'sem registros',
          ultimos14Dias: foodRecent,
          diasComAgua: waterLogs.length,
          mediaAguaMl: avgVals(nums(waterLogs, (l) => l.waterMl), 0) ?? 'sem registros',
        };

  const p = d.profile;
  const age = p?.birthDate
    ? Math.floor((Date.now() - fromDateKey(p.birthDate).getTime()) / 31557600000)
    : undefined;

  const payload = {
    perfil: {
      objetivo: p?.goal,
      experiencia: p?.experience,
      sexo: p?.sex ?? 'não informado',
      idade: age ?? 'não informada',
      alturaCm: p?.heightCm ?? 'não informada',
      pesoMetaKg: p?.targetWeightKg ?? 'não definido',
      frequenciaMetaSemanal: p?.weeklyFrequencyTarget ?? 'não definida',
    },
    periodo: { inicio: from, fim: today, dias: PERIOD_DAYS },
    treinoSemanal12Semanas: weeks,
    volumePorGrupoUltimas4Semanas: muscles,
    progressaoCarga1RMEstimado: progression,
    totalTreinosPeriodo: workouts.length,
    prsPeriodo: workouts.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter((s) => s.isPR).length, 0), 0),
    peso: {
      registros: wSeries,
      tendenciaKgPorSemana: rate !== null ? r1(rate * 100) / 100 : null,
      tendenciaPctPorSemana: rate !== null && lastAvg ? Math.round((rate / lastAvg) * 10000) / 100 : null,
    },
    medidasCm: measurements,
    atividadesCardio: cardio,
    passosESono,
    alimentacaoEAgua,
    balancoEGastoReal: energyBlock(d, today),
  };

  const summary: AnalysisInputSummary = {
    periodStart: from,
    periodEnd: today,
    workoutsCount: workouts.length,
    weightEntries: weights.length,
    measurementEntries: d.measurements.length,
    activitiesCount: acts.length,
    dailyLogsCount: logs.length,
    photoIds,
  };

  return { payload, summary };
}