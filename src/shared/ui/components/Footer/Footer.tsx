import type { ReactNode } from 'react';
import './Footer.css';

export interface FooterProps {
  /** Footer content; direct children are spread between the edges and wrap on narrow screens. */
  children: ReactNode;
}

/** Page footer (contentinfo landmark when it is not inside main). Design system: docs/design-system/components/footer.html. */
export function Footer({ children }: FooterProps) {
  return <footer className="footer">{children}</footer>;
}
