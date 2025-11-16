import { create } from 'zustand';

interface FolderCounts {
  totalCount: number;
  unreadCount: number;
  folderName?: string;
  providerId?: string;
}

interface FolderState {
  countsByFolderId: Record<string, FolderCounts>;
  updateFolderCounts: (
    providerId: string,
    folderId: string,
    counts: { totalCount: number; unreadCount: number; folderName?: string },
  ) => void;
  reset: () => void;
}

export const useFoldersStore = create<FolderState>((set) => ({
  countsByFolderId: {},
  updateFolderCounts: (providerId, folderId, counts) =>
    set((state) => ({
      countsByFolderId: {
        ...state.countsByFolderId,
        [`${providerId}:${folderId}`]: {
          totalCount: counts.totalCount,
          unreadCount: counts.unreadCount,
          folderName: counts.folderName,
          providerId,
        },
      },
    })),
  reset: () =>
    set({
      countsByFolderId: {},
    }),
}));
