/**
 * Google Contacts Provider
 *
 * Implementation of IContactsProvider that wraps GoogleContactsSyncService
 * Part of the unified provider pattern implementation
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { GoogleContactsSyncService } from '../services/google-contacts-sync.service';
import type {
  ContactsProviderConfig,
  IContactsProvider,
  Contact,
  CreateContactData,
  UpdateContactData,
  ContactsSyncOptions,
  ContactsSyncResult,
  ContactGroup,
} from '../../providers/interfaces/contacts-provider.interface';
import { ContactsProviderError } from '../../providers/interfaces/contacts-provider.interface';

@Injectable()
export class GoogleContactsProvider implements IContactsProvider {
  readonly config: ContactsProviderConfig;
  private readonly logger = new Logger(GoogleContactsProvider.name);

  constructor(
    config: ContactsProviderConfig,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly googleContactsSync: GoogleContactsSyncService,
  ) {
    this.config = config;
    this.logger.log(`GoogleContactsProvider initialized for ${config.email}`);
  }

  // ==================== Authentication ====================

  async refreshToken(): Promise<{ accessToken: string; expiresAt: Date }> {
    return this.withErrorHandling('refreshToken', async () => {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: this.config.providerId },
      });

      if (!provider || !provider.refreshToken || !provider.refreshTokenEncryptionIv) {
        throw new ContactsProviderError(
          'No refresh token available',
          'REFRESH_TOKEN_MISSING',
          'google',
        );
      }

      const refreshToken = this.crypto.decrypt(provider.refreshToken, provider.refreshTokenEncryptionIv);
      const refreshed = await this.googleOAuth.refreshAccessToken(refreshToken);

      // Update provider config
      const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);
      await this.prisma.providerConfig.update({
        where: { id: this.config.providerId },
        data: {
          accessToken: encryptedAccess.encrypted,
          tokenEncryptionIv: encryptedAccess.iv,
          tokenExpiresAt: refreshed.expiresAt,
        },
      });

      return {
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
      };
    });
  }

  // ==================== Contact Operations ====================

  async listContacts(options?: ContactsSyncOptions): Promise<Contact[]> {
    return this.withErrorHandling('listContacts', async () => {
      const contacts = await this.prisma.contact.findMany({
        where: {
          providerId: this.config.providerId,
          isDeleted: false,
        },
        orderBy: { displayName: 'asc' },
        take: options?.maxResults || 1000,
      });

      return contacts.map((contact) => this.mapToContact(contact));
    });
  }

  async getContact(contactId: string): Promise<Contact> {
    return this.withErrorHandling('getContact', async () => {
      const contact = await this.prisma.contact.findFirst({
        where: {
          providerId: this.config.providerId,
          externalId: contactId,
          isDeleted: false,
        },
      });

      if (!contact) {
        throw new ContactsProviderError('Contact not found', 'CONTACT_NOT_FOUND', 'google');
      }

      return this.mapToContact(contact);
    });
  }

  async createContact(contactData: CreateContactData): Promise<{ id: string }> {
    return this.withErrorHandling('createContact', async () => {
      // Create a unique external ID
      const externalId = `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const contact = await this.prisma.contact.create({
        data: {
          tenantId: this.config.userId, // Using userId as tenantId
          providerId: this.config.providerId,
          externalId,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          displayName: contactData.displayName || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim(),
          emails: contactData.emails as any,
          phoneNumbers: contactData.phoneNumbers as any,
          company: contactData.company,
          jobTitle: contactData.jobTitle,
          department: contactData.department,
          birthday: contactData.birthday,
          notes: contactData.notes,
          contactGroup: contactData.groups?.[0], // First group as primary
          metadata: {
            createdVia: 'ProviderAPI',
            source: 'Google Contacts Provider',
          } as any,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(`Created contact ${contact.firstName} ${contact.lastName} (${contact.externalId}) for provider ${this.config.providerId}`);

      return { id: contact.externalId };
    });
  }

  async updateContact(contactData: UpdateContactData): Promise<void> {
    return this.withErrorHandling('updateContact', async () => {
      const { id, ...updateData } = contactData;

      // Calculate displayName if not provided but names are updated
      let displayName = updateData.displayName;
      if (!displayName && (updateData.firstName || updateData.lastName)) {
        const existing = await this.prisma.contact.findFirst({
          where: {
            providerId: this.config.providerId,
            externalId: id,
            isDeleted: false,
          },
          select: { firstName: true, lastName: true },
        });

        const firstName = updateData.firstName ?? existing?.firstName ?? '';
        const lastName = updateData.lastName ?? existing?.lastName ?? '';
        displayName = `${firstName} ${lastName}`.trim();
      }

      const result = await this.prisma.contact.updateMany({
        where: {
          providerId: this.config.providerId,
          externalId: id,
        },
        data: {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          displayName: displayName,
          emails: updateData.emails as any,
          phoneNumbers: updateData.phoneNumbers as any,
          company: updateData.company,
          jobTitle: updateData.jobTitle,
          department: updateData.department,
          birthday: updateData.birthday,
          notes: updateData.notes,
          contactGroup: updateData.groups?.[0], // First group as primary
          lastSyncedAt: new Date(),
          syncVersion: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new ContactsProviderError('Contact not found', 'CONTACT_NOT_FOUND', 'google');
      }

      this.logger.log(`Updated contact ${id} for provider ${this.config.providerId}`);
    });
  }

  async deleteContact(contactId: string): Promise<void> {
    return this.withErrorHandling('deleteContact', async () => {
      const result = await this.prisma.contact.updateMany({
        where: {
          providerId: this.config.providerId,
          externalId: contactId,
        },
        data: {
          isDeleted: true,
          lastSyncedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new ContactsProviderError('Contact not found', 'CONTACT_NOT_FOUND', 'google');
      }

      this.logger.log(`Deleted contact ${contactId} for provider ${this.config.providerId}`);
    });
  }

  async searchContacts(query: string, _options?: { maxResults?: number }): Promise<Contact[]> {
    return this.withErrorHandling('searchContacts', async () => {
      const contacts = await this.prisma.contact.findMany({
        where: {
          providerId: this.config.providerId,
          isDeleted: false,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { displayName: 'asc' },
        take: _options?.maxResults || 50,
      });

      return contacts.map((contact) => this.mapToContact(contact));
    });
  }

  // ==================== Group Operations ====================

  async listGroups(): Promise<ContactGroup[]> {
    return this.withErrorHandling('listGroups', async () => {
      // Get all groups with member counts from database
      const groupCounts = await this.prisma.contact.groupBy({
        by: ['contactGroup'],
        where: {
          providerId: this.config.providerId,
          contactGroup: { not: null },
          isDeleted: false,
        },
        _count: { id: true },
      });

      const groups: ContactGroup[] = groupCounts
        .filter(g => g.contactGroup)
        .map(g => ({
          id: g.contactGroup!,
          name: g.contactGroup!, // For now use groupId as name, could be enhanced later
          description: undefined,
          memberCount: g._count.id,
          isSystemGroup: false, // All groups are user-created for now
        }));

      // Add default "My Contacts" group with all ungrouped contacts
      const ungroupedCount = await this.prisma.contact.count({
        where: {
          providerId: this.config.providerId,
          contactGroup: null,
          isDeleted: false,
        },
      });

      if (ungroupedCount > 0) {
        groups.unshift({
          id: 'myContacts',
          name: 'My Contacts',
          description: 'Default contact group for ungrouped contacts',
          memberCount: ungroupedCount,
          isSystemGroup: true,
        });
      }

      return groups;
    });
  }

  async createGroup(name: string, _description?: string): Promise<{ id: string }> {
    return this.withErrorHandling('createGroup', async () => {
      // Create unique group ID based on name and timestamp
      const groupId = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;

      // Validation: Check if group name already exists
      const existing = await this.prisma.contact.findFirst({
        where: {
          providerId: this.config.providerId,
          contactGroup: groupId,
          isDeleted: false,
        },
      });

      if (existing) {
        throw new ContactsProviderError('Group with this name already exists', 'GROUP_ALREADY_EXISTS', 'google');
      }

      // Create a placeholder contact to establish the group (will be removed when proper group table is added)
      const placeholderExternalId = `group-placeholder-${groupId}`;
      await this.prisma.contact.create({
        data: {
          tenantId: this.config.userId,
          providerId: this.config.providerId,
          externalId: placeholderExternalId,
          displayName: `## GROUP PLACEHOLDER: ${name} ##`,
          contactGroup: groupId,
          metadata: {
            groupPlaceholder: true,
            groupName: name,
            groupDescription: _description,
            createdVia: 'ProviderAPI',
            source: 'Google Contacts Provider',
          } as any,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(`Created contact group "${name}" (${groupId}) for provider ${this.config.providerId}`);

      return { id: groupId };
    });
  }

  async updateGroup(groupId: string, name: string, description?: string): Promise<void> {
    return this.withErrorHandling('updateGroup', async () => {
      // Check if group exists (has at least one contact)
      const groupExists = await this.prisma.contact.findFirst({
        where: {
          providerId: this.config.providerId,
          contactGroup: groupId,
          isDeleted: false,
        },
      });

      if (!groupExists) {
        throw new ContactsProviderError('Group not found', 'GROUP_NOT_FOUND', 'google');
      }

      // Note: For now, we don't store group metadata in database.
      // This is a placeholder for future group table enhancement.
      // Group name is inferred from the group ID itself.

      this.logger.log(`Updated contact group ${groupId} to "${name}" for provider ${this.config.providerId}`);
    });
  }

  async deleteGroup(groupId: string): Promise<void> {
    return this.withErrorHandling('deleteGroup', async () => {
      // Check if group exists
      const groupContacts = await this.prisma.contact.count({
        where: {
          providerId: this.config.providerId,
          contactGroup: groupId,
          isDeleted: false,
        },
      });

      if (groupContacts === 0) {
        throw new ContactsProviderError('Group not found', 'GROUP_NOT_FOUND', 'google');
      }

      // Remove all contacts from this group (set contactGroup to null)
      const result = await this.prisma.contact.updateMany({
        where: {
          providerId: this.config.providerId,
          contactGroup: groupId,
          isDeleted: false,
        },
        data: {
          contactGroup: null,
          lastSyncedAt: new Date(),
        },
      });

      // Delete group placeholder (identified by naming pattern)
      await this.prisma.contact.deleteMany({
        where: {
          providerId: this.config.providerId,
          externalId: { startsWith: `group-placeholder-${groupId}` },
        },
      });

      this.logger.log(`Deleted contact group ${groupId} and moved ${result.count} contacts to ungrouped for provider ${this.config.providerId}`);
    });
  }

  async addContactsToGroup(groupId: string, contactIds: string[]): Promise<void> {
    return this.withErrorHandling('addContactsToGroup', async () => {
      // Check if group exists
      const groupExists = await this.prisma.contact.findFirst({
        where: {
          providerId: this.config.providerId,
          contactGroup: groupId,
          isDeleted: false,
        },
      });

      if (!groupExists) {
        throw new ContactsProviderError('Group not found', 'GROUP_NOT_FOUND', 'google');
      }

      // Add contacts to group
      const result = await this.prisma.contact.updateMany({
        where: {
          providerId: this.config.providerId,
          externalId: { in: contactIds },
          isDeleted: false,
        },
        data: {
          contactGroup: groupId,
          lastSyncedAt: new Date(),
        },
      });

      if (result.count === 0) {
        this.logger.warn(`No contacts found with provided IDs: ${contactIds.join(', ')}`);
      } else {
        this.logger.log(`Added ${result.count} contacts to group ${groupId} for provider ${this.config.providerId}`);
      }
    });
  }

  async removeContactsFromGroup(groupId: string, contactIds: string[]): Promise<void> {
    return this.withErrorHandling('removeContactsFromGroup', async () => {
      // Move contacts back to ungrouped
      const result = await this.prisma.contact.updateMany({
        where: {
          providerId: this.config.providerId,
          externalId: { in: contactIds },
          contactGroup: groupId,
          isDeleted: false,
        },
        data: {
          contactGroup: null,
          lastSyncedAt: new Date(),
        },
      });

      if (result.count === 0) {
        this.logger.warn(`No contacts found in group ${groupId} with provided IDs: ${contactIds.join(', ')}`);
      } else {
        this.logger.log(`Removed ${result.count} contacts from group ${groupId} for provider ${this.config.providerId}`);
      }
    });
  }

  // ==================== Sync Operations ====================

  async syncContacts(options?: ContactsSyncOptions): Promise<ContactsSyncResult> {
    return this.withErrorHandling('syncContacts', async () => {
      try {
        const syncedCount = await this.googleContactsSync.syncContacts(this.config.providerId);
        return {
          success: true,
          contactsProcessed: syncedCount,
          newContacts: syncedCount, // Assuming all are new for now
          updatedContacts: 0,
          deletedContacts: 0,
          nextSyncToken: undefined,
        };
      } catch (error) {
        this.logger.error(`Sync failed for provider ${this.config.providerId}:`, error);
        throw new ContactsProviderError(
          'Contacts sync failed',
          'SYNC_FAILED',
          'google',
          error,
        );
      }
    });
  }

  // ==================== Utility Methods ====================

  async testConnection(): Promise<boolean> {
    try {
      await this.listContacts({ maxResults: 1 });
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  async getContactPhotoUrl?(contactId: string, _size?: number): Promise<string> {
    // Implementation would construct Google People API photo URL
    return `https://people.googleapis.com/v1/people/${contactId}:get?personFields=photos&key=${this.config.accessToken}`;
  }

  // ==================== Helpers ====================

  /**
   * Error handling wrapper for contacts operations
   */
  private async withErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      this.logger.debug(`Google Contacts ${operation} started for ${this.config.email}`);
      const result = await fn();
      this.logger.debug(`Google Contacts ${operation} completed for ${this.config.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Google Contacts ${operation} failed for ${this.config.email}:`, error);

      if (error instanceof ContactsProviderError) {
        throw error;
      }

      // Convert other errors to ContactsProviderError
      throw new ContactsProviderError(
        `${operation} failed: ${error instanceof Error ? error.message : String(error)}`,
        'OPERATION_FAILED',
        'google',
        error,
      );
    }
  }

  /**
   * Map database Contact to Contact interface
   */
  private mapToContact(contact: any): Contact {
    return {
      id: contact.externalId,
      externalId: contact.externalId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      displayName: contact.displayName,
      middleName: contact.middleName,
      emails: contact.emails,
      phoneNumbers: contact.phoneNumbers,
      company: contact.company,
      jobTitle: contact.jobTitle,
      department: contact.department,
      birthday: contact.birthday,
      photoUrl: contact.photoUrl,
      addresses: contact.addresses,
      notes: contact.notes,
      urls: contact.urls,
      groups: contact.contactGroup ? [contact.contactGroup] : [],
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      lastContactedAt: contact.lastContactedAt,
    };
  }
}
