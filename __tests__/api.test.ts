import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import {
  AUTH_TOKENS_CHANGED_EVENT,
  authenticatedFetch,
  clearAuthTokens,
  getAccessToken,
  setAccessToken,
} from "@/lib/api";

function response(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authenticated API boundary", () => {
  beforeEach(() => {
    document.cookie = "refresh_token=; path=/; max-age=0";
    clearAuthTokens();
    vi.restoreAllMocks();
  });

  it("stores only the browser-readable access token", () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_TOKENS_CHANGED_EVENT, listener);

    setAccessToken({ accessToken: "access-1" });

    expect(getAccessToken()).toBe("access-1");
    expect(document.cookie).not.toContain("refresh_token=");
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_TOKENS_CHANGED_EVENT, listener);
  });

  it("refreshes through the same-origin httpOnly session route and retries", async () => {
    setAccessToken({ accessToken: "expired" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200, { accessToken: "access-2" }))
      .mockResolvedValueOnce(response(200, { ok: true }));

    const result = await authenticatedFetch("https://api.test/events");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]).toEqual(["/api/auth/refresh", { method: "POST" }]);
    const retryHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe("Bearer access-2");
    expect(getAccessToken()).toBe("access-2");
  });

  it("clears the access token when refresh is rejected", async () => {
    setAccessToken({ accessToken: "expired" });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(401));

    const result = await authenticatedFetch("https://api.test/events");

    expect(result.status).toBe(401);
    expect(getAccessToken()).toBeNull();
  });
});
