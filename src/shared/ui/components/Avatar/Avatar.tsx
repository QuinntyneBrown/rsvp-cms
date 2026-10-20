import type { ReactNode } from 'react';
import './Avatar.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** The person's name: gives the initials and the accessible name. */
  name: string;
  /** Photo URL; initials are shown when absent. */
  src?: string;
  size?: AvatarSize;
  /** Hide from assistive technology when the name is already shown next to the avatar. */
  decorative?: boolean;
  /** Makes the avatar a button (e.g. "Account menu for Priya Natarajan"); `label` names it. */
  onClick?: () => void;
  /** Accessible name of the button; defaults to `name`. */
  label?: string;
}

/** Up to two initials from a name: "Priya Natarajan" → "PN", "Cher" → "C". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** A person's photo or initials in a circle. Design system: docs/design-system/components/avatar.html. */
export function Avatar({ name, src, size = 'md', decorative, onClick, label }: AvatarProps) {
  const className = size === 'md' ? 'avatar' : `avatar avatar--${size}`;
  const face: ReactNode = src ? <img src={src} alt="" /> : <span aria-hidden="true">{initialsOf(name)}</span>;
  if (onClick) {
    return (
      <button className={className} type="button" aria-label={label ?? name} onClick={onClick}>
        {face}
      </button>
    );
  }
  if (decorative) {
    return (
      <span className={className} aria-hidden="true">
        {face}
      </span>
    );
  }
  return (
    <span className={className} role="img" aria-label={name}>
      {face}
    </span>
  );
}
