export type FieldErrors = Record<string, string>;

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

export const fail = <T>(errors: FieldErrors): Validated<T> => ({ ok: false, errors });
export const pass = <T>(value: T): Validated<T> => ({ ok: true, value });

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
