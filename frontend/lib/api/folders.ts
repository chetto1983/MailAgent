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
export async function getFolders(): Promise<FoldersResponse> {
  const response = await apiClient.get('/folders');
  return response.data;
}

/**
 * Get folders for a specific provider
 */
export async function getFoldersByProvider(
  providerId: string,
): Promise<ProviderFoldersResponse> {
  const response = await apiClient.get(`/folders/provider/${providerId}`);
  return response.data;
}

/**
 * Sync folders for a specific provider
 */
export async function syncFolders(
  providerId: string,
): Promise<{ success: boolean; foldersCount: number; folders: Folder[] }> {
  const response = await apiClient.post(`/folders/sync/${providerId}`);
  return response.data;
}

/**
 * Sync folders for all providers
 */
export async function syncAllFolders(): Promise<{
  success: boolean;
  results: Array<{
    providerId: string;
    providerEmail: string;
    success: boolean;
    foldersCount?: number;
    error?: string;
  }>;
}> {
  const response = await apiClient.post('/folders/sync-all');
  return response.data;
}

/**
 * Update folder counts for a provider
 */
export async function updateFolderCounts(
  providerId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/folders/update-counts/${providerId}`);
  return response.data;
}
