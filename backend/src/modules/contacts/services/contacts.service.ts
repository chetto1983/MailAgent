import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { Contact } from '@prisma/client';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';
import { GoogleContactsSyncService } from './google-contacts-sync.service';
import { MicrosoftContactsSyncService } from './microsoft-contacts-sync.service';

export interface CreateContactDto {
  providerId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  emails?: Array<{ value: string; type?: string; primary?: boolean }>;
  phoneNumbers?: Array<{ value: string; type?: string; primary?: boolean }>;
  company?: string;
  jobTitle?: string;
  notes?: string;
}

export interface UpdateContactDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  emails?: Array<{ value: string; type?: string; primary?: boolean }>;
  phoneNumbers?: Array<{ value: string; type?: string; primary?: boolean }>;
  company?: string;
  jobTitle?: string;
  notes?: string;
}

export interface ListContactsFilters {
  providerId?: string;
  search?: string; // Search by name, email, company
  company?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly googleOAuth: GoogleOAuthService,
    private readonly microsoftOAuth: MicrosoftOAuthService,
    private readonly googleContactsSync: GoogleContactsSyncService,
    private readonly microsoftContactsSync: MicrosoftContactsSyncService,
  ) {}

  /**
   * List contacts for a tenant
   */
  async listContacts(
    tenantId: string,
    filters: ListContactsFilters = {},
  ): Promise<{ contacts: Contact[]; total: number }> {
    const limit = filters.limit && filters.limit > 0 && filters.limit <= 100 ? filters.limit : 50;
    const offset = filters.offset && filters.offset >= 0 ? filters.offset : 0;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (filters.providerId) {
      where.providerId = filters.providerId;
    }

    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' };
    }

    // Search across multiple fields
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: offset,
        take: limit,
        include: {
          provider: {
            select: {
              id: true,
              email: true,
              providerType: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { contacts, total };
  }

  /**
   * Get a single contact by ID
   */
  async getContact(tenantId: string, contactId: string): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId,
        isDeleted: false,
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact ${contactId} not found`);
    }

    return contact;
  }

  /**
   * Create a new contact (bidirectional sync)
   * Creates the contact locally AND in the provider's contacts
   */
  async createContact(tenantId: string, data: CreateContactDto): Promise<Contact> {
    this.logger.log(`Creating contact for tenant ${tenantId}`);

    // Get provider config
    const provider = await this.prisma.providerConfig.findFirst({
      where: {
        id: data.providerId,
        tenantId,
        isActive: true,
        supportsContacts: true,
      },
    });

    if (!provider) {
      throw new BadRequestException('Provider not found or does not support contacts');
    }

    // Create contact in provider
    let externalContact;
    if (provider.providerType === 'google') {
      externalContact = await this.googleContactsSync.createContact(provider.id, data);
    } else if (provider.providerType === 'microsoft') {
      externalContact = await this.microsoftContactsSync.createContact(provider.id, data);
    } else {
      throw new BadRequestException(`Provider type ${provider.providerType} not supported`);
    }

    // Create contact in database
    const contact = await this.prisma.contact.create({
      data: {
        tenantId,
        providerId: provider.id,
        externalId: externalContact.id,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName,
        emails: data.emails as any,
        phoneNumbers: data.phoneNumbers as any,
        company: data.company,
        jobTitle: data.jobTitle,
        notes: data.notes,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(`Contact created: ${contact.id}`);
    return contact;
  }

  /**
   * Update a contact (bidirectional sync)
   */
  async updateContact(
    tenantId: string,
    contactId: string,
    data: UpdateContactDto,
  ): Promise<Contact> {
    this.logger.log(`Updating contact ${contactId}`);

    // Get existing contact
    const contact = await this.getContact(tenantId, contactId);

    // Get provider
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: contact.providerId },
    });

    if (!provider || !provider.isActive) {
      throw new BadRequestException('Provider not found or inactive');
    }

    // Update in provider
    if (provider.providerType === 'google') {
      await this.googleContactsSync.updateContact(
        provider.id,
        contact.externalId,
        data,
      );
    } else if (provider.providerType === 'microsoft') {
      await this.microsoftContactsSync.updateContact(
        provider.id,
        contact.externalId,
        data,
      );
    }

    // Update in database
    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        ...data,
        emails: data.emails as any,
        phoneNumbers: data.phoneNumbers as any,
        updatedAt: new Date(),
        lastSyncedAt: new Date(),
        syncVersion: { increment: 1 },
      },
    });

    this.logger.log(`Contact updated: ${contactId}`);
    return updated;
  }

  /**
   * Delete a contact (bidirectional sync)
   */
  async deleteContact(tenantId: string, contactId: string): Promise<void> {
    this.logger.log(`Deleting contact ${contactId}`);

    // Get existing contact
    const contact = await this.getContact(tenantId, contactId);

    // Get provider
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: contact.providerId },
    });

    if (provider && provider.isActive) {
      try {
        // Delete from provider
        if (provider.providerType === 'google') {
          await this.googleContactsSync.deleteContact(
            provider.id,
            contact.externalId,
          );
        } else if (provider.providerType === 'microsoft') {
          await this.microsoftContactsSync.deleteContact(
            provider.id,
            contact.externalId,
          );
        }
      } catch (error: any) {
        this.logger.warn(`Failed to delete contact from provider: ${error.message}`);
      }
    }

    // Soft delete in database
    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Contact deleted: ${contactId}`);
  }

  /**
   * Sync contacts from a provider
   */
  async syncContacts(providerId: string): Promise<number> {
    this.logger.log(`Syncing contacts for provider ${providerId}`);

    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider || !provider.supportsContacts) {
      throw new BadRequestException('Provider not found or does not support contacts');
    }

    let syncedCount = 0;

    if (provider.providerType === 'google') {
      syncedCount = await this.googleContactsSync.syncContacts(providerId);
    } else if (provider.providerType === 'microsoft') {
      syncedCount = await this.microsoftContactsSync.syncContacts(providerId);
    }

    this.logger.log(`Synced ${syncedCount} contacts for provider ${providerId}`);
    return syncedCount;
  }
}
