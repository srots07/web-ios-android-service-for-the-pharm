/**
 * Document Storage & File Upload API Service
 * PRIME by Activist Enterprise Platform
 */

import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { UploadedFileResponse, PaginatedResponse } from "./types";

export const documentsApi = {
  async upload(file: File, category = "general"): Promise<UploadedFileResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    return apiClient<UploadedFileResponse>(`${API_CONFIG.ENDPOINTS.ADMIN_DOCUMENTS}/upload`, {
      method: "POST",
      body: formData,
    });
  },

  async list(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<PaginatedResponse<UploadedFileResponse>> {
    return apiClient<PaginatedResponse<UploadedFileResponse>>(API_CONFIG.ENDPOINTS.ADMIN_DOCUMENTS, {
      method: "GET",
      params,
    });
  },

  getDownloadUrl(documentId: string): string {
    return `${API_CONFIG.ENDPOINTS.ADMIN_DOCUMENTS}/${documentId}/download`;
  },
};

