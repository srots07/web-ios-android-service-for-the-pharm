export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "staff" | "customer";
  account_type: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

let inMemoryToken: string | null = null;

export function getStoredToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("prime_access_token");
  }
  return null;
}

export function setStoredToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      sessionStorage.setItem("prime_access_token", token);
    } else {
      sessionStorage.removeItem("prime_access_token");
    }
  }
}

export async function loginUser(email: string, password: string, rememberMe = false): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, remember_me: rememberMe }),
    credentials: "same-origin",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.error || "Authentication failed.");
  }

  setStoredToken(data.access_token);
  return data;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch("/api/auth/me", {
      headers,
      credentials: "same-origin",
    });

    if (!response.ok) {
      setStoredToken(null);
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers,
      credentials: "same-origin",
    });
  } catch {
    // safe fallback
  } finally {
    setStoredToken(null);
  }
}

