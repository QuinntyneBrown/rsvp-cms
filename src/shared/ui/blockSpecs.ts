import type { BlockType } from '../../domain/blocks.js';

/** The block catalogue: labels, picker descriptions and editable fields. Plain data, so tests can import it without loading UI. */
export interface BlockSpec {
  label: string;
  description: string;
  fields: { key: string; label: string; max?: number; multiline?: boolean }[];
}

export const BLOCK_SPECS: Record<BlockType, BlockSpec> = {
  hero: {
    label: 'Hero',
    description: 'A large headline with an optional button.',
    fields: [
      { key: 'headline', label: 'Headline', max: 120 },
      { key: 'subhead', label: 'Subheading', max: 200 },
      { key: 'buttonLabel', label: 'Button label', max: 40 },
    ],
  },
  details: { label: 'Details', description: 'When and where, in a few lines.', fields: [{ key: 'text', label: 'Details', multiline: true }] },
  schedule: { label: 'Schedule', description: 'A timeline of the day.', fields: [{ key: 'items', label: 'Schedule items', multiline: true }] },
  map: { label: 'Map', description: 'An address guests can find.', fields: [{ key: 'address', label: 'Address' }] },
  rsvp: { label: 'RSVP form', description: 'Where guests reply. Its fields are fixed.', fields: [] },
  faq: {
    label: 'FAQ',
    description: 'Answers to common questions.',
    fields: [
      { key: 'question', label: 'Question' },
      { key: 'answer', label: 'Answer', multiline: true },
    ],
  },
  gallery: { label: 'Photo gallery', description: 'Photos of the occasion.', fields: [{ key: 'caption', label: 'Caption' }] },
  gifts: { label: 'Gift list', description: 'Where to find the gift list.', fields: [{ key: 'link', label: 'Link' }] },
};
