import './Divider.css';

export interface DividerProps {
  /** Decorative rules are hidden from assistive technology; leave false when it separates topics. */
  decorative?: boolean;
}

/** A horizontal rule between groups of content. Design system: docs/design-system/components/divider.html. */
export function Divider({ decorative }: DividerProps) {
  return <hr className="divider" aria-hidden={decorative || undefined} />;
}
