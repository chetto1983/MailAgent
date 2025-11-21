import { create } from 'zustand';

export interface Email {
  id: string;
  providerId: string;
  externalId: string;
  threadId?: string;
  from: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body?: string;
  bodyPreview?: string;
  receivedAt: string;
  isRead: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  labels?: string[];
  folder?: string;
  hasAttachments?: boolean;
  inReplyTo?: string;
  references?: string;
}

/**
 * Email filter options
 */
export interface EmailFilter {
  folderId?: string;
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface EmailState {
  emails: Email[];
  unreadCount: number;
  selectedEmail: Email | null;
  isLoading: boolean;

  // Filtering and search
  filters: EmailFilter;
  searchQuery: string;

  // Pagination
  pagination: PaginationState;

  // Multi-selection
  selectedIds: Set<string>;

  // Actions
  setEmails: (emails: Email[]) => void;
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  setSelectedEmail: (email: Email | null) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;

  // Filtering and search
  setFilters: (filters: EmailFilter) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  // Pagination
  setPagination: (pagination: Partial<PaginationState>) => void;
  loadMore: () => void;

  // Multi-selection
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectedIds: (ids: Set<string>) => void;

  // Bulk actions
  markAsRead: (ids: string[]) => void;
  markAsStarred: (ids: string[], starred: boolean) => void;
  markAsImportant: (ids: string[], important: boolean) => void;
  bulkDelete: (ids: string[]) => void;
  moveToFolder: (ids: string[], folderId: string) => void;

  // Reset
  reset: () => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  emails: [],
  unreadCount: 0,
  selectedEmail: null,
  isLoading: false,
  filters: {},
  searchQuery: '',
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
    hasMore: false,
  },
  selectedIds: new Set<string>(),

  setEmails: (emails) => set({ emails }),

  addEmail: (email) =>
    set((state) => {
      // Prevent duplicates
      if (state.emails.some((e) => e.id === email.id)) {
        return state;
      }
      return {
        emails: [email, ...state.emails],
        unreadCount: !email.isRead ? state.unreadCount + 1 : state.unreadCount,
      };
    }),

  updateEmail: (id, updates) =>
    set((state) => {
      const emailIndex = state.emails.findIndex((e) => e.id === id);
      if (emailIndex === -1) return state;

      const oldEmail = state.emails[emailIndex];
      const newEmail = { ...oldEmail, ...updates };
      const newEmails = [...state.emails];
      newEmails[emailIndex] = newEmail;

      // Update unread count if isRead changed
      let newUnreadCount = state.unreadCount;
      if (oldEmail.isRead !== newEmail.isRead) {
        newUnreadCount += newEmail.isRead ? -1 : 1;
      }

      return {
        emails: newEmails,
        unreadCount: Math.max(0, newUnreadCount),
        selectedEmail: state.selectedEmail?.id === id ? newEmail : state.selectedEmail,
      };
    }),

  deleteEmail: (id) =>
    set((state) => {
      const email = state.emails.find((e) => e.id === id);
      if (!email) return state;

      return {
        emails: state.emails.filter((e) => e.id !== id),
        unreadCount: !email.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        selectedEmail: state.selectedEmail?.id === id ? null : state.selectedEmail,
      };
    }),

  setSelectedEmail: (email) => set({ selectedEmail: email }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  setLoading: (loading) => set({ isLoading: loading }),

  // Filtering and search
  setFilters: (filters) => set({ filters }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearFilters: () => set({ filters: {}, searchQuery: '' }),

  // Pagination
  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    })),

  loadMore: () =>
    set((state) => ({
      pagination: { ...state.pagination, page: state.pagination.page + 1 },
    })),

  // Multi-selection
  toggleSelection: (id) =>
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return { selectedIds: newSelectedIds };
    }),

  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.emails.map((e) => e.id)),
    })),

  clearSelection: () => set({ selectedIds: new Set<string>() }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  // Bulk actions
  markAsRead: (ids) =>
    set((state) => {
      const updatedEmails = state.emails.map((email) =>
        ids.includes(email.id) ? { ...email, isRead: true } : email
      );

      // Recalculate unread count
      const unreadCount = updatedEmails.filter((e) => !e.isRead).length;

      return {
        emails: updatedEmails,
        unreadCount,
      };
    }),

  markAsStarred: (ids, starred) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        ids.includes(email.id) ? { ...email, isStarred: starred } : email
      ),
    })),

  markAsImportant: (ids, important) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        ids.includes(email.id) ? { ...email, isImportant: important } : email
      ),
    })),

  bulkDelete: (ids) =>
    set((state) => {
      const deletedEmails = state.emails.filter((e) => ids.includes(e.id));
      const deletedUnreadCount = deletedEmails.filter((e) => !e.isRead).length;

      return {
        emails: state.emails.filter((e) => !ids.includes(e.id)),
        unreadCount: Math.max(0, state.unreadCount - deletedUnreadCount),
        selectedEmail: state.selectedEmail && ids.includes(state.selectedEmail.id)
          ? null
          : state.selectedEmail,
      };
    }),

  moveToFolder: (ids, folderId) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        ids.includes(email.id) ? { ...email, folder: folderId } : email
      ),
    })),

  reset: () =>
    set({
      emails: [],
      unreadCount: 0,
      selectedEmail: null,
      isLoading: false,
      filters: {},
      searchQuery: '',
      pagination: {
        page: 1,
        pageSize: 50,
        total: 0,
        hasMore: false,
      },
      selectedIds: new Set<string>(),
    }),
}));
