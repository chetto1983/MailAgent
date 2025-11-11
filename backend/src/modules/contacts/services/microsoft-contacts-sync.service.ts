import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';

export interface MicrosoftContactsSyncResult {
  success: boolean;
  providerId: string;
  contactsProcessed: number;
  newContacts: number;
  updatedContacts: number;
  deletedContacts: number;
  syncDuration: number;
}

@Injectable()
export class MicrosoftContactsSyncService {
  private readonly logger = new Logger(MicrosoftContactsSyncService.name);
  private readonly GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly microsoftOAuth: MicrosoftOAuthService,
  ) {}

  /**
   * Sync contacts from Microsoft Graph API
   */
  async syncContacts(providerId: string): Promise<number> {
    const startTime = Date.now();
    this.logger.log(`Starting Microsoft Contacts sync for provider ${providerId}`);

    try {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.supportsContacts) {
        throw new Error('Provider not found or does not support contacts');
      }

      const accessToken = await this.getAccessToken(provider);

      let contactsProcessed = 0;
      let newContacts = 0;
      let updatedContacts = 0;
      let nextLink: string | null = `${this.GRAPH_API_BASE}/me/contacts?$top=100`;

      do {
        const response: any = await axios.get(nextLink, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const contacts = response.data.value || [];

        for (const contact of contacts) {
          try {
            await this.processContact(provider, contact);
            contactsProcessed++;

            const existingContact = await this.prisma.contact.findFirst({
              where: {
                providerId: provider.id,
                externalId: contact.id,
              },
            });

            if (existingContact) {
              updatedContacts++;
            } else {
              newContacts++;
            }
          } catch (error: any) {
            this.logger.error(`Error processing contact: ${error.message}`);
          }
        }

        nextLink = response.data['@odata.nextLink'] || null;
      } while (nextLink);

      const syncDuration = Date.now() - startTime;
      this.logger.log(
        `Microsoft Contacts sync completed for provider ${providerId}: ${contactsProcessed} contacts processed (${newContacts} new, ${updatedContacts} updated) in ${syncDuration}ms`,
      );

      return contactsProcessed;
    } catch (error: any) {
      this.logger.error(`Microsoft Contacts sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a single contact from Microsoft Graph API
   */
  private async processContact(provider: any, contact: any): Promise<void> {
    const externalId = contact.id;

    // Extract email addresses
    const emails = contact.emailAddresses?.map((email: any) => ({
      value: email.address,
      type: email.name?.toLowerCase() || 'other',
      primary: false,
    }));

    // Extract phone numbers
    const phoneNumbers = [];
    if (contact.mobilePhone) {
      phoneNumbers.push({ value: contact.mobilePhone, type: 'mobile', primary: true });
    }
    if (contact.businessPhones) {
      contact.businessPhones.forEach((phone: string) => {
        phoneNumbers.push({ value: phone, type: 'work', primary: false });
      });
    }
    if (contact.homePhones) {
      contact.homePhones.forEach((phone: string) => {
        phoneNumbers.push({ value: phone, type: 'home', primary: false });
      });
    }

    // Extract addresses
    const addresses = [];
    if (contact.homeAddress) {
      addresses.push({
        street: contact.homeAddress.street,
        city: contact.homeAddress.city,
        state: contact.homeAddress.state,
        postalCode: contact.homeAddress.postalCode,
        country: contact.homeAddress.countryOrRegion,
        type: 'home',
      });
    }
    if (contact.businessAddress) {
      addresses.push({
        street: contact.businessAddress.street,
        city: contact.businessAddress.city,
        state: contact.businessAddress.state,
        postalCode: contact.businessAddress.postalCode,
        country: contact.businessAddress.countryOrRegion,
        type: 'work',
      });
    }

    // Extract birthday
    let birthday = null;
    if (contact.birthday) {
      try {
        birthday = new Date(contact.birthday);
      } catch {
        this.logger.warn(`Invalid birthday format: ${contact.birthday}`);
      }
    }

    // Upsert contact
    await this.prisma.contact.upsert({
      where: {
        providerId_externalId: {
          providerId: provider.id,
          externalId,
        },
      },
      create: {
        tenantId: provider.tenantId,
        providerId: provider.id,
        externalId,
        firstName: contact.givenName,
        lastName: contact.surname,
        displayName: contact.displayName,
        middleName: contact.middleName,
        nickname: contact.nickName,
        prefix: contact.title,
        emails: emails,
        phoneNumbers: phoneNumbers as any,
        addresses: addresses.length > 0 ? (addresses as any) : null,
        company: contact.companyName,
        jobTitle: contact.jobTitle,
        department: contact.department,
        birthday,
        notes: contact.personalNotes,
        metadata: contact,
        lastSyncedAt: new Date(),
      },
      update: {
        firstName: contact.givenName,
        lastName: contact.surname,
        displayName: contact.displayName,
        middleName: contact.middleName,
        nickname: contact.nickName,
        prefix: contact.title,
        emails: emails,
        phoneNumbers: phoneNumbers as any,
        addresses: addresses.length > 0 ? (addresses as any) : null,
        company: contact.companyName,
        jobTitle: contact.jobTitle,
        department: contact.department,
        birthday,
        notes: contact.personalNotes,
        metadata: contact,
        lastSyncedAt: new Date(),
        syncVersion: { increment: 1 },
        isDeleted: false,
      },
    });
  }

  /**
   * Create a new contact in Microsoft
   */
  async createContact(providerId: string, data: any): Promise<{ id: string }> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const accessToken = await this.getAccessToken(provider);

    const contact = {
      givenName: data.firstName,
      surname: data.lastName,
      displayName: data.displayName,
      emailAddresses: data.emails?.map((email: any) => ({
        address: email.value,
        name: email.type || 'other',
      })),
      mobilePhone: data.phoneNumbers?.find((p: any) => p.type === 'mobile')?.value,
      businessPhones: data.phoneNumbers
        ?.filter((p: any) => p.type === 'work')
        .map((p: any) => p.value),
      homePhones: data.phoneNumbers
        ?.filter((p: any) => p.type === 'home')
        .map((p: any) => p.value),
      companyName: data.company,
      jobTitle: data.jobTitle,
      personalNotes: data.notes,
    };

    const response = await axios.post(`${this.GRAPH_API_BASE}/me/contacts`, contact, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return { id: response.data.id };
  }

  /**
   * Update a contact in Microsoft
   */
  async updateContact(
    providerId: string,
    externalId: string,
    data: any,
  ): Promise<void> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const accessToken = await this.getAccessToken(provider);

    const contact: any = {};

    if (data.firstName) contact.givenName = data.firstName;
    if (data.lastName) contact.surname = data.lastName;
    if (data.displayName) contact.displayName = data.displayName;
    if (data.emails) {
      contact.emailAddresses = data.emails.map((email: any) => ({
        address: email.value,
        name: email.type || 'other',
      }));
    }
    if (data.phoneNumbers) {
      contact.mobilePhone = data.phoneNumbers.find((p: any) => p.type === 'mobile')
        ?.value;
      contact.businessPhones = data.phoneNumbers
        .filter((p: any) => p.type === 'work')
        .map((p: any) => p.value);
      contact.homePhones = data.phoneNumbers
        .filter((p: any) => p.type === 'home')
        .map((p: any) => p.value);
    }
    if (data.company) contact.companyName = data.company;
    if (data.jobTitle) contact.jobTitle = data.jobTitle;
    if (data.notes) contact.personalNotes = data.notes;

    await axios.patch(`${this.GRAPH_API_BASE}/me/contacts/${externalId}`, contact, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Delete a contact from Microsoft
   */
  async deleteContact(providerId: string, externalId: string): Promise<void> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const accessToken = await this.getAccessToken(provider);

    await axios.delete(`${this.GRAPH_API_BASE}/me/contacts/${externalId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  /**
   * Get access token, refresh if needed
   */
  private async getAccessToken(provider: any): Promise<string> {
    const now = new Date();
    const isExpired = provider.tokenExpiresAt && now > new Date(provider.tokenExpiresAt);

    if (isExpired && provider.refreshToken && provider.refreshTokenEncryptionIv) {
      this.logger.log(`Access token expired for provider ${provider.id}, refreshing...`);

      const refreshToken = this.crypto.decrypt(
        provider.refreshToken,
        provider.refreshTokenEncryptionIv,
      );

      const refreshed = await this.microsoftOAuth.refreshAccessToken(refreshToken);

      const encryptedAccess = this.crypto.encrypt(refreshed.accessToken);
      await this.prisma.providerConfig.update({
        where: { id: provider.id },
        data: {
          accessToken: encryptedAccess.encrypted,
          tokenEncryptionIv: encryptedAccess.iv,
          tokenExpiresAt: refreshed.expiresAt,
        },
      });

      return refreshed.accessToken;
    } else if (!provider.accessToken || !provider.tokenEncryptionIv) {
      throw new Error('Provider missing access token');
    } else {
      return this.crypto.decrypt(provider.accessToken, provider.tokenEncryptionIv);
    }
  }
}
