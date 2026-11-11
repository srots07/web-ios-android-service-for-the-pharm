/**
 * Orders API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { OrderListItem, OrderDetail, PaginatedResponse, CreateOrderPayload } from "./types";

export const ordersApi = {
  async create(payload: CreateOrderPayload): Promise<OrderDetail> {
    return apiClient<OrderDetail>(API_CONFIG.ENDPOINTS.ADMIN_ORDERS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    assigned_admin_id?: string;
  }): Promise<PaginatedResponse<OrderListItem>> {
    return apiClient<PaginatedResponse<OrderListItem>>(API_CONFIG.ENDPOINTS.ADMIN_ORDERS, {
      method: "GET",
      params,
    });
  },

  async get(id: string): Promise<OrderDetail> {
    return apiClient<OrderDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}/${id}`, {
      method: "GET",
    });
  },

  async updateStatus(id: string, status: string, reason?: string): Promise<OrderDetail> {
    return apiClient<OrderDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    });
  },

  async assign(id: string, assigned_admin_id: string): Promise<OrderDetail> {
    return apiClient<OrderDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ assigned_admin_id }),
    });
  },
};

