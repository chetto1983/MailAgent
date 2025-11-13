import { apiClient } from '../api-client';

export interface Folder {
  id: string;
  tenantId: string;
  providerId: string;
  name: string;
  path: string;
  delimiter: string;
  parentId?: string;
  level: number;
  isSelectable: boolean;
  specialUse?: string;
  attributes: string[];
  totalCount: number;
  unreadCount: number;
  recentCount: number;
  unseenCount: number;
  uidValidity?: string;
  uidNext?: number;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  tenantId: string;
  providerType: string;
  email: string;
  displayName?: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface FoldersResponse {
  providers: Provider[];
  foldersByProvider: Record<string, Folder[]>;
}

export interface ProviderFoldersResponse {
  provider: Provider;
  folders: Folder[];
}

/**
 * Get all folders for current user
 */
export async function getFolders(token: string): Promise<FoldersResponse> {
  const response = await apiClient.get('/folders', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Get folders for a specific provider
 */
export async function getFoldersByProvider(
  token: string,
  providerId: string,
): Promise<ProviderFoldersResponse> {
  const response = await apiClient.get(`/folders/provider/${providerId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Sync folders for a specific provider
 */
export async function syncFolders(
  token: string,
  providerId: string,
): Promise<{ success: boolean; foldersCount: number; folders: Folder[] }> {
  const response = await apiClient.post(`/folders/sync/${providerId}`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Sync folders for all providers
 */
export async function syncAllFolders(token: string): Promise<{
  success: boolean;
  results: Array<{
    providerId: string;
    providerEmail: string;
    success: boolean;
    foldersCount?: number;
    error?: string;
  }>;
}> {
  const response = await apiClient.post('/folders/sync-all', null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Update folder counts for a provider
 */
export async function updateFolderCounts(
  token: string,
  providerId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/folders/update-counts/${providerId}`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}
