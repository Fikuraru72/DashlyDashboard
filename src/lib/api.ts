import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ACCESS_COOKIE = "auth_token";
export const AUTH_TOKENS_CHANGED_EVENT = "dashly:auth-tokens-changed";

interface AuthTokens {
  accessToken: string;
}

let refreshPromise: Promise<string | null> | null = null;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getAccessToken() {
  return getCookie(ACCESS_COOKIE);
}

export function setAccessToken({ accessToken }: AuthTokens) {
  setCookie(ACCESS_COOKIE, accessToken, 30 * 24 * 60 * 60);
  window.dispatchEvent(new Event(AUTH_TOKENS_CHANGED_EVENT));
}

export function clearAuthTokens() {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  if (process.env.NODE_ENV !== "test") void fetch("/api/auth/logout", { method: "POST" });
  window.dispatchEvent(new Event(AUTH_TOKENS_CHANGED_EVENT));
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" });
    if (!response.ok) {
      clearAuthTokens();
      return null;
    }

    const tokens = (await response.json()) as AuthTokens;
    setAccessToken(tokens);
    return tokens.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function parseError(response: Response) {
  try {
    return (await response.json()) as { message?: string };
  } catch {
    return null;
  }
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  canRetry = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && canRetry && typeof window !== "undefined") {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set("Authorization", `Bearer ${refreshedToken}`);
      return authenticatedFetch(input, { ...init, headers }, false);
    }
  }
  return response;
}

/** Browser API boundary: injects access JWT, refreshes once on 401, then parses JSON. */
export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  try {
    const response = await authenticatedFetch(input, init);
    if (!response.ok) {
      const errorData = await parseError(response);
      if (response.status === 504)
        toast.error("Koneksi ke server terlalu lama. Periksa koneksi internet Anda.");
      else if (response.status >= 500)
        toast.error("Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.");
      else if (errorData?.message) toast.error(errorData.message);
      else toast.error(`Terjadi kesalahan (${response.status})`);
      throw new Error(errorData?.message || response.statusText);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      toast.error("Koneksi internet Anda terputus atau server tidak dapat dijangkau.");
    }
    throw error;
  }
}

export { API_URL };
