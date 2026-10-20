import { describe, expect, it } from 'vitest';
import { MAX_BLOCKS, parseBlocks, validateBlocks, type Block } from '../../../src/domain/blocks.js';

const hero = (fields: Record<string, string>, id = 'h'): Block => ({ id, type: 'hero', fields });

describe('block rules (L2-013, L2-014, L2-015)', () => {
  it('L2-014 AC1 needs a Hero headline, and AC2 limits headline and button label', () => {
    expect(validateBlocks([hero({ headline: '  ' })])).toEqual({ 'h.headline': 'Add a headline' });
    expect(validateBlocks([hero({ headline: 'x'.repeat(120), buttonLabel: 'y'.repeat(40) })])).toEqual({});
    expect(Object.keys(validateBlocks([hero({ headline: 'x'.repeat(121), buttonLabel: 'y'.repeat(41) })]))).toEqual(['h.headline', 'h.buttonLabel']);
  });

  it('L2-013 AC4 caps a page at 12 blocks', () => {
    const blocks = Array.from({ length: MAX_BLOCKS + 1 }, (_, i): Block => ({ id: `b${i}`, type: 'faq', fields: {} }));
    expect(validateBlocks(blocks).page).toBe('A page can have up to 12 blocks');
    expect(validateBlocks(blocks.slice(0, MAX_BLOCKS)).page).toBeUndefined();
  });

  it('L2-015 AC5 reports errors in page order so the first invalid field can be focused', () => {
    expect(Object.keys(validateBlocks([hero({ headline: '' }, 'a'), hero({ headline: '' }, 'b')]))).toEqual(['a.headline', 'b.headline']);
  });

  it('parses only well-formed blocks and stringifies field values', () => {
    expect(parseBlocks('nope')).toBeNull();
    expect(parseBlocks([{ id: 1, type: 'hero' }])).toBeNull();
    expect(parseBlocks([{ id: 'a', type: 'map', fields: { address: 12 } }])).toEqual([{ id: 'a', type: 'map', fields: { address: '12' } }]);
  });
});
