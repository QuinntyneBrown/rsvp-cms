import type { ReactNode } from 'react';
import type { Block } from '../../domain/blocks.js';
import { BLOCK_SPECS } from './blockSpecs.js';
import { Button, Stack } from './components/index.js';
import { Text } from './primitives/index.js';

export { BLOCK_SPECS, type BlockSpec } from './blockSpecs.js';

/** Used by both the organiser preview and the guest page, so a preview is exactly what guests see (L2-017). */
export function BlockView({ block, rsvpSlot }: { block: Block; rsvpSlot?: ReactNode }) {
  const f = block.fields;
  switch (block.type) {
    case 'hero':
      return (
        <Stack as="section" aria-label="Hero">
          <h1>{f.headline}</h1>
          {f.subhead && <Text tone="muted">{f.subhead}</Text>}
          {f.buttonLabel && <div><Button variant="primary" href="#rsvp">{f.buttonLabel}</Button></div>}
        </Stack>
      );
    case 'rsvp':
      return <section id="rsvp" aria-label="RSVP">{rsvpSlot ?? <Text tone="muted">The RSVP form appears here for guests.</Text>}</section>;
    default: {
      const spec = BLOCK_SPECS[block.type];
      return (
        <Stack as="section" aria-label={spec.label}>
          <h2>{spec.label}</h2>
          {spec.fields.map((s) => (f[s.key] ? <p key={s.key}>{withLineBreaks(f[s.key]!)}</p> : null))}
        </Stack>
      );
    }
  }
}

/** Keeps the line breaks organisers type into multi-line fields. */
function withLineBreaks(text: string): ReactNode[] {
  return text.split('\n').flatMap((line, i) => (i ? [<br key={i} />, line] : [line]));
}
