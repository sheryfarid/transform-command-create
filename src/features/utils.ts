import type { Fact, Region } from '../types/domain';

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
export const now = () => new Date().toISOString();
export const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const isMissing = (v: unknown) => v == null || String(v).trim() === '' || String(v).trim().toLowerCase() === 'unknown';
export const norm = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export const regionOf = (landscape: string): Region =>
  /^EMEA|Benelux|Nordics/.test(landscape) ? 'EMEA'
  : landscape === 'MEA' ? 'MEA'
  : /Americas|LATAM/.test(landscape) ? 'Americas'
  : landscape === 'APAC' ? 'APAC'
  : 'Unassigned';

export const makeFact = (v: unknown): Fact =>
  isMissing(v)
    ? { value: '', status: 'unknown', evidence: [], history: [] }
    : { value: String(v).trim(), status: 'user_asserted', evidence: [], history: [] };

/** Minimal CSV parser for the prototype: no quoted commas. Replace with papaparse for production. */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length);
  if (!lines.length) return [];
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    head.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
    return row;
  });
}
