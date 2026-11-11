/**
 * Dashboard Aggregate API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { DashboardSummary } from "./types";

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    return apiClient<DashboardSummary>(API_CONFIG.ENDPOINTS.ADMIN_DASHBOARD, {
      method: "GET",
    });
  },
};

