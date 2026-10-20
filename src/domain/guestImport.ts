import { validateGuest, type GuestInput } from './guests.js';

/** Import guests from a CSV file (L2-025 to L2-027): checks, column mapping, review and the template. */

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
export const GROUPS = ['Friends', 'Family', 'Work'] as const;

export type ImportField = 'name' | 'email' | 'group' | 'plusOnes';

const HEADERS: Record<string, ImportField> = {
  name: 'name', 'full name': 'name', guest: 'name',
  email: 'email', 'e-mail': 'email', 'email address': 'email',
  group: 'group',
  'plus-ones': 'plusOnes', 'plus ones': 'plusOnes', plusones: 'plusOnes', 'plus-one': 'plusOnes',
};

/** Splits CSV text into rows of fields: quoted fields, doubled quotes, commas and line breaks inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

export interface ImportColumn {
  header: string;
  /** The guest field the column fills, or null when it is not imported. */
  field: ImportField | null;
}

export type CheckedFile = { ok: true; columns: ImportColumn[]; data: string[][] } | { ok: false; error: string };

/** Checks a chosen file before anything else happens (L2-025). */
export function checkImportFile(fileName: string, content: Uint8Array): CheckedFile {
  if (!/\.csv$/i.test(fileName)) return { ok: false, error: 'Choose a .csv file' };
  if (content.byteLength > MAX_IMPORT_BYTES) return { ok: false, error: 'The file is over the 5 MB limit' };
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    return { ok: false, error: 'The file must be saved as UTF-8' };
  }
  const [header = [], ...data] = parseCsv(text);
  if (data.length > MAX_IMPORT_ROWS) return { ok: false, error: 'The file has more than 2,000 rows' };
  const columns = header.map((h) => ({ header: h.trim(), field: HEADERS[h.trim().toLowerCase()] ?? null }));
  if (!columns.some((c) => c.field === 'email')) return { ok: false, error: 'Email is needed to send invitations' };
  return { ok: true, columns, data };
}

export interface ImportRow extends GuestInput {
  /** The row number in the file, counting the header as row 1. */
  row: number;
  status: 'ready' | 'error' | 'duplicate';
  problem?: string;
  /** Set when an unknown group will be imported as Friends (L2-026 AC5). */
  groupNotice?: string;
}

export interface ImportReview {
  rows: ImportRow[];
  counts: { ready: number; error: number; duplicate: number };
}

/** Checks every row like a guest added by hand, and marks emails already in the event or earlier in the file (L2-026). */
export function reviewImport(file: Extract<CheckedFile, { ok: true }>, existingEmails: string[]): ImportReview {
  const seen = new Set(existingEmails.map((e) => e.toLowerCase()));
  const value = (cells: string[], field: ImportField) => {
    const i = file.columns.findIndex((c) => c.field === field);
    return i < 0 ? '' : (cells[i] ?? '').trim();
  };
  const rows = file.data.map((cells, i): ImportRow => {
    const rawGroup = value(cells, 'group');
    const known = GROUPS.find((g) => g.toLowerCase() === rawGroup.toLowerCase());
    const group = rawGroup && !known ? 'Friends' : (known ?? '');
    const rawPlus = value(cells, 'plusOnes');
    const v = validateGuest({ name: value(cells, 'name'), email: value(cells, 'email'), group, plusOnes: rawPlus === '' ? 0 : Number(rawPlus) });
    const base = { row: i + 2, name: value(cells, 'name'), email: value(cells, 'email').toLowerCase(), group, plusOnes: Number(rawPlus) || 0 };
    const notice = rawGroup && !known ? { groupNotice: 'Group will be set to Friends' } : {};
    if (!v.ok) return { ...base, ...notice, status: 'error', problem: Object.values(v.errors)[0] };
    if (seen.has(v.value.email)) return { ...v.value, row: i + 2, ...notice, status: 'duplicate', problem: 'This email is already on the list' };
    seen.add(v.value.email);
    return { ...v.value, row: i + 2, ...notice, status: 'ready' };
  });
  const count = (s: ImportRow['status']) => rows.filter((r) => r.status === s).length;
  return { rows, counts: { ready: count('ready'), error: count('error'), duplicate: count('duplicate') } };
}

/** The template download (L2-027): named after the event, with the four columns and one example row. */
export function guestTemplate(eventName: string): { fileName: string; content: string } {
  const slug = eventName.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
  return { fileName: `${slug}-guests-template.csv`, content: 'name,email,group,plus-ones\r\nMaya Chen,maya@example.com,Friends,1\r\n' };
}
