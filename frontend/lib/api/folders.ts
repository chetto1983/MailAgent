import { API_BASE_URL } from './constants';

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
  const response = await fetch(`${API_BASE_URL}/folders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch folders');
  }

  return response.json();
}

/**
 * Get folders for a specific provider
 */
export async function getFoldersByProvider(
  token: string,
  providerId: string,
): Promise<ProviderFoldersResponse> {
  const response = await fetch(
    `${API_BASE_URL}/folders/provider/${providerId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch folders for provider');
  }

  return response.json();
}

/**
 * Sync folders for a specific provider
 */
export async function syncFolders(
  token: string,
  providerId: string,
): Promise<{ success: boolean; foldersCount: number; folders: Folder[] }> {
  const response = await fetch(`${API_BASE_URL}/folders/sync/${providerId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to sync folders');
  }

  return response.json();
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
  const response = await fetch(`${API_BASE_URL}/folders/sync-all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to sync all folders');
  }

  return response.json();
}

/**
 * Update folder counts for a provider
 */
export async function updateFolderCounts(
  token: string,
  providerId: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/folders/update-counts/${providerId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to update folder counts');
  }

  return response.json();
}
