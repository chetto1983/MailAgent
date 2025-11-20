import { create } from 'zustand';
import { labelsApi, type Label } from '@/lib/api/labels';

interface LabelStore {
  labels: Label[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchLabels: () => Promise<void>;
  createLabel: (name: string, color: string) => Promise<Label>;
  updateLabel: (labelId: string, name?: string, color?: string) => Promise<Label>;
  deleteLabel: (labelId: string) => Promise<void>;
  reorderLabels: (labelIds: string[]) => Promise<void>;
  addEmailsToLabel: (labelId: string, emailIds: string[]) => Promise<void>;
  removeEmailFromLabel: (labelId: string, emailId: string) => Promise<void>;

  // Helpers
  getLabelById: (labelId: string) => Label | undefined;
  getLabelByName: (name: string) => Label | undefined;
  getEmailCountForLabel: (labelId: string) => number;
}

export const useLabelStore = create<LabelStore>((set, get) => ({
  labels: [],
  isLoading: false,
  error: null,

  fetchLabels: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await labelsApi.listLabels();
      set({ labels: response.labels, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch labels:', error);
      set({ error: 'Failed to fetch labels', isLoading: false });
      throw error;
    }
  },

  createLabel: async (name: string, color: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await labelsApi.createLabel({
        name,
        color,
        order: get().labels.length, // Add at end
      });
      const newLabel = response.label;
      set((state) => ({
        labels: [...state.labels, newLabel],
        isLoading: false,
      }));
      return newLabel;
    } catch (error) {
      console.error('Failed to create label:', error);
      set({ error: 'Failed to create label', isLoading: false });
      throw error;
    }
  },

  updateLabel: async (labelId: string, name?: string, color?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await labelsApi.updateLabel(labelId, { name, color });
      const updatedLabel = response.label;
      set((state) => ({
        labels: state.labels.map((label) =>
          label.id === labelId ? updatedLabel : label
        ),
        isLoading: false,
      }));
      return updatedLabel;
    } catch (error) {
      console.error('Failed to update label:', error);
      set({ error: 'Failed to update label', isLoading: false });
      throw error;
    }
  },

  deleteLabel: async (labelId: string) => {
    set({ isLoading: true, error: null });
    try {
      await labelsApi.deleteLabel(labelId);
      set((state) => ({
        labels: state.labels.filter((label) => label.id !== labelId),
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to delete label:', error);
      set({ error: 'Failed to delete label', isLoading: false });
      throw error;
    }
  },

  reorderLabels: async (labelIds: string[]) => {
    // Optimistic update
    const previousLabels = get().labels;
    const reorderedLabels = labelIds
      .map((id) => previousLabels.find((label) => label.id === id))
      .filter((label): label is Label => label !== undefined);

    set({ labels: reorderedLabels });

    try {
      await labelsApi.reorderLabels({ labelIds });
    } catch (error) {
      console.error('Failed to reorder labels:', error);
      // Revert on error
      set({ labels: previousLabels, error: 'Failed to reorder labels' });
      throw error;
    }
  },

  addEmailsToLabel: async (labelId: string, emailIds: string[]) => {
    try {
      await labelsApi.addEmailsToLabel(labelId, { emailIds });
    } catch (error) {
      console.error('Failed to add emails to label:', error);
      throw error;
    }
  },

  removeEmailFromLabel: async (labelId: string, emailId: string) => {
    try {
      await labelsApi.removeEmailFromLabel(labelId, emailId);
    } catch (error) {
      console.error('Failed to remove email from label:', error);
      throw error;
    }
  },

  getLabelById: (labelId: string) => {
    return get().labels.find((label) => label.id === labelId);
  },

  getLabelByName: (name: string) => {
    return get().labels.find((label) => label.name === name);
  },

  getEmailCountForLabel: (_labelId: string) => {
    // This would need to be tracked separately or fetched from backend
    // For now, return 0 as placeholder
    return 0;
  },
}));
