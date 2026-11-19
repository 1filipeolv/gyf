const SEP = ';';

const cell = (v: unknown): string => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number') return String(v).replace('.', ',');
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(cell).join(SEP), ...rows.map((r) => r.map(cell).join(SEP))];
  return '\uFEFF' + lines.join('\r\n');
}
