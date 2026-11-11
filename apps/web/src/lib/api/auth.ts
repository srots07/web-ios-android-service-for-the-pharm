/**
 * Authentication API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient, setAccessToken } from "./client";
import { API_CONFIG } from "./config";
import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from "./types";

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const data = await apiClient<LoginResponse>(API_CONFIG.ENDPOINTS.LOGIN, {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    });
    if (data.access_token) {
      setAccessToken(data.access_token);
    }
    return data;
  },

  async register(payload: RegisterRequest): Promise<AuthUser> {
    return apiClient<AuthUser>(API_CONFIG.ENDPOINTS.REGISTER, {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  async me(): Promise<AuthUser> {
    return apiClient<AuthUser>(API_CONFIG.ENDPOINTS.ME, {
      method: "GET",
    });
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    return apiClient<AuthUser>(API_CONFIG.ENDPOINTS.PROFILE, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string; success: boolean }> {
    return apiClient<{ message: string; success: boolean }>(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCustomerEnquiries(): Promise<any[]> {
    return apiClient<any[]>(API_CONFIG.ENDPOINTS.CUSTOMER_ENQUIRIES, {
      method: "GET",
    });
  },

  async getCustomerOrders(): Promise<any[]> {
    return apiClient<any[]>(API_CONFIG.ENDPOINTS.CUSTOMER_ORDERS, {
      method: "GET",
    });
  },

  async getCustomerQuotations(): Promise<any[]> {
    return apiClient<any[]>(API_CONFIG.ENDPOINTS.CUSTOMER_QUOTATIONS, {
      method: "GET",
    });
  },

  async logout(): Promise<void> {
    try {
      await apiClient(API_CONFIG.ENDPOINTS.LOGOUT, {
        method: "POST",
      });
    } finally {
      setAccessToken(null);
    }
  },

  async logoutAll(): Promise<void> {
    try {
      await apiClient(API_CONFIG.ENDPOINTS.LOGOUT_ALL, {
        method: "POST",
      });
    } finally {
      setAccessToken(null);
    }
  },
};


