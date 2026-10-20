import type { FieldErrors } from './result.js';

export const BLOCK_TYPES = ['hero', 'details', 'schedule', 'map', 'rsvp', 'faq', 'gallery', 'gifts'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export const MAX_BLOCKS = 12;

export interface Block {
  id: string;
  type: BlockType;
  fields: Record<string, string>;
}

/** Errors keyed by `${blockId}.${field}`; the first key is the first invalid field in page order. */
export function validateBlocks(blocks: Block[]): FieldErrors {
  const errors: FieldErrors = {};
  if (blocks.length > MAX_BLOCKS) errors.page = 'A page can have up to 12 blocks';
  for (const b of blocks) {
    if (!BLOCK_TYPES.includes(b.type)) errors[`${b.id}.type`] = 'Unknown block type';
    if (b.type === 'hero') {
      const headline = (b.fields.headline ?? '').trim();
      if (!headline) errors[`${b.id}.headline`] = 'Add a headline';
      else if (headline.length > 120) errors[`${b.id}.headline`] = 'Headline can be up to 120 characters';
      if ((b.fields.buttonLabel ?? '').length > 40) errors[`${b.id}.buttonLabel`] = 'Button label can be up to 40 characters';
    }
  }
  return errors;
}

export function parseBlocks(input: unknown): Block[] | null {
  if (!Array.isArray(input)) return null;
  const out: Block[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.type !== 'string') return null;
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries((r.fields as object) ?? {})) fields[k] = String(v ?? '');
    out.push({ id: r.id, type: r.type as BlockType, fields });
  }
  return out;
}
