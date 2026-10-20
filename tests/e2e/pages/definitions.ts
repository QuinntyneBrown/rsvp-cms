import type { Locator } from '@playwright/test';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The <dd> that follows the <dt> whose whole text is `term`, inside a DescriptionList. */
export function definition(list: Locator, term: string): Locator {
  return list.locator('dt').filter({ hasText: new RegExp(`^${escape(term)}$`) }).locator('xpath=following-sibling::dd[1]');
}

/** A form- or page-level failure: the alert that carries a Try again button (field errors never do). */
export function failure(root: Locator): Locator {
  return root.getByRole('alert').filter({ has: root.page().getByRole('button', { name: 'Try again' }) });
}
