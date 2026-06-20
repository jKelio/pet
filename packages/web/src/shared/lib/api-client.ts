import type { ApiError } from '@pet/shared';
import { whenServerReady } from './server-ready.js';

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

// Lazy import to avoid circular dependency: auth store → api-client → auth store
function getAuthStore() {
  return import('../../features/auth/stores/auth.store.js').then((m) => m.useAuthStore);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const { accessToken } = await res.json() as { accessToken: string };
      const useAuthStore = await getAuthStore();
      const store = useAuthStore.getState();
      // Update token in store, preserve user/tenantId
      if (store.user) {
        store.setAuth(accessToken, store.user, store.tenantId ?? undefined);
      }
      return accessToken;
    })
    .catch(() => null)
    .finally(() => { refreshPromise = null; });

  return refreshPromise;
}

async function request<T>(path: string, init?: RequestInit, accessToken?: string): Promise<T> {
  // Queue until the backend has woken up (Render.com cold start).
  await whenServerReady();

  const hasBody = init?.body != null;
  const headers: HeadersInit = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init?.headers ?? {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && accessToken) {
    // Attempt silent token refresh and retry once
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders: HeadersInit = {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${newToken}`,
        ...(init?.headers ?? {}),
      };
      const retry = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: retryHeaders,
        credentials: 'include',
      });
      if (retry.ok) {
        if (retry.status === 204) return undefined as T;
        return retry.json() as Promise<T>;
      }
      // Refresh succeeded but retry still failed — clear auth
      const useAuthStore = await getAuthStore();
      useAuthStore.getState().clearAuth();
    } else {
      // Refresh failed — clear auth to force re-login
      const useAuthStore = await getAuthStore();
      useAuthStore.getState().clearAuth();
    }
  }

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

  patch: <T>(path: string, body: unknown, accessToken?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, accessToken),

  /** POST returning a binary Blob (e.g. a PDF). Throws ApiClientError on non-2xx. */
  async postBlob(path: string, body: unknown, accessToken?: string): Promise<Blob> {
    await whenServerReady();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        statusCode: res.status,
      }));
      throw new ApiClientError(error.code, error.message, error.statusCode);
    }
    return res.blob();
  },

  delete: <T>(path: string, accessToken?: string) =>
    request<T>(path, { method: 'DELETE' }, accessToken),

  /**
   * Opens a fetch-based SSE stream (so JWT can be sent as a header).
   * The caller receives an AsyncIterable of parsed SSE event objects: { event, data }.
   */
  async *sse(path: string, body: unknown, accessToken?: string): AsyncIterable<{ event: string; data: unknown }> {
    // Queue until the backend has woken up (Render.com cold start).
    await whenServerReady();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    });

    if (!res.ok || !res.body) {
      const error: ApiError = await res.json().catch(() => ({
        code: 'STREAM_ERROR',
        message: 'Failed to open SSE stream',
        statusCode: res.status,
      }));
      throw new ApiClientError(error.code, error.message, error.statusCode);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split('\n\n');
        buffer = messages.pop() ?? '';

        for (const message of messages) {
          const lines = message.split('\n');
          let event = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }
          if (dataStr) {
            try {
              yield { event, data: JSON.parse(dataStr) };
            } catch {
              // skip malformed
            }
          }
        }
      }
    } finally {
      reader.cancel();
    }
  },
};
