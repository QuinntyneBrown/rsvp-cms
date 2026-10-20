import { useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import type { NavigateHandler } from '../index.js';
import './Tabs.css';

export interface LinkTab {
  href: string;
  label: ReactNode;
  /** Marks the tab as the current page (aria-current="page"). */
  current?: boolean;
  badge?: ReactNode;
}

export interface PanelTab {
  id: string;
  label: ReactNode;
  panel: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface LinkTabsProps {
  /** Sub-navigation between pages: a `nav` of links, the current one marked aria-current="page". */
  variant: 'links';
  /** Accessible name of the navigation landmark, e.g. "Event sections". */
  label: string;
  tabs: LinkTab[];
  onNavigate?: NavigateHandler;
}

export interface PanelTabsProps {
  /** WAI-ARIA tablist with panels on one page; arrow keys, Home and End move and select (automatic activation). */
  variant?: 'tablist';
  /** Accessible name of the tablist. */
  label: string;
  tabs: PanelTab[];
  /** Controlled selected tab id. */
  selectedId?: string;
  /** Initially selected tab id when uncontrolled; defaults to the first enabled tab. */
  defaultSelectedId?: string;
  onSelect?: (id: string) => void;
}

export type TabsProps = LinkTabsProps | PanelTabsProps;

/** Switches between sections. Design system: docs/design-system/components/tabs.html. */
export function Tabs(props: TabsProps) {
  return props.variant === 'links' ? <LinkTabs {...props} /> : <PanelTabs {...props} />;
}

function LinkTabs({ label, tabs, onNavigate }: LinkTabsProps) {
  const handleClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    onNavigate(href, event);
  };
  return (
    <nav className="tabs" aria-label={label}>
      {tabs.map((tab) => (
        <a key={tab.href} className="tab" href={tab.href} aria-current={tab.current ? 'page' : undefined} onClick={handleClick(tab.href)}>
          {tab.label}
          {tab.badge && <span className="tab__badge">{tab.badge}</span>}
        </a>
      ))}
    </nav>
  );
}

function PanelTabs({ label, tabs, selectedId, defaultSelectedId, onSelect }: PanelTabsProps) {
  const baseId = useId();
  const enabled = tabs.filter((tab) => !tab.disabled);
  const [internal, setInternal] = useState(defaultSelectedId ?? enabled[0]?.id);
  const selected = selectedId ?? internal;
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const select = (id: string) => {
    if (selectedId === undefined) setInternal(id);
    onSelect?.(id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = enabled.findIndex((tab) => tab.id === selected);
    let next: PanelTab | undefined;
    if (event.key === 'ArrowRight') next = enabled[(index + 1) % enabled.length];
    else if (event.key === 'ArrowLeft') next = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (event.key === 'Home') next = enabled[0];
    else if (event.key === 'End') next = enabled[enabled.length - 1];
    if (!next) return;
    event.preventDefault();
    select(next.id);
    refs.current.get(next.id)?.focus();
  };

  return (
    <div>
      <div className="tabs" role="tablist" aria-label={label}>
        {tabs.map((tab) => {
          const isSelected = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) refs.current.set(tab.id, node);
                else refs.current.delete(tab.id);
              }}
              type="button"
              className="tab"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => select(tab.id)}
              onKeyDown={handleKeyDown}
            >
              {tab.label}
              {tab.badge && <span className="tab__badge">{tab.badge}</span>}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="tabs__panel"
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          tabIndex={0}
          hidden={tab.id !== selected}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
