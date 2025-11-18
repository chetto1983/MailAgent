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
      // Implementation would call Google People API to create contact
      // For now, create a database record
      const externalId = `contact-${Date.now()}`;

      const contact = await this.prisma.contact.create({
        data: {
          tenantId: this.config.userId, // Using userId as tenantId
          providerId: this.config.providerId,
          externalId,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          displayName: contactData.displayName || `${contactData.firstName} ${contactData.lastName}`,
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

      this.logger.log(`Mock created contact ${contact.id} for provider ${this.config.providerId}`);

      return { id: contact.externalId };
    });
  }

  async updateContact(contactData: UpdateContactData): Promise<void> {
    return this.withErrorHandling('updateContact', async () => {
      const { id, ...updateData } = contactData;

      await this.prisma.contact.updateMany({
        where: {
          providerId: this.config.providerId,
          externalId: id,
        },
        data: {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          displayName: updateData.displayName,
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

      this.logger.log(`Mock updated contact ${id} for provider ${this.config.providerId}`);
    });
  }

  async deleteContact(contactId: string): Promise<void> {
    return this.withErrorHandling('deleteContact', async () => {
      await this.prisma.contact.updateMany({
        where: {
          providerId: this.config.providerId,
          externalId: contactId,
        },
        data: {
          isDeleted: true,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(`Mock deleted contact ${contactId} for provider ${this.config.providerId}`);
    });
  }

  async searchContacts(query: string, options?: { maxResults?: number }): Promise<Contact[]> {
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
        take: options?.maxResults || 50,
      });

      return contacts.map((contact) => this.mapToContact(contact));
    });
  }

  // ==================== Group Operations ====================

  async listGroups(): Promise<ContactGroup[]> {
    return this.withErrorHandling('listGroups', async () => {
      // Implementation would call Google People API to get contact groups
      // For now, return mock data
      return [
        {
          id: 'myContacts',
          name: 'My Contacts',
          description: 'Default contact group',
          memberCount: 0,
          isSystemGroup: true,
        },
      ];
    });
  }

  async createGroup(name: string, description?: string): Promise<{ id: string }> {
    return this.withErrorHandling('createGroup', async () => {
      // Implementation would call Google People API to create contact group
      // For now, return a placeholder ID
      const groupId = `group-${Date.now()}`;

      return { id: groupId };
    });
  }

  async updateGroup(groupId: string, name: string, description?: string): Promise<void> {
    return this.withErrorHandling('updateGroup', async () => {
      // Implementation would call Google People API to update contact group
      // For now, this is a placeholder
      this.logger.log(`Mock update group ${groupId} with name ${name}`);
    });
  }

  async deleteGroup(groupId: string): Promise<void> {
    return this.withErrorHandling('deleteGroup', async () => {
      // Implementation would call Google People API to delete contact group
      // For now, this is a placeholder
      this.logger.log(`Mock delete group ${groupId}`);
    });
  }

  async addContactsToGroup(groupId: string, contactIds: string[]): Promise<void> {
    return this.withErrorHandling('addContactsToGroup', async () => {
      // Implementation would call Google People API to add contacts to group
      // For now, this is a placeholder
      this.logger.log(`Mock added ${contactIds.length} contacts to group ${groupId}`);
    });
  }

  async removeContactsFromGroup(groupId: string, contactIds: string[]): Promise<void> {
    return this.withErrorHandling('removeContactsToGroup', async () => {
      // Implementation would call Google People API to remove contacts from group
      // For now, this is a placeholder
      this.logger.log(`Mock removed ${contactIds.length} contacts from group ${groupId}`);
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

  async getContactPhotoUrl?(contactId: string, size?: number): Promise<string> {
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
