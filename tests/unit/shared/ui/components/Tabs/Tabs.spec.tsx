import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '../../../../../../src/shared/ui/components/index.js';

const panelTabs = [
  { id: 'all', label: 'All', panel: 'All guests' },
  { id: 'yes', label: 'Attending', panel: 'Attending guests' },
  { id: 'off', label: 'Archived', panel: 'Archived guests', disabled: true },
  { id: 'no', label: 'Declined', panel: 'Declined guests' },
];

// Design system: docs/design-system/components/tabs.html (link tabs; tablist default, hover, selected, disabled).
describe('Tabs, links variant', () => {
  const linkTabs = [
    { href: '#/events/3/overview', label: 'Overview', current: true },
    { href: '#/events/3/guests', label: 'Guests', badge: <span>4</span> },
  ];

  it('is a labelled nav of links with the current one marked aria-current', () => {
    render(<Tabs variant="links" label="Event sections" tabs={linkTabs} />);
    const nav = screen.getByRole('navigation', { name: 'Event sections' });
    expect(nav.className).toBe('tabs');
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Guests4' }).hasAttribute('aria-current')).toBe(false);
    expect(screen.getAllByRole('link').every((link) => link.className === 'tab')).toBe(true);
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('calls onNavigate on a plain click', () => {
    const onNavigate = vi.fn();
    render(<Tabs variant="links" label="Event sections" tabs={linkTabs} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('link', { name: 'Overview' }));
    fireEvent.click(screen.getByRole('link', { name: 'Overview' }), { shiftKey: true });
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith('#/events/3/overview', expect.anything());
  });
});

describe('Tabs, tablist variant', () => {
  it('wires tablist, tabs and panels together', () => {
    render(<Tabs label="Guest filters" tabs={panelTabs} />);
    expect(screen.getByRole('tablist', { name: 'Guest filters' }).className).toBe('tabs');
    const tab = screen.getByRole('tab', { name: 'All' });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(tab.tabIndex).toBe(0);
    expect(screen.getByRole('tab', { name: 'Attending' }).tabIndex).toBe(-1);
    const panel = screen.getByRole('tabpanel', { name: 'All' });
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.textContent).toBe('All guests');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('click selects a tab and shows its panel', () => {
    const onSelect = vi.fn();
    render(<Tabs label="Guest filters" tabs={panelTabs} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Attending' }));
    expect(onSelect).toHaveBeenCalledWith('yes');
    expect(screen.getByRole('tab', { name: 'Attending' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toBe('Attending guests');
  });

  it.each([
    ['ArrowRight', 'all', 'Attending'],
    ['ArrowLeft', 'all', 'Declined'],
    ['ArrowRight', 'yes', 'Declined'],
    ['ArrowRight', 'no', 'All'],
    ['End', 'all', 'Declined'],
    ['Home', 'no', 'All'],
  ])('%s from %s moves focus to and selects %s, skipping disabled tabs', (key, from, to) => {
    render(<Tabs label="Guest filters" tabs={panelTabs} defaultSelectedId={from} />);
    fireEvent.keyDown(screen.getByRole('tab', { selected: true }), { key });
    const target = screen.getByRole('tab', { name: to });
    expect(target.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(target);
  });

  it('disabled tab is not operable', () => {
    render(<Tabs label="Guest filters" tabs={panelTabs} />);
    const tab = screen.getByRole('tab', { name: 'Archived' });
    expect((tab as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(tab);
    expect(tab.getAttribute('aria-selected')).toBe('false');
  });

  it('controlled: follows selectedId', () => {
    function Controlled() {
      const [id, setId] = useState('no');
      return <Tabs label="Guest filters" tabs={panelTabs} selectedId={id} onSelect={setId} />;
    }
    render(<Controlled />);
    expect(screen.getByRole('tabpanel').textContent).toBe('Declined guests');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Declined' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel').textContent).toBe('All guests');
  });
});
