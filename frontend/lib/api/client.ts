import { config } from "@/lib/config";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/storage";
import { ApiError } from "@/lib/api/errors";
import type { ApiErrorBody, LoginResponse } from "@/lib/api/types";

// Single in-flight refresh promise to prevent parallel refresh races.
let _refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("no_refresh_token");
    const res = await fetch(buildUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      throw new Error("refresh_failed");
    }
    const data: LoginResponse = await res.json();
    setTokens({ access: data.accessToken, refresh: data.refreshToken });
    return data.accessToken;
  })().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

// ── snake_case → camelCase converter ─────────────────────────────────────────
// Backend (FastAPI/Pydantic) returns snake_case field names.
// All TypeScript interfaces use camelCase. This converter runs on every
// response so the rest of the codebase never sees snake_case keys.

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map(camelize) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        snakeToCamel(k),
        camelize(v),
      ])
    ) as T;
  }
  return value as T;
}

// ── Request body: camelCase → snake_case ──────────────────────────────────────
// Backend Pydantic models use snake_case for request body fields.
// We convert outgoing JSON bodies automatically so callers keep using camelCase.

function camelToSnake(key: string): string {
  return key.replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeize<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map(snakeize) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        camelToSnake(k),
        snakeize(v),
      ])
    ) as T;
  }
  return value as T;
}

// ─────────────────────────────────────────────────────────────────────────────

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const resolved = path.startsWith("http") ? path : `${config.apiUrl}${path}`;
  const base = resolved.startsWith("/") && typeof window !== "undefined"
    ? window.location.origin
    : undefined;
  const url = base ? new URL(resolved, base) : new URL(resolved);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(camelToSnake(k), String(v));
    }
  }
  return url.toString();
}

async function doFetch(url: string, token: string | null, options: RequestOptions): Promise<Response> {
  const { body, headers, ...rest } = options;
  return fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(snakeize(body)) : undefined,
    credentials: "include",
  });
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, ...rest } = options;
  const url = buildUrl(path, query);
  const isRefreshEndpoint = path.includes("/api/auth/refresh");

  let res = await doFetch(url, getAccessToken(), rest);

  // On 401, attempt one token refresh and retry (skip for the refresh endpoint itself).
  if (res.status === 401 && !isRefreshEndpoint) {
    try {
      const newToken = await refreshAccessToken();
      res = await doFetch(url, newToken, rest);
    } catch {
      clearTokens();
      throw new ApiError("token_expired", "Session expired", 401);
    }
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      payload?.error?.code ?? "unknown_error",
      payload?.error?.message ?? res.statusText,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;

  // Convert snake_case response keys → camelCase for all TypeScript consumers
  const raw = await res.json();
  return camelize<T>(raw);
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};

// ── Admin API client (no key transformation) ──────────────────────────────────
// Keys are sent and received as-is (snake_case from the backend stays snake_case).

export async function adminApiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, query, ...rest } = options;
  const token = getAccessToken();

  const adminResolved = path.startsWith("http") ? path : `${config.apiUrl}${path}`;
  const adminBase = adminResolved.startsWith("/") && typeof window !== "undefined"
    ? window.location.origin
    : undefined;
  const url = adminBase ? new URL(adminResolved, adminBase) : new URL(adminResolved);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      payload?.error?.code ?? "unknown_error",
      payload?.error?.message ?? res.statusText,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const adminApi = {
  get: <T>(path: string, opts?: RequestOptions) =>
    adminApiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    adminApiFetch<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    adminApiFetch<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    adminApiFetch<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    adminApiFetch<T>(path, { ...opts, method: "DELETE" }),
};
