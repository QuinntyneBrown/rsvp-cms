import { Children, createContext, isValidElement, useContext, useId, type HTMLAttributes, type ReactNode } from 'react';
import './Card.css';

export type CardVariant = 'default' | 'interactive' | 'selected' | 'flush';
export type CardElement = 'div' | 'section' | 'article';

const CardTitleId = createContext<string | undefined>(undefined);

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'style' | 'onClick'> {
  variant?: CardVariant;
  /** Element for a static card. A `section`/`article` with a CardHeader is labelled by its title. */
  as?: CardElement;
  /** Selected look; on a pressable card it is announced through aria-pressed. */
  selected?: boolean;
  /** Makes the whole card one button (interactive variant), e.g. a choice in a picker. */
  onClick?: () => void;
  children: ReactNode;
}

/** Groups related content on a surface. Design system: docs/design-system/components/card.html. */
export function Card({ variant = 'default', as: Element = 'div', selected, onClick, children, ...rest }: CardProps) {
  const titleId = useId();
  const isSelected = selected ?? variant === 'selected';
  const classes = ['card'];
  if (variant === 'flush') classes.push('card--flush');
  if (variant === 'interactive' || onClick) classes.push('card--interactive');
  if (isSelected) classes.push('card--selected');
  const hasHeader = Children.toArray(children).some((child) => isValidElement(child) && child.type === CardHeader);

  if (onClick) {
    return (
      <CardTitleId.Provider value={titleId}>
        <button
          {...(rest as HTMLAttributes<HTMLButtonElement>)}
          type="button"
          className={classes.join(' ')}
          aria-pressed={selected === undefined && variant !== 'selected' ? undefined : isSelected}
          onClick={onClick}
        >
          {children}
        </button>
      </CardTitleId.Provider>
    );
  }
  const labelled = Element !== 'div' && hasHeader && rest['aria-label'] === undefined && rest['aria-labelledby'] === undefined;
  return (
    <CardTitleId.Provider value={titleId}>
      <Element {...rest} className={classes.join(' ')} aria-labelledby={labelled ? titleId : rest['aria-labelledby']}>
        {children}
      </Element>
    </CardTitleId.Provider>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** Heading level of the title; use 'none' inside a pressable card (a button cannot hold headings). */
  level?: 2 | 3 | 'none';
  /** Supporting line under the title. */
  subtitle?: ReactNode;
  /** Buttons or links shown at the end of the header. */
  actions?: ReactNode;
}

/** Title row of a card, with optional subtitle and actions. */
export function CardHeader({ title, level = 2, subtitle, actions }: CardHeaderProps) {
  const id = useContext(CardTitleId);
  const Heading = level === 'none' ? 'span' : level === 3 ? 'h3' : 'h2';
  return (
    <div className="card__header">
      <div>
        <Heading className="card__title" id={id}>{title}</Heading>
        {subtitle && <p className="text-caption">{subtitle}</p>}
      </div>
      {actions && <div className="card__actions">{actions}</div>}
    </div>
  );
}

/** Footer row of a card for its actions, separated by a rule and aligned to the end. */
export function CardFooter({ children }: { children: ReactNode }) {
  return <div className="card__footer">{children}</div>;
}
