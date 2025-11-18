/**
 * Contacts Provider Interface
 *
 * Common interface for all contacts providers (Google, Microsoft)
 * Inspired by Zero's unified provider pattern
 */

export interface ContactsProviderConfig {
  userId: string;
  providerId: string;
  providerType: 'google' | 'microsoft';
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: Date;
}

export interface Contact {
  id: string;
  externalId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  emails?: Array<{
    value: string;
    type: 'home' | 'work' | 'other';
    primary?: boolean;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type: 'home' | 'work' | 'mobile' | 'other';
    primary?: boolean;
  }>;
  company?: string;
  jobTitle?: string;
  department?: string;
  birthday?: Date;
  photoUrl?: string;
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    type: 'home' | 'work' | 'other';
  }>;
  notes?: string;
  urls?: Array<{
    value: string;
    type: 'home' | 'work' | 'other';
  }>;
  groups?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  lastContactedAt?: Date;
}

export interface CreateContactData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  emails?: Array<{
    value: string;
    type: 'home' | 'work' | 'other';
    primary?: boolean;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type: 'home' | 'work' | 'mobile' | 'other';
    primary?: boolean;
  }>;
  company?: string;
  jobTitle?: string;
  department?: string;
  birthday?: Date;
  photoUrl?: string;
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    type: 'home' | 'work' | 'other';
  }>;
  notes?: string;
  urls?: Array<{
    value: string;
    type: 'home' | 'work' | 'other';
  }>;
  groups?: string[];
}

export interface UpdateContactData extends Partial<CreateContactData> {
  id: string;
}

export interface ContactsSyncOptions {
  groupId?: string;
  maxResults?: number;
  syncToken?: string;
  updatedMin?: Date;
}

export interface ContactsSyncResult {
  success: boolean;
  contactsProcessed: number;
  newContacts: number;
  updatedContacts: number;
  deletedContacts: number;
  nextSyncToken?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  isSystemGroup?: boolean;
}

/**
 * IContactsProvider - Common interface for all contacts providers
 *
 * This interface defines the contract that all contacts providers must implement.
 * It provides a unified API for contacts operations.
 */
export interface IContactsProvider {
  readonly config: ContactsProviderConfig;

  // ==================== Authentication ====================

  /**
   * Refresh the access token
   */
  refreshToken(): Promise<{ accessToken: string; expiresAt: Date }>;

  // ==================== Contact Operations ====================

  /**
   * List all contacts
   */
  listContacts(options?: ContactsSyncOptions): Promise<Contact[]>;

  /**
   * Get a single contact by ID
   */
  getContact(contactId: string): Promise<Contact>;

  /**
   * Create a new contact
   */
  createContact(contactData: CreateContactData): Promise<{ id: string }>;

  /**
   * Update an existing contact
   */
  updateContact(contactData: UpdateContactData): Promise<void>;

  /**
   * Delete a contact
   */
  deleteContact(contactId: string): Promise<void>;

  /**
   * Search contacts by query
   */
  searchContacts(query: string, options?: { maxResults?: number }): Promise<Contact[]>;

  // ==================== Group Operations ====================

  /**
   * List contact groups
   */
  listGroups(): Promise<ContactGroup[]>;

  /**
   * Create a contact group
   */
  createGroup(name: string, description?: string): Promise<{ id: string }>;

  /**
   * Update a contact group
   */
  updateGroup(groupId: string, name: string, description?: string): Promise<void>;

  /**
   * Delete a contact group
   */
  deleteGroup(groupId: string): Promise<void>;

  /**
   * Add contacts to a group
   */
  addContactsToGroup(groupId: string, contactIds: string[]): Promise<void>;

  /**
   * Remove contacts from a group
   */
  removeContactsFromGroup(groupId: string, contactIds: string[]): Promise<void>;

  // ==================== Sync Operations ====================

  /**
   * Sync contacts from provider
   */
  syncContacts(options?: ContactsSyncOptions): Promise<ContactsSyncResult>;

  /**
   * Get sync token for incremental sync
   */
  getSyncToken?(): Promise<string>;

  // ==================== Utility Methods ====================

  /**
   * Test connection to contacts provider
   */
  testConnection(): Promise<boolean>;

  /**
   * Get provider-specific contact photo URL
   */
  getContactPhotoUrl?(contactId: string, size?: number): Promise<string>;
}

/**
 * Base error class for contacts provider errors
 */
export class ContactsProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public originalError?: any,
  ) {
    super(message);
    this.name = 'ContactsProviderError';
  }
}

/**
 * Contacts sync error
 */
export class ContactsSyncError extends ContactsProviderError {
  constructor(provider: string, originalError?: any) {
    super('Contacts synchronization failed', 'SYNC_FAILED', provider, originalError);
    this.name = 'ContactsSyncError';
  }
}
