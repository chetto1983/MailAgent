import { apiClient } from '../api-client';

// ===== TYPES =====

export type Email = {
  id: string;
  tenantId: string;
  providerId: string;
  externalId: string;
  threadId?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo?: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  snippet?: string;
  folder: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isFlagged: boolean;
  isDraft: boolean;
  isDeleted: boolean;
  sentAt: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  size?: number;
  headers?: Record<string, any>;
  metadata?: Record<string, any>;
  attachments?: EmailAttachment[];
};

export type EmailAttachment = {
  id: string;
  emailId: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string;
  storageType: string;
  storagePath?: string;
  isInline: boolean;
  createdAt: string;
};

export type EmailListFilters = {
  folder?: string;
  isRead?: boolean;
  isStarred?: boolean;
  search?: string;
  from?: string;
  startDate?: string;
  endDate?: string;
};

export type EmailListParams = {
  page?: number;
  limit?: number;
  providerId?: string;
  folder?: string;
  isRead?: boolean;
  isStarred?: boolean;
  search?: string;
  from?: string;
  startDate?: string;
  endDate?: string;
};

export type EmailListResponse = {
  emails: Email[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type EmailStats = {
  total: number;
  unread: number;
  starred: number;
  byFolder: Record<string, number>;
  byProvider?: Record<string, number>;
};

export type EmailUpdateData = {
  isRead?: boolean;
  isStarred?: boolean;
  folder?: string;
};

// ===== API CLIENT =====

export const emailApi = {
  /**
   * List emails with pagination and filters
   * GET /emails
   */
  listEmails(params?: EmailListParams) {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.providerId) queryParams.append('providerId', params.providerId);
    if (params?.folder) queryParams.append('folder', params.folder);
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
    if (params?.isStarred !== undefined) queryParams.append('isStarred', params.isStarred.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.from) queryParams.append('from', params.from);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const query = queryParams.toString();
    return apiClient.get<EmailListResponse>(`/emails${query ? `?${query}` : ''}`);
  },

  /**
   * Get email by ID
   * GET /emails/:id
   */
  getEmail(id: string) {
    return apiClient.get<Email>(`/emails/${id}`);
  },

  /**
   * Get email statistics
   * GET /emails/stats
   */
  getStats(providerId?: string) {
    const query = providerId ? `?providerId=${providerId}` : '';
    return apiClient.get<EmailStats>(`/emails/stats${query}`);
  },

  /**
   * Search emails
   * GET /emails/search
   */
  searchEmails(query: string, providerId?: string, limit?: number) {
    const params = new URLSearchParams({ q: query });
    if (providerId) params.append('providerId', providerId);
    if (limit) params.append('limit', limit.toString());

    return apiClient.get<{ emails: Email[] }>(
      `/emails/search?${params.toString()}`
    );
  },

  /**
   * Update email (mark as read/unread, star, move to folder)
   * PATCH /emails/:id
   */
  updateEmail(id: string, data: EmailUpdateData) {
    return apiClient.patch<Email>(`/emails/${id}`, data);
  },

  /**
   * Delete email
   * DELETE /emails/:id
   */
  deleteEmail(id: string) {
    return apiClient.delete<void>(`/emails/${id}`);
  },

  /**
   * Bulk mark emails as read/unread
   * PATCH /emails/bulk/read
   */
  bulkMarkRead(emailIds: string[], isRead: boolean) {
    return apiClient.patch<{ updated: number }>(
      '/emails/bulk/read',
      { emailIds, isRead }
    );
  },

  /**
   * Trigger manual sync for a provider
   * POST /email-sync/sync/:providerId
   */
  syncProvider(providerId: string) {
    return apiClient.post<{ success: boolean; message: string }>(
      `/email-sync/sync/${providerId}`
    );
  },

  /**
   * Get email sync status
   * GET /email-sync/status
   */
  getSyncStatus() {
    return apiClient.get<any>('/email-sync/status');
  },
};
