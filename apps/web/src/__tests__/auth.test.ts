import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "@/lib/store/authStore";
import { authApi } from "@/lib/api/auth";

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("Authentication Store (useAuthStore)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    sessionStorage.clear();
  });

  it("initializes with unauthenticated state when no session exists", async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(new Error("Unauthorized"));

    await useAuthStore.getState().init();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("initializes with authenticated user when valid session exists", async () => {
    const mockUser = {
      id: "u-123",
      email: "pharmacist@primebyactivist.com",
      full_name: "Dr. Khasim Pharmacist",
      role: "admin" as const,
      account_type: "Platform Administrator",
      is_active: true,
      is_verified: true,
      created_at: "2026-11-01T00:00:00Z",
    };
    vi.mocked(authApi.me).mockResolvedValueOnce(mockUser);

    await useAuthStore.getState().init();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("pharmacist@primebyactivist.com");
    expect(state.isLoading).toBe(false);
  });

  it("handles successful login and updates reactive state", async () => {
    const mockUser = {
      id: "u-456",
      email: "partner@hospital.org",
      full_name: "Procurement Officer",
      role: "customer" as const,
      account_type: "Institutional Buyer",
      is_active: true,
      is_verified: true,
      created_at: "2026-11-01T00:00:00Z",
    };
    vi.mocked(authApi.login).mockResolvedValueOnce({
      access_token: "jwt-token-xyz",
      token_type: "bearer",
      expires_in: 3600,
      user: mockUser,
    });

    const result = await useAuthStore.getState().login({
      email: "partner@hospital.org",
      password: "SecurePassword123!",
    });

    expect(result.id).toBe("u-456");
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.role).toBe("customer");
    expect(state.error).toBeNull();
  });

  it("handles failed login and sets error message", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error("Invalid credentials"));

    await expect(
      useAuthStore.getState().login({
        email: "unknown@domain.com",
        password: "wrong",
      })
    ).rejects.toThrow("Invalid credentials");

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe("Invalid credentials");
  });

  it("clears authentication state on logout", async () => {
    useAuthStore.setState({
      user: {
        id: "u-123",
        email: "admin@prime.com",
        full_name: "Admin",
        role: "admin" as const,
        account_type: "Admin",
        is_active: true,
        is_verified: true,
        created_at: "2026-11-01T00:00:00Z",
      },
      isAuthenticated: true,
    });

    vi.mocked(authApi.logout).mockResolvedValueOnce();

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("correctly evaluates hasRole helper", () => {
    useAuthStore.setState({
      user: {
        id: "u-admin",
        email: "admin@prime.com",
        full_name: "Admin",
        role: "admin" as const,
        account_type: "Platform Admin",
        is_active: true,
        is_verified: true,
        created_at: "2026-11-01T00:00:00Z",
      },
      isAuthenticated: true,
    });

    expect(useAuthStore.getState().hasRole("admin")).toBe(true);
    expect(useAuthStore.getState().hasRole("customer")).toBe(false);
  });
});
