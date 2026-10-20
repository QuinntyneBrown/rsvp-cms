import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { List, ListItem } from '../../../../../../src/shared/ui/components/index.js';

// Design system: docs/design-system/components/list.html (static, ordered, link and button rows).
describe('List', () => {
  it('renders an unordered list of rows with title, meta, leading and trailing content', () => {
    render(
      <List aria-label="Upcoming events">
        <ListItem title="Maya’s 30th" meta="Sat 14 Nov" leading={<span>L</span>} trailing={<span>T</span>} />
      </List>,
    );
    const list = screen.getByRole('list', { name: 'Upcoming events' });
    expect(list.tagName).toBe('UL');
    expect(list.className).toBe('list');
    const item = screen.getByRole('listitem');
    expect(item.className).toBe('list__item');
    expect(item.textContent).toBe('LMaya’s 30thSat 14 NovT');
    expect(screen.getByText('Maya’s 30th').className).toBe('list__title');
    expect(screen.getByText('Sat 14 Nov').className).toBe('list__meta');
  });

  it('ordered renders an <ol> with free content rows', () => {
    render(
      <List ordered>
        <ListItem><strong>6:30 pm</strong><span>Doors and drinks</span></ListItem>
      </List>,
    );
    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(screen.getByRole('listitem').querySelector('.list__body')).toBeNull();
  });

  it('href makes the whole row one link', () => {
    render(<List><ListItem title="Maya’s 30th" href="/events/1" /></List>);
    const link = screen.getByRole('link', { name: 'Maya’s 30th' });
    expect(link.className).toBe('list__item list__item--interactive');
    expect(link.getAttribute('href')).toBe('/events/1');
  });

  it('onClick makes the whole row one button', () => {
    const onClick = vi.fn();
    render(<List><ListItem title="Maya’s 30th" onClick={onClick} /></List>);
    const button = screen.getByRole('button', { name: 'Maya’s 30th' });
    expect(button.className).toBe('list__item list__item--interactive');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
