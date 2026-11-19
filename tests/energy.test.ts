import { ageFromBirth, bmrMifflin, computeTargets, coveredSteps, uncertaintyBand } from '../src/utils/energy';
import { dayEnergy, learnedTdee, tdeeSeries } from '../src/utils/balance';
import { addDays } from '../src/utils/date';

let fails = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) fails++;
};
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

check('bmr homem 80kg 180cm 30a = 1780', bmrMifflin('male', 30, 180, 80) === 1780);
check('bmr mulher 60kg 165cm 28a = 1330', bmrMifflin('female', 28, 165, 60) === 1330);
check('idade', ageFromBirth('1996-11-20', new Date(2026, 10, 19)) === 29 && ageFromBirth('1996-11-19', new Date(2026, 10, 19)) === 30);
check('passos cobertos', coveredSteps('walk', 30, 3) === 3936 && coveredSteps('run', 30) === 4800 && coveredSteps('bike', 30) === 0);
check('faixa', uncertaintyBand(2000, 2000) === 500);

const t = computeTargets('fat_loss', 2500, 80, 1780);
check('meta cutting kcal 2000', t.kcal === 2000 && t.proteinG === 176 && t.fatG === 64 && !t.flooredToBmr);
check('meta carbo >= 0', t.carbG === Math.round((2000 - 4 * 176 - 9 * 64) / 4));
check('meta piso TMB', computeTargets('fat_loss', 1800, 80, 1780).kcal === 1780);
check('meta bulk +10%', computeTargets('hypertrophy', 2500, 80, 1780).kcal === 2750);

const today = '2026-11-19';
const profile = { uid: 'u', name: 'a', email: '', sex: 'male', birthDate: '1996-01-01', heightCm: 180, goal: 'hypertrophy', experience: 'beginner', weightUnit: 'kg', restTimerDefaultSec: 90, createdAt: 0, updatedAt: 0 } as never;
const mk = (n: number, f: (i: number) => object) => Array.from({ length: n }, (_, i) => ({ id: addDays(today, -(n - 1 - i)), date: addDays(today, -(n - 1 - i)), createdAt: 0, updatedAt: 0, ...f(i) }));
const weights = mk(28, (i) => ({ weightKg: 80 - i * (0.5 / 7) })) as never[];
const logs = mk(28, () => ({ kcal: 2000 })) as never[];
const r = learnedTdee(weights, logs, today);
check('tdee ok com dados', r.ok);
if (r.ok) {
  const slope = r.value.slopeKgPerWeek;
  check('tdee = ingestao - slope*1100', near(r.value.tdee, 2000 - (slope / 7) * 7700, 8) && near(slope, -0.5, 0.05) && near(r.value.tdee, 2550, 40));
  check('confianca alta', r.value.confidence === 'high');
}
check('esconde sem alimentacao', !learnedTdee(weights, (logs as never[]).slice(0, 10), today).ok);
check('esconde sem pesagem', !learnedTdee((weights as never[]).slice(0, 5), logs, today).ok);
check('serie 8 semanas ate 1 ponto', tdeeSeries(weights, logs, today, 1).length === 1);

const inp = { profile, weights, workouts: [{ date: today, durationSec: 3600 }] as never[], activities: [{ date: today, type: 'walk', durationMin: 30, distanceKm: 3, kcal: 150 }] as never[], dailyLogs: [{ date: today, steps: 8000, kcal: 2500 }] as never[] };
const e = dayEnergy(today, inp);
check('dia calculado', !!e && e.workout > 0 && e.activity === 150 && e.stepsCounted === 8000 - 3936 && e.balance === 2500 - e.total);
check('sem perfil = null', dayEnergy(today, { ...inp, profile: null }) === null);

if (fails) throw new Error(`${fails} falhas`);
console.log('todos ok');
