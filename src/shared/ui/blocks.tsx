import type { ReactNode } from 'react';
import type { Block, BlockType } from '../../domain/blocks.js';

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

/** Used by both the organiser preview and the guest page, so a preview is exactly what guests see (L2-017). */
export function BlockView({ block, rsvpSlot }: { block: Block; rsvpSlot?: ReactNode }) {
  const f = block.fields;
  switch (block.type) {
    case 'hero':
      return (
        <section className="stack" aria-label="Hero">
          <h1>{f.headline}</h1>
          {f.subhead && <p className="text-muted">{f.subhead}</p>}
          {f.buttonLabel && <a className="btn btn--primary" href="#rsvp">{f.buttonLabel}</a>}
        </section>
      );
    case 'rsvp':
      return <section id="rsvp" aria-label="RSVP">{rsvpSlot ?? <p className="text-muted">The RSVP form appears here for guests.</p>}</section>;
    default: {
      const spec = BLOCK_SPECS[block.type];
      return (
        <section className="stack" aria-label={spec.label}>
          <h2>{spec.label}</h2>
          {spec.fields.map((s) => (f[s.key] ? <p key={s.key} style={{ whiteSpace: 'pre-wrap' }}>{f[s.key]}</p> : null))}
        </section>
      );
    }
  }
}
