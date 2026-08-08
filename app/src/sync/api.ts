import { clearToken, getToken } from './token';
import type { AuthResponse, AuthUser, PullResponse, PushResponse, SyncChanges } from './types';
import { AuthError } from './types';

function baseUrl(): string {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  if (!url) throw new Error('VITE_API_URL missing');
  return url.replace(/\/$/, '');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('content-type') && init?.body) {
    headers.set('content-type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    throw new AuthError('unauthorized');
  }
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      message = json.message || json.error || message;
    } catch {
      /* keep raw text */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiRegister(email: string, password: string): Promise<AuthResponse> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiMe(): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>('/auth/me');
  return data.user;
}

export function apiPush(changes: SyncChanges): Promise<PushResponse> {
  return request('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ changes }),
  });
}

export function apiPull(since: string): Promise<PullResponse> {
  return request(`/sync/pull?since=${encodeURIComponent(since)}`);
}
