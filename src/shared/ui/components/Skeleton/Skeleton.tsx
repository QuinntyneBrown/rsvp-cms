import type { ReactNode } from 'react';
import { VisuallyHidden } from '../../primitives/index.js';
import './Skeleton.css';

export type SkeletonVariant = 'text' | 'title' | 'circle' | 'rect';

export interface SkeletonItemProps {
  variant?: SkeletonVariant;
}

/** One placeholder shape; always hidden from assistive technology. Use inside <Skeleton> to build a layout. */
export function SkeletonItem({ variant = 'text' }: SkeletonItemProps) {
  return <div className={`skeleton skeleton--${variant}`} aria-hidden="true" />;
}

export interface SkeletonProps {
  /** Number of placeholder pieces when no children are given. */
  rows?: number;
  /** Shape of each generated piece. */
  variant?: SkeletonVariant;
  /** What is loading, announced to screen readers, e.g. "Loading the invitation page". */
  label?: string;
  /** Custom layout of <SkeletonItem>s; replaces the generated rows. */
  children?: ReactNode;
}

/**
 * Loading placeholder that mirrors the shape of the content to come. The container is aria-busy and carries
 * a hidden label; the pieces are aria-hidden. Design system: docs/design-system/components/skeleton.html.
 */
export function Skeleton({ rows = 3, variant = 'text', label = 'Loading', children }: SkeletonProps) {
  return (
    <div className="skeleton-group" aria-busy="true">
      <VisuallyHidden as="p">{label}</VisuallyHidden>
      {children ?? Array.from({ length: rows }, (_, i) => <SkeletonItem key={i} variant={variant} />)}
    </div>
  );
}
