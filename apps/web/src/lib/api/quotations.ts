/**
 * Commercial Quotations API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { QuotationListItem, QuotationDetail, CreateQuotationPayload, PaginatedResponse } from "./types";

export const quotationsApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    order_id?: string;
  }): Promise<PaginatedResponse<QuotationListItem>> {
    return apiClient<PaginatedResponse<QuotationListItem>>(API_CONFIG.ENDPOINTS.ADMIN_QUOTATIONS, {
      method: "GET",
      params,
    });
  },

  async get(id: string): Promise<QuotationDetail> {
    return apiClient<QuotationDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_QUOTATIONS}/${id}`, {
      method: "GET",
    });
  },

  async create(payload: CreateQuotationPayload): Promise<QuotationDetail> {
    return apiClient<QuotationDetail>(API_CONFIG.ENDPOINTS.ADMIN_QUOTATIONS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: Partial<CreateQuotationPayload>): Promise<QuotationDetail> {
    return apiClient<QuotationDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_QUOTATIONS}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(id: string, status: string): Promise<QuotationDetail> {
    return apiClient<QuotationDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_QUOTATIONS}/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};

