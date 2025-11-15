import { create } from 'zustand';

export interface Contact {
  id: string;
  providerId: string;
  externalId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  avatar?: string;
  birthday?: string;
  address?: string;
  metadata?: Record<string, any>;
}

interface ContactState {
  contacts: Contact[];
  selectedContact: Contact | null;
  isLoading: boolean;
  searchQuery: string;

  // Actions
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  setSelectedContact: (contact: Contact | null) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Queries
  searchContacts: (query: string) => Contact[];
  getContactByEmail: (email: string) => Contact | undefined;

  // Reset
  reset: () => void;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  selectedContact: null,
  isLoading: false,
  searchQuery: '',

  setContacts: (contacts) => set({ contacts }),

  addContact: (contact) =>
    set((state) => {
      // Prevent duplicates
      if (state.contacts.some((c) => c.id === contact.id)) {
        return state;
      }
      return {
        contacts: [...state.contacts, contact],
      };
    }),

  updateContact: (id, updates) =>
    set((state) => {
      const contactIndex = state.contacts.findIndex((c) => c.id === id);
      if (contactIndex === -1) return state;

      const newContacts = [...state.contacts];
      newContacts[contactIndex] = { ...newContacts[contactIndex], ...updates };

      return {
        contacts: newContacts,
        selectedContact: state.selectedContact?.id === id
          ? newContacts[contactIndex]
          : state.selectedContact,
      };
    }),

  deleteContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
      selectedContact: state.selectedContact?.id === id ? null : state.selectedContact,
    })),

  setSelectedContact: (contact) => set({ selectedContact: contact }),

  setLoading: (loading) => set({ isLoading: loading }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  searchContacts: (query) => {
    const contacts = get().contacts;
    const lowerQuery = query.toLowerCase();
    return contacts.filter((contact) => {
      return (
        contact.fullName?.toLowerCase().includes(lowerQuery) ||
        contact.email?.toLowerCase().includes(lowerQuery) ||
        contact.company?.toLowerCase().includes(lowerQuery) ||
        contact.phone?.includes(lowerQuery)
      );
    });
  },

  getContactByEmail: (email) => {
    const contacts = get().contacts;
    return contacts.find((contact) => contact.email === email);
  },

  reset: () =>
    set({
      contacts: [],
      selectedContact: null,
      isLoading: false,
      searchQuery: '',
    }),
}));
