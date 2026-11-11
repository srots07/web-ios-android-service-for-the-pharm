/**
 * Users API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { AuthUser, PaginatedResponse } from "./types";

export const usersApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    account_type?: string;
    status?: string;
  }): Promise<PaginatedResponse<AuthUser>> {
    return apiClient<PaginatedResponse<AuthUser>>(API_CONFIG.ENDPOINTS.ADMIN_USERS, {
      method: "GET",
      params,
    });
  },

  async get(id: string): Promise<AuthUser & { active_sessions_count: number }> {
    return apiClient<AuthUser & { active_sessions_count: number }>(
      `${API_CONFIG.ENDPOINTS.ADMIN_USERS}/${id}`,
      {
        method: "GET",
      }
    );
  },

  async update(id: string, payload: Partial<AuthUser> & { role_ids?: string[] }): Promise<AuthUser> {
    return apiClient<AuthUser>(`${API_CONFIG.ENDPOINTS.ADMIN_USERS}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async suspend(id: string): Promise<{ id: string; email: string; is_active: boolean; message: string }> {
    return apiClient<{ id: string; email: string; is_active: boolean; message: string }>(
      `${API_CONFIG.ENDPOINTS.ADMIN_USERS}/${id}/suspend`,
      {
        method: "POST",
      }
    );
  },

  async activate(id: string): Promise<{ id: string; email: string; is_active: boolean; message: string }> {
    return apiClient<{ id: string; email: string; is_active: boolean; message: string }>(
      `${API_CONFIG.ENDPOINTS.ADMIN_USERS}/${id}/activate`,
      {
        method: "POST",
      }
    );
  },

  async revokeSessions(id: string): Promise<{ status: string; message: string }> {
    return apiClient<{ status: string; message: string }>(
      `${API_CONFIG.ENDPOINTS.ADMIN_USERS}/${id}/revoke-sessions`,
      {
        method: "POST",
      }
    );
  },
};

