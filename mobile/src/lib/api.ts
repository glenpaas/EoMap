import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SERVER_URL } from './config';
import type { LocalPhoto, Store, User, VisitDetail, VisitRow } from './types';

const KEY_URL = 'kylastusgraafik.serverUrl';
const KEY_TOKEN = 'kylastusgraafik.token';

let serverUrl = '';
let token = '';

export function getServerUrl() {
  return serverUrl;
}
export function getToken() {
  return token;
}

/** Trim a user-typed address into something fetch() will accept. */
export function normalizeUrl(raw: string) {
  let u = raw.trim().replace(/\/+$/, '');
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

export async function loadSession() {
  const [url, tok] = await Promise.all([
    AsyncStorage.getItem(KEY_URL),
    AsyncStorage.getItem(KEY_TOKEN),
  ]);
  // A device-specific address overrides the build's default; otherwise the app
  // is ready to talk to the server without anyone typing an address.
  serverUrl = normalizeUrl(url || DEFAULT_SERVER_URL);
  token = tok || '';
  return { serverUrl, token };
}

export async function setServerUrl(url: string) {
  serverUrl = normalizeUrl(url);
  await AsyncStorage.setItem(KEY_URL, serverUrl);
}

export async function setToken(t: string) {
  token = t;
  if (t) await AsyncStorage.setItem(KEY_TOKEN, t);
  else await AsyncStorage.removeItem(KEY_TOKEN);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Opts = { method?: string; body?: unknown; timeoutMs?: number; auth?: boolean };

async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  if (!serverUrl) throw new ApiError('Serveri aadress on määramata', 0);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  const headers: Record<string, string> = {};
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${serverUrl}/api${path}`, {
      method: opts.method || 'GET',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err: any) {
    throw new ApiError(
      err?.name === 'AbortError' ? 'Server ei vastanud' : 'Ühendus serveriga ebaõnnestus',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}) as any);
  if (!res.ok) throw new ApiError(data.error || `Viga ${res.status}`, res.status);
  return data as T;
}

// ── auth ────────────────────────────────────────────────────────────────────
export function login(username: string, password: string) {
  return request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
}

export function me() {
  return request<{ user: User }>('/auth/me');
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ ok: true }>('/auth/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

// ── data ────────────────────────────────────────────────────────────────────
export function fetchStores() {
  return request<{ stores: Store[] }>('/stores');
}

export function fetchVisits(page = 1) {
  return request<{ visits: VisitRow[]; total: number; pages: number }>(
    `/visits?page=${page}&limit=25`
  );
}

export function fetchVisit(id: string) {
  return request<{ visit: VisitDetail }>(`/visits/${id}`);
}

/** Push the whole visit. Safe to retry — the server replaces child rows by visit id. */
export function syncVisit(payload: Record<string, unknown>) {
  return request<{ visit: VisitDetail }>(`/visits/${payload.id}`, {
    method: 'PUT',
    body: payload,
    timeoutMs: 30000,
  });
}

export async function uploadPhoto(visitId: string, photo: LocalPhoto, thumbUri?: string) {
  const form = new FormData();
  const name = `${photo.id}.jpg`;
  form.append('photo', { uri: photo.uri, name, type: 'image/jpeg' } as any);
  if (thumbUri) {
    form.append('thumb', { uri: thumbUri, name: `t_${name}`, type: 'image/jpeg' } as any);
  }
  form.append('visitId', visitId);
  form.append('kind', photo.kind);
  form.append('takenAt', photo.takenAt);

  return request<{ photo: { id: string } }>('/photos', {
    method: 'POST',
    body: form,
    timeoutMs: 60000,
  });
}

/** Cheap reachability probe used by the settings screen. */
export async function ping(url: string) {
  const target = normalizeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${target}/api/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Photos need the token in the query string — <Image> cannot send headers. */
export function photoUrl(pathOrUrl: string) {
  const sep = pathOrUrl.includes('?') ? '&' : '?';
  return `${serverUrl}${pathOrUrl}${sep}token=${encodeURIComponent(token)}`;
}
