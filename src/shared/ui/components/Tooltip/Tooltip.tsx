import { cloneElement, useEffect, useId, useState, type ReactElement } from 'react';
import './Tooltip.css';

export interface TooltipProps {
  /** Short supplementary text. Never put the only name of a control here: give the trigger its own name. */
  content: string;
  /** The single focusable trigger (e.g. an icon-only Button); it receives aria-describedby. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
}

/**
 * Supplementary text shown above a control on hover and keyboard focus; Escape hides it.
 * Design system: docs/design-system/components/tooltip.html.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const describedBy = [children.props['aria-describedby'], id].filter(Boolean).join(' ');
  return (
    <span
      className="has-tooltip"
      onMouseEnter={() => { setDismissed(false); setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => { setDismissed(false); setFocused(true); }}
      onBlur={() => setFocused(false)}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      <span className="tooltip" role="tooltip" id={id} hidden={!open}>
        {content}
      </span>
    </span>
  );
}
