/**
 * Roles & Permissions API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { RoleDetail, PermissionItem } from "./types";

export const rolesApi = {
  async listRoles(): Promise<RoleDetail[]> {
    return apiClient<RoleDetail[]>(API_CONFIG.ENDPOINTS.ADMIN_ROLES, {
      method: "GET",
    });
  },

  async getRole(id: string): Promise<RoleDetail> {
    return apiClient<RoleDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_ROLES}/${id}`, {
      method: "GET",
    });
  },

  async createRole(payload: { name: string; description: string; permission_ids: string[] }): Promise<RoleDetail> {
    return apiClient<RoleDetail>(API_CONFIG.ENDPOINTS.ADMIN_ROLES, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateRole(
    id: string,
    payload: { name?: string; description?: string; permission_ids?: string[] }
  ): Promise<RoleDetail> {
    return apiClient<RoleDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_ROLES}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async deleteRole(id: string): Promise<void> {
    await apiClient(`${API_CONFIG.ENDPOINTS.ADMIN_ROLES}/${id}`, {
      method: "DELETE",
    });
  },

  async listPermissions(module?: string): Promise<PermissionItem[]> {
    return apiClient<PermissionItem[]>(API_CONFIG.ENDPOINTS.ADMIN_PERMISSIONS, {
      method: "GET",
      params: { module },
    });
  },
};

