import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  apiClient,
  getAccessToken,
  setAccessToken,
  refreshAccessToken,
} from "@/lib/api/client";
import { API_CONFIG } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";

describe("Typed API Client & In-Memory Token Security (client.ts)", () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setAccessToken(null);
  });

  it("manages tokens strictly in memory without writing to sessionStorage or localStorage", () => {
    setAccessToken("test-jwt-access-token-12345");
    expect(getAccessToken()).toBe("test-jwt-access-token-12345");

    // Verify sessionStorage has NOT been touched
    expect(sessionStorage.getItem("prime_access_token")).toBeNull();
    // Verify localStorage has NOT been touched
    expect(localStorage.getItem("prime_access_token")).toBeNull();

    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it("injects Bearer token into Authorization header when present", async () => {
    setAccessToken("jwt-bearer-xyz");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiClient<{ success: boolean }>("/test-endpoint");
    expect(res.success).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer jwt-bearer-xyz");
  });

  it("handles 401 Unauthorized by executing refresh token rotation and retrying request", async () => {
    setAccessToken("expired-access-token");

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes(API_CONFIG.ENDPOINTS.REFRESH)) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ access_token: "new-rotated-jwt-token" }),
        };
      }

      if (callCount === 1) {
        // Initial request fails with 401
        return {
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ detail: "Token expired" }),
        };
      }

      // Retry request succeeds with new token
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "protected-pharma-records" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiClient<{ data: string }>("/protected-data");
    expect(result.data).toBe("protected-pharma-records");
    expect(getAccessToken()).toBe("new-rotated-jwt-token");
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1. Initial (401), 2. Refresh, 3. Retry (200)
  });

  it("safely handles concurrent requests during token refresh by queuing subscribers", async () => {
    setAccessToken("expired-token");

    let refreshCalled = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(API_CONFIG.ENDPOINTS.REFRESH)) {
        refreshCalled++;
        // Small delay to simulate network latency for concurrent queue test
        await new Promise((r) => setTimeout(r, 20));
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ access_token: "concurrently-refreshed-token" }),
        };
      }

      // If called with old token, return 401
      const authHeader = (fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1]?.headers as Headers)?.get("Authorization");
      if (authHeader === "Bearer expired-token") {
        return {
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ detail: "Token expired" }),
        };
      }

      // Return 200 for retries
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, url }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    // Dispatch 3 concurrent requests simultaneously
    const [res1, res2, res3] = await Promise.all([
      apiClient<{ success: boolean; url: string }>("/endpoint-1"),
      apiClient<{ success: boolean; url: string }>("/endpoint-2"),
      apiClient<{ success: boolean; url: string }>("/endpoint-3"),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res3.success).toBe(true);
    // Crucially: refresh must only be called ONCE despite 3 simultaneous requests
    expect(refreshCalled).toBe(1);
    expect(getAccessToken()).toBe("concurrently-refreshed-token");
  });

  it("clears access token and rejects with ApiError when refresh token is revoked or expired", async () => {
    setAccessToken("expired-token");

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(API_CONFIG.ENDPOINTS.REFRESH)) {
        // Refresh session is invalid or revoked
        return {
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ detail: "Refresh token revoked or expired" }),
        };
      }

      return {
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ detail: "Unauthorized access" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient("/some-guarded-route")).rejects.toThrow(ApiError);
    // In-memory token must be cleared to force user back to unauthenticated login
    expect(getAccessToken()).toBeNull();
  });
});
