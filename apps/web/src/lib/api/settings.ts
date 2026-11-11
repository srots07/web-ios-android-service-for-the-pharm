/**
 * Platform Settings API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { SettingsResponse } from "./types";

export const settingsApi = {
  async get(): Promise<SettingsResponse> {
    return apiClient<SettingsResponse>(API_CONFIG.ENDPOINTS.ADMIN_SETTINGS, {
      method: "GET",
    });
  },

  async update(settings: Record<string, string>): Promise<SettingsResponse> {
    return apiClient<SettingsResponse>(API_CONFIG.ENDPOINTS.ADMIN_SETTINGS, {
      method: "PATCH",
      body: JSON.stringify({ settings }),
    });
  },
};

