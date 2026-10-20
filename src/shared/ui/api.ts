export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string> = {},
    public firstInvalid?: string,
    /** The whole JSON body of the failed response, for fields beyond the message and errors. */
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

let onUnauthorized: ((message: string) => void) | null = null;

/**
 * The organiser app registers this so that any 401 mid-session sends the organiser back to
 * Sign in with the server's message (L2-005 AC1). The guest app never registers it.
 */
export function setUnauthorizedHandler(handler: ((message: string) => void) | null) {
  onUnauthorized = handler;
}

export async function api<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Something went wrong. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string>; firstInvalid?: string };
  if (!res.ok) {
    const error = new ApiError(res.status, data.error ?? 'Something went wrong. Try again.', data.errors, data.firstInvalid, data);
    if (res.status === 401 && onUnauthorized && !url.startsWith('/api/auth/sign-in')) onUnauthorized(error.message);
    throw error;
  }
  return data as T;
}

export const get = <T>(url: string) => api<T>('GET', url);
export const post = <T>(url: string, body?: unknown) => api<T>('POST', url, body ?? {});
export const put = <T>(url: string, body: unknown) => api<T>('PUT', url, body);
