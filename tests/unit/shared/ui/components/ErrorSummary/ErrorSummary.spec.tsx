import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorSummary } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/error-summary.html (single error, several errors, hidden).
describe('ErrorSummary', () => {
  it('renders nothing without errors', () => {
    const { container } = render(<ErrorSummary errors={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('single error: titled "1 thing to fix", announced and focused on mount', () => {
    render(<ErrorSummary errors={[{ fieldId: 'hero-headline', message: 'Enter a headline.' }]} />);
    const box = screen.getByRole('alert');
    expect(box.className).toBe('alert alert--danger form-summary');
    expect(box.id).toBe('form-errors');
    expect(box.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(box);
    expect(box.textContent).toContain('1 thing to fix');
    expect(screen.getByRole('link', { name: 'Enter a headline.' }).getAttribute('href')).toBe('#hero-headline');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('several errors: lists a link per field', () => {
    render(<ErrorSummary errors={[{ fieldId: 'a', message: 'One' }, { fieldId: 'b', message: 'Two' }]} />);
    expect(screen.getByRole('alert').textContent).toContain('2 things to fix');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('custom title, id and no autofocus', () => {
    render(<ErrorSummary title="Check your reply" id="sum" autoFocus={false} errors={[{ fieldId: 'a', message: 'One' }]} />);
    const box = screen.getByRole('alert');
    expect(box.id).toBe('sum');
    expect(box.textContent).toContain('Check your reply');
    expect(document.activeElement).not.toBe(box);
  });

  it('activating a link moves focus to the field, or the first control of a fieldset', () => {
    render(
      <>
        <ErrorSummary errors={[{ fieldId: 'email', message: 'Enter an email' }, { fieldId: 'attend', message: 'Choose one' }]} />
        <input id="email" aria-label="Email" />
        <fieldset id="attend"><legend>Attend</legend><input type="radio" aria-label="Yes" /></fieldset>
      </>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Enter an email' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Email' }));
    fireEvent.click(screen.getByRole('link', { name: 'Choose one' }));
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Yes' }));
  });

  it('focuses again when errors reappear', () => {
    const { rerender } = render(<ErrorSummary errors={[]} />);
    rerender(<ErrorSummary errors={[{ fieldId: 'a', message: 'One' }]} />);
    expect(document.activeElement).toBe(screen.getByRole('alert'));
  });
});
