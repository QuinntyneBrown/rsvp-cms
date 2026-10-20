import type { SVGAttributes } from 'react';
import './Icon.css';

/**
 * 24px stroke icon paths. Most are harvested from the inline `svg.icon` glyphs in docs/mocks; the rest
 * (chevron-left/right, settings, more, link, upload, danger) are drawn in the same 2px stroke style.
 */
const paths = {
  menu: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  check: 'M4 12l6 6L20 6',
  info: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 11v6M12 7.5h.01',
  warning: 'M12 3 2 21h20zM12 10v5M12 18h.01',
  danger: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v6M12 16.5h.01',
  success: 'M4 12l6 6L20 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 10l6 6 6-6',
  'chevron-up': 'M6 14l6-6 6 6',
  calendar: 'M4 6h16v14H4zM4 10h16M9 4v4M15 4v4',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2',
  home: 'M3 12 12 3l9 9M5 10v10h14V10',
  user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  send: 'M3 11l18-8-8 18-2-8z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  settings:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  upload: 'M12 16V4m0 0-4 4m4-4 4 4M4 17v3h16v-3',
  import: 'M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3',
  download: 'M12 4v12m0 0-4-4m4 4 4-4M4 20h16',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  gift: 'M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1c2 0 6 2 6-1s-4-3-6 1z',
  refresh: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  'sign-out': 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5',
  layout: 'M3 4h18v16H3zM3 10h18M9 10v10',
  'wifi-off': 'M2 2l20 20M5 12a10 10 0 0 1 4-2.5M19 12a10 10 0 0 0-3-2M8.5 16a5 5 0 0 1 7 0M12 20h.01',
} as const;

export type IconName = keyof typeof paths;
export type IconSize = 'sm' | 'md' | 'lg';

/** Every icon name, in declaration order (for docs and tests). */
export const iconNames = Object.keys(paths) as IconName[];

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'className' | 'style' | 'children'> {
  name: IconName;
  size?: IconSize;
  /** Gives a meaningful icon role="img" and this accessible name; without it the icon is decorative (aria-hidden). */
  label?: string;
}

/** A 24px stroke glyph. Design system: docs/design-system/components/icon.html. */
export function Icon({ name, size = 'md', label, ...rest }: IconProps) {
  const className = size === 'md' ? 'icon' : `icon icon--${size}`;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <svg {...rest} {...a11y} className={className} viewBox="0 0 24 24" focusable="false" data-icon={name}>
      <path d={paths[name]} />
    </svg>
  );
}
