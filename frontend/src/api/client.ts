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

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(joinUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (res.ok) return data as T;

  const payload = data as ApiErrorPayload | undefined;
  const code = payload?.error?.code ?? 'UNKNOWN_ERROR';
  const message = payload?.error?.message ?? `Request failed with status ${res.status}`;
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
