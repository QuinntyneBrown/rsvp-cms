import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/progress-bar.html (determinate, indeterminate, tones, label).
describe('ProgressBar', () => {
  it('determinate: a native progressbar named by its label with value and max', () => {
    render(<ProgressBar label="Replies received" value={73} />);
    const bar = screen.getByRole('progressbar', { name: 'Replies received' });
    expect(bar.tagName).toBe('PROGRESS');
    expect(bar.getAttribute('value')).toBe('73');
    expect(bar.getAttribute('max')).toBe('100');
    expect(bar.className).toBe('progress');
    expect(bar.getAttribute('style')).toBeNull();
  });

  it('clamps the value into range and supports a custom max and value text', () => {
    render(<ProgressBar label="Importing" value={120} max={81} valueText="81 of 81 added" />);
    const bar = screen.getByRole('progressbar', { name: 'Importing' });
    expect(bar.getAttribute('value')).toBe('81');
    expect(bar.getAttribute('max')).toBe('81');
    expect(bar.getAttribute('aria-valuetext')).toBe('81 of 81 added');
  });

  it('indeterminate: no value, animated bar inside a named progressbar', () => {
    const { container } = render(<ProgressBar label="Reading file" />);
    const bar = screen.getByRole('progressbar', { name: 'Reading file' });
    expect(bar.className).toBe('progress progress--indeterminate');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(container.querySelector('.progress__bar')).not.toBeNull();
  });

  it.each([
    ['default', 'progress'],
    ['success', 'progress progress--success'],
    ['danger', 'progress progress--danger'],
  ] as const)('renders the %s tone', (tone, className) => {
    render(<ProgressBar label="Sent" value={10} tone={tone} />);
    expect(screen.getByRole('progressbar').className).toBe(className);
  });

  it('showLabel: shows the label and percentage and is labelled by the visible text', () => {
    render(<ProgressBar label="Replies received" value={73} showLabel />);
    expect(screen.getByRole('progressbar', { name: 'Replies received' }).getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByText('73%')).toBeTruthy();
  });
});
