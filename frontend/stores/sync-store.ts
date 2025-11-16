import { create } from 'zustand';

type SyncStatus = {
  providerId: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  timestamp: string;
};

interface SyncState {
  lastStatus: SyncStatus | null;
  setStatus: (status: SyncStatus) => void;
  clear: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  lastStatus: null,
  setStatus: (status) => set({ lastStatus: status }),
  clear: () => set({ lastStatus: null }),
}));
