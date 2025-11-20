import { apiClient } from '../api-client';

// ===== TYPES =====

export interface Label {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabelDto {
  name: string;
  color: string;
  order?: number;
}

export interface UpdateLabelDto {
  name?: string;
  color?: string;
}

export interface AddEmailsToLabelDto {
  emailIds: string[];
}

export interface ReorderLabelsDto {
  labelIds: string[];
}

export interface LabelsResponse {
  labels: Label[];
}

export interface LabelResponse {
  label: Label;
}

export interface LabelEmailsResponse {
  emails: any[]; // Using any for now, could be Email type from email.ts
}

// ===== API CLIENT =====

export const labelsApi = {
  /**
   * List all labels for current user
   * GET /labels
   */
  async listLabels(): Promise<LabelsResponse> {
    const response = await apiClient.get('/labels');
    return response.data;
  },

  /**
   * Get a specific label by ID
   * GET /labels/:id
   */
  async getLabel(labelId: string): Promise<LabelResponse> {
    const response = await apiClient.get(`/labels/${labelId}`);
    return response.data;
  },

  /**
   * Create a new label
   * POST /labels
   */
  async createLabel(dto: CreateLabelDto): Promise<LabelResponse> {
    const response = await apiClient.post('/labels', dto);
    return response.data;
  },

  /**
   * Update a label
   * PUT /labels/:id
   */
  async updateLabel(labelId: string, dto: UpdateLabelDto): Promise<LabelResponse> {
    const response = await apiClient.put(`/labels/${labelId}`, dto);
    return response.data;
  },

  /**
   * Delete a label
   * DELETE /labels/:id
   */
  async deleteLabel(labelId: string): Promise<void> {
    await apiClient.delete(`/labels/${labelId}`);
  },

  /**
   * Add emails to a label
   * POST /labels/:id/emails
   */
  async addEmailsToLabel(labelId: string, dto: AddEmailsToLabelDto): Promise<{ count: number }> {
    const response = await apiClient.post(`/labels/${labelId}/emails`, dto);
    return response.data;
  },

  /**
   * Remove an email from a label
   * DELETE /labels/:id/emails/:emailId
   */
  async removeEmailFromLabel(labelId: string, emailId: string): Promise<void> {
    await apiClient.delete(`/labels/${labelId}/emails/${emailId}`);
  },

  /**
   * Get all emails for a label
   * GET /labels/:id/emails
   */
  async getEmailsForLabel(labelId: string): Promise<LabelEmailsResponse> {
    const response = await apiClient.get(`/labels/${labelId}/emails`);
    return response.data;
  },

  /**
   * Reorder labels
   * POST /labels/reorder
   */
  async reorderLabels(dto: ReorderLabelsDto): Promise<void> {
    await apiClient.post('/labels/reorder', dto);
  },
};
