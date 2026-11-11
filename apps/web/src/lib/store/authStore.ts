/**
 * Centralized Reactive Authentication Store (Zustand)
 * PRIME by Activist Enterprise Platform
 */

import { create } from "zustand";
import { authApi } from "@/lib/api/auth";
import { AuthUser, LoginRequest } from "@/lib/api/types";
import { setAccessToken } from "@/lib/api/client";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permissionSlug: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(credentials);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
      return res.user;
    } catch (err: any) {
      set({ error: err.message || "Authentication failed.", isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  setUser: (user: AuthUser | null) => {
    set({ user, isAuthenticated: !!user });
  },

  hasRole: (roleName: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === roleName) return true;
    if (user.roles?.some((r) => r.slug === roleName || r.name.toLowerCase() === roleName.toLowerCase())) {
      return true;
    }
    return false;
  },

  hasPermission: (permissionSlug: string) => {
    const { user } = get();
    if (!user) return false;
    // Super Administrator / global admin has unconstrained access
    if (user.role === "admin") return true;

    // Check assigned roles permissions
    if (user.roles) {
      for (const role of user.roles as any[]) {
        if (role.slug === "super_admin") return true;
        if (role.permissions?.some((p: any) => p.slug === permissionSlug || p.slug === "*.*")) {
          return true;
        }
      }
    }
    return false;
  },
}));

