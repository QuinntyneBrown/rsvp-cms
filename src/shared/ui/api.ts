export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string> = {},
    public firstInvalid?: string,
  ) {
    super(message);
  }
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
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong. Try again.', data.errors, data.firstInvalid);
  return data as T;
}

export const get = <T>(url: string) => api<T>('GET', url);
export const post = <T>(url: string, body?: unknown) => api<T>('POST', url, body ?? {});
export const put = <T>(url: string, body: unknown) => api<T>('PUT', url, body);
