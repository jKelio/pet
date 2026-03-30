import type { ApiError } from '@pet/shared';

const BASE_URL = '/api';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init?.headers ?? {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      statusCode: response.status,
    }));
    throw new ApiClientError(error.code, error.message, error.statusCode);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, accessToken?: string) =>
    request<T>(path, { method: 'GET' }, accessToken),

  post: <T>(path: string, body: unknown, accessToken?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, accessToken),

  delete: <T>(path: string, accessToken?: string) =>
    request<T>(path, { method: 'DELETE' }, accessToken),
};
