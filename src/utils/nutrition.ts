export type Macros = { kcal: number | null; proteinG: number | null; carbG: number | null; fatG: number | null };

const NUM = '(\\d{1,3}(?:\\.\\d{3})+|\\d+(?:[.,]\\d+)?)';

const toNum = (s: string) =>
  /^\d{1,3}(\.\d{3})+$/.test(s) ? parseFloat(s.replace(/\./g, '')) : parseFloat(s.replace(',', '.'));

const after = (text: string, words: string) => {
  const m = new RegExp(`(?:${words})[^\\d\\n]{0,30}${NUM}`, 'i').exec(text);
  return m ? toNum(m[1]) : null;
};

const before = (text: string, words: string, unitRequired = false) => {
  const unit = unitRequired ? '(?:g|gramas?)' : '(?:g|gramas?)?';
  const m = new RegExp(`${NUM}[ \\t]*${unit}[ \\t]*(?:de[ \\t]+)?(?:${words})`, 'i').exec(text);
  return m ? toNum(m[1]) : null;
};

const KCAL = 'kcal|calorias?|energia';
const PROT = 'prote[ií]nas?|prot\\.?';
const CARB = 'carboidratos?|carbo|carbs?|cho';
const FAT = 'gorduras?|lip[ií]dios?|fat';

export function parseMacros(text: string): Macros {
  return {
    kcal: before(text, KCAL) ?? after(text, KCAL),
    proteinG: before(text, PROT, true) ?? after(text, PROT) ?? before(text, PROT),
    carbG: before(text, CARB, true) ?? after(text, CARB) ?? before(text, CARB),
    fatG: before(text, FAT, true) ?? after(text, FAT) ?? before(text, FAT),
  };
}

export function macroKcalGap(kcal: number, p: number, c: number, f: number): number | null {
  if (!kcal || !p || !c || !f) return null;
  const est = 4 * p + 4 * c + 9 * f;
  return Math.abs(kcal - est) / est;
}

export const macroKcal = (p: number, c: number, f: number) => Math.round(4 * p + 4 * c + 9 * f);
