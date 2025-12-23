import { apiBaseUrl } from '../config/env';

export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiRequestError extends Error {
  status: number;
  code: string;
  details?: unknown;
  payload?: ApiErrorPayload;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    payload?: ApiErrorPayload
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.payload = payload;
  }
}

export { apiBaseUrl };

function joinUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${p}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string>),
  };

  // Auto-set Content-Type for JSON bodies
  if (typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const method = (init.method ?? 'GET').toUpperCase();
  const canRetry = method === 'GET';
  const request = () =>
    fetch(joinUrl(path), {
      ...init,
      credentials: 'include',
      headers,
    });

  let res = await request();
  let attempt = 0;
  while (canRetry && res.status === 429 && attempt < 2) {
    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
    const delayMs = Number.isFinite(retryAfterSeconds)
      ? Math.max(0, retryAfterSeconds * 1000)
      : 800 * (attempt + 1);
    await sleep(delayMs);
    attempt += 1;
    res = await request();
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = undefined;
    }
  }

  if (res.ok) {
    return (data ?? (text as unknown)) as T;
  }

  const payload = data as ApiErrorPayload | undefined;
  const code = payload?.error?.code ?? (res.status === 429 ? 'RATE_LIMITED' : 'UNKNOWN_ERROR');
  const message =
    payload?.error?.message ?? (text ? text : `Request failed with status ${res.status}`);
  const details = payload?.error?.details;

  throw new ApiRequestError(res.status, code, message, details, payload);
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiGet<T>(path: string): Promise<T> {
  return apiJson<T>(path, { method: 'GET' });
}

export async function apiPatchJson<T>(path: string, body: unknown): Promise<T> {
  return apiJson<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  return apiJson<T>(path, { method: 'DELETE' });
}
