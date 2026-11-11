/**
 * Centralized Reusable Typed HTTP Client
 * PRIME by Activist Enterprise Platform
 */

import { API_CONFIG } from "./config";
import { ApiError } from "./errors";

let inMemoryAccessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("prime_access_token");
  }
  return null;
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      sessionStorage.setItem("prime_access_token", token);
    } else {
      sessionStorage.removeItem("prime_access_token");
    }
  }
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      setAccessToken(null);
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      setAccessToken(data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    setAccessToken(null);
    return null;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
  timeoutMs?: number;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth, timeoutMs = API_CONFIG.TIMEOUT_MS, ...customConfig } = options;

  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers = new Headers(customConfig.headers || {});

  // Do not set Content-Type if uploading FormData (browser must set multipart boundary)
  if (!(customConfig.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const config: RequestInit = {
    ...customConfig,
    headers,
    credentials: customConfig.credentials || "same-origin",
    signal: customConfig.signal || AbortSignal.timeout(timeoutMs),
  };

  try {
    let response = await fetch(url, config);

    // Handle 401 Unauthorized with token rotation & retry
    if (response.status === 401 && !skipAuth && endpoint !== API_CONFIG.ENDPOINTS.LOGIN && endpoint !== API_CONFIG.ENDPOINTS.REFRESH) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);

        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`);
          response = await fetch(url, { ...config, headers });
        }
      } else {
        // Queue pending requests while refresh completes
        const retryToken = await new Promise<string | null>((resolve) => {
          refreshSubscribers.push(resolve);
        });
        if (retryToken) {
          headers.set("Authorization", `Bearer ${retryToken}`);
          response = await fetch(url, { ...config, headers });
        }
      }
    }

    // Parse response
    let responseData: any = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responseData = await response.json().catch(() => null);
    } else if (contentType.includes("text/")) {
      responseData = await response.text().catch(() => "");
    }

    if (!response.ok) {
      const message =
        responseData?.detail ||
        responseData?.error ||
        responseData?.message ||
        `HTTP Request Failed with status ${response.status}`;
      throw new ApiError(message, response.status, responseData);
    }

    return responseData as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === "TimeoutError") {
      throw new ApiError("The request timed out. Please check your network connection.", 408);
    }
    throw new ApiError(error.message || "Network request failed.", 500, error);
  }
}

