/**
 * Commercial Enquiries API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import {
  EnquiryListItem,
  EnquiryDetail,
  UpdateEnquiryPayload,
  PaginatedResponse,
} from "./types";

export interface EnquirySubmissionPayload {
  fullName: string;
  email: string;
  phone?: string;
  country: string;
  organization?: string;
  enquiryType: string;
  subject: string;
  message: string;
  consent: boolean;
}

export interface EnquiryResponse {
  success: boolean;
  referenceId: string;
  timestamp: string;
  message: string;
}

export const enquiriesApi = {
  async submitEnquiry(payload: EnquirySubmissionPayload): Promise<EnquiryResponse> {
    return apiClient<EnquiryResponse>(API_CONFIG.ENDPOINTS.CONTACT, {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  async listAdmin(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedResponse<EnquiryListItem>> {
    return apiClient<PaginatedResponse<EnquiryListItem>>(API_CONFIG.ENDPOINTS.ADMIN_ENQUIRIES, {
      method: "GET",
      params,
    });
  },

  async get(id: string): Promise<EnquiryDetail> {
    return apiClient<EnquiryDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_ENQUIRIES}/${id}`, {
      method: "GET",
    });
  },

  async update(id: string, payload: UpdateEnquiryPayload): Promise<EnquiryDetail> {
    return apiClient<EnquiryDetail>(`${API_CONFIG.ENDPOINTS.ADMIN_ENQUIRIES}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};


