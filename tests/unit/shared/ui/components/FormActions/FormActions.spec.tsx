import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, FormActions } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/form-actions.html (end, between, start).
describe('FormActions', () => {
  it.each([
    ['end', 'form-actions'],
    ['between', 'form-actions form-actions--between'],
    ['start', 'form-actions form-actions--start'],
  ] as const)('renders the %s alignment', (align, className) => {
    render(<FormActions align={align}><Button>Cancel</Button><Button variant="primary">Save</Button></FormActions>);
    expect(screen.getByRole('button', { name: 'Save' }).parentElement?.className).toBe(className);
  });

  it('keeps the buttons in source order (primary last)', () => {
    render(<FormActions><Button>Cancel</Button><Button variant="primary">Save</Button></FormActions>);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Cancel', 'Save']);
  });
});
