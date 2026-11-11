/**
 * Products & Categories API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import {
  ProductItem,
  CategoryItem,
  PaginatedResponse,
  CreateProductPayload,
  UpdateProductPayload,
  ProductDocumentItem,
} from "./types";

export const productsApi = {
  async listPublic(params?: { category?: string; search?: string }): Promise<ProductItem[]> {
    return apiClient<ProductItem[]>(API_CONFIG.ENDPOINTS.PRODUCTS, {
      method: "GET",
      params,
      skipAuth: true,
    });
  },

  async listCategories(): Promise<CategoryItem[]> {
    return apiClient<CategoryItem[]>(API_CONFIG.ENDPOINTS.CATEGORIES, {
      method: "GET",
      skipAuth: true,
    });
  },

  async listAdmin(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<PaginatedResponse<ProductItem>> {
    return apiClient<PaginatedResponse<ProductItem>>(API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS, {
      method: "GET",
      params,
    });
  },

  async get(id: string): Promise<ProductItem> {
    return apiClient<ProductItem>(`${API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS}/${id}`, {
      method: "GET",
    });
  },

  async create(payload: CreateProductPayload): Promise<ProductItem> {
    return apiClient<ProductItem>(API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: UpdateProductPayload): Promise<ProductItem> {
    return apiClient<ProductItem>(`${API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async publish(id: string): Promise<ProductItem> {
    return apiClient<ProductItem>(`${API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS}/${id}/publish`, {
      method: "POST",
    });
  },

  async archive(id: string): Promise<ProductItem> {
    return apiClient<ProductItem>(`${API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS}/${id}/archive`, {
      method: "POST",
    });
  },

  async delete(id: string): Promise<void> {
    await apiClient(`${API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS}/${id}`, {
      method: "DELETE",
    });
  },

  async attachDocument(
    productId: string,
    payload: { title: string; document_type: string; file_path: string; file_size?: number }
  ): Promise<ProductDocumentItem> {
    return apiClient<ProductDocumentItem>(`${API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS}/${productId}/documents`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async removeDocument(productId: string, documentId: string): Promise<void> {
    await apiClient(`${API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS}/${productId}/documents/${documentId}`, {
      method: "DELETE",
    });
  },
};

