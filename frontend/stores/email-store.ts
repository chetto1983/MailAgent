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
  labels?: string[];
  folder?: string;
  hasAttachments?: boolean;
  inReplyTo?: string;
  references?: string[];
}

interface EmailState {
  emails: Email[];
  unreadCount: number;
  selectedEmail: Email | null;
  isLoading: boolean;

  // Actions
  setEmails: (emails: Email[]) => void;
  addEmail: (email: Email) => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  setSelectedEmail: (email: Email | null) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;

  // Bulk actions
  markAsRead: (ids: string[]) => void;
  markAsStarred: (ids: string[], starred: boolean) => void;

  // Reset
  reset: () => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  emails: [],
  unreadCount: 0,
  selectedEmail: null,
  isLoading: false,

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

  markAsRead: (ids) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        ids.includes(email.id) ? { ...email, isRead: true } : email
      ),
    })),

  markAsStarred: (ids, starred) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        ids.includes(email.id) ? { ...email, isStarred: starred } : email
      ),
    })),

  reset: () =>
    set({
      emails: [],
      unreadCount: 0,
      selectedEmail: null,
      isLoading: false,
    }),
}));
