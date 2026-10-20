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
    description: 'Headline, supporting line and button',
    fields: [
      { key: 'headline', label: 'Headline', max: 120 },
      { key: 'subhead', label: 'Supporting line', max: 200 },
      { key: 'buttonLabel', label: 'Button label', max: 40 },
    ],
  },
  details: { label: 'Details', description: 'When, where and dress code', fields: [{ key: 'text', label: 'Details', multiline: true }] },
  schedule: { label: 'Schedule', description: 'A timed list of the evening', fields: [{ key: 'items', label: 'Schedule items', multiline: true }] },
  map: { label: 'Map', description: 'Address, transit and parking', fields: [{ key: 'address', label: 'Address' }] },
  rsvp: { label: 'RSVP form', description: 'The reply form guests use', fields: [] },
  faq: {
    label: 'FAQ',
    description: 'Questions and answers',
    fields: [
      { key: 'question', label: 'Question' },
      { key: 'answer', label: 'Answer', multiline: true },
    ],
  },
  gallery: { label: 'Photo gallery', description: 'Up to 12 photos', fields: [{ key: 'caption', label: 'Caption' }] },
  gifts: { label: 'Gift list', description: 'Links to wishlists', fields: [{ key: 'link', label: 'Link' }] },
};
