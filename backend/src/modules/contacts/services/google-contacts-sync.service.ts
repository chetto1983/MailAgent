import { Injectable, Logger } from '@nestjs/common';
import { google, people_v1 } from 'googleapis';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';

export interface GoogleContactsSyncResult {
  success: boolean;
  providerId: string;
  contactsProcessed: number;
  newContacts: number;
  updatedContacts: number;
  deletedContacts: number;
  syncDuration: number;
}

@Injectable()
export class GoogleContactsSyncService {
  private readonly logger = new Logger(GoogleContactsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly googleOAuth: GoogleOAuthService,
  ) {}

  /**
   * Sync contacts from Google People API
   */
  async syncContacts(providerId: string): Promise<number> {
    const startTime = Date.now();
    this.logger.log(`Starting Google Contacts sync for provider ${providerId}`);

    try {
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.supportsContacts) {
        throw new Error('Provider not found or does not support contacts');
      }

      const accessToken = await this.getAccessToken(provider);
      const peopleService = this.createPeopleClient(accessToken);

      let contactsProcessed = 0;
      let newContacts = 0;
      let updatedContacts = 0;
      let pageToken: string | undefined;

      do {
        const response = await peopleService.people.connections.list({
          resourceName: 'people/me',
          pageSize: 100,
          pageToken,
          personFields:
            'names,emailAddresses,phoneNumbers,organizations,addresses,birthdays,photos,biographies,urls',
        });

        const connections = response.data.connections || [];

        for (const person of connections) {
          try {
            await this.processContact(provider, person);
            contactsProcessed++;

            const existingContact = await this.prisma.contact.findFirst({
              where: {
                providerId: provider.id,
                externalId: person.resourceName!,
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

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      const syncDuration = Date.now() - startTime;
      this.logger.log(
        `Google Contacts sync completed for provider ${providerId}: ${contactsProcessed} contacts processed (${newContacts} new, ${updatedContacts} updated) in ${syncDuration}ms`,
      );

      return contactsProcessed;
    } catch (error: any) {
      this.logger.error(`Google Contacts sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a single contact from Google People API
   */
  private async processContact(
    provider: any,
    person: people_v1.Schema$Person,
  ): Promise<void> {
    const externalId = person.resourceName!;

    // Extract contact data
    const names = person.names?.[0];
    const emails = person.emailAddresses?.map((email) => ({
      value: email.value,
      type: email.type || 'other',
      primary: email.metadata?.primary || false,
    }));

    const phoneNumbers = person.phoneNumbers?.map((phone) => ({
      value: phone.value,
      type: phone.type || 'other',
      primary: phone.metadata?.primary || false,
    }));

    const organization = person.organizations?.[0];
    const photoUrl = person.photos?.[0]?.url;
    const birthday = person.birthdays?.[0]?.date
      ? new Date(
          person.birthdays[0].date.year || 1900,
          (person.birthdays[0].date.month || 1) - 1,
          person.birthdays[0].date.day || 1,
        )
      : null;

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
        firstName: names?.givenName,
        lastName: names?.familyName,
        displayName: names?.displayName,
        middleName: names?.middleName,
        prefix: names?.honorificPrefix,
        suffix: names?.honorificSuffix,
        emails: emails as any,
        phoneNumbers: phoneNumbers as any,
        company: organization?.name,
        jobTitle: organization?.title,
        department: organization?.department,
        birthday,
        photoUrl,
        notes: person.biographies?.[0]?.value,
        metadata: person as any,
        lastSyncedAt: new Date(),
      },
      update: {
        firstName: names?.givenName,
        lastName: names?.familyName,
        displayName: names?.displayName,
        middleName: names?.middleName,
        prefix: names?.honorificPrefix,
        suffix: names?.honorificSuffix,
        emails: emails as any,
        phoneNumbers: phoneNumbers as any,
        company: organization?.name,
        jobTitle: organization?.title,
        department: organization?.department,
        birthday,
        photoUrl,
        notes: person.biographies?.[0]?.value,
        metadata: person as any,
        lastSyncedAt: new Date(),
        syncVersion: { increment: 1 },
        isDeleted: false,
      },
    });
  }

  /**
   * Create a new contact in Google
   */
  async createContact(providerId: string, data: any): Promise<{ id: string }> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const accessToken = await this.getAccessToken(provider);
    const peopleService = this.createPeopleClient(accessToken);

    const person: people_v1.Schema$Person = {
      names: [
        {
          givenName: data.firstName,
          familyName: data.lastName,
          displayName: data.displayName,
        },
      ],
      emailAddresses: data.emails?.map((email: any) => ({
        value: email.value,
        type: email.type || 'other',
      })),
      phoneNumbers: data.phoneNumbers?.map((phone: any) => ({
        value: phone.value,
        type: phone.type || 'other',
      })),
      organizations: data.company
        ? [
            {
              name: data.company,
              title: data.jobTitle,
            },
          ]
        : undefined,
      biographies: data.notes ? [{ value: data.notes }] : undefined,
    };

    const response = await peopleService.people.createContact({
      requestBody: person,
    });

    return { id: response.data.resourceName! };
  }

  /**
   * Update a contact in Google
   */
  async updateContact(providerId: string, externalId: string, data: any): Promise<void> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const accessToken = await this.getAccessToken(provider);
    const peopleService = this.createPeopleClient(accessToken);

    const person: people_v1.Schema$Person = {
      names: data.firstName || data.lastName
        ? [
            {
              givenName: data.firstName,
              familyName: data.lastName,
              displayName: data.displayName,
            },
          ]
        : undefined,
      emailAddresses: data.emails?.map((email: any) => ({
        value: email.value,
        type: email.type || 'other',
      })),
      phoneNumbers: data.phoneNumbers?.map((phone: any) => ({
        value: phone.value,
        type: phone.type || 'other',
      })),
      organizations: data.company
        ? [
            {
              name: data.company,
              title: data.jobTitle,
            },
          ]
        : undefined,
      biographies: data.notes ? [{ value: data.notes }] : undefined,
    };

    await peopleService.people.updateContact({
      resourceName: externalId,
      updatePersonFields:
        'names,emailAddresses,phoneNumbers,organizations,biographies',
      requestBody: person,
    });
  }

  /**
   * Delete a contact from Google
   */
  async deleteContact(providerId: string, externalId: string): Promise<void> {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const accessToken = await this.getAccessToken(provider);
    const peopleService = this.createPeopleClient(accessToken);

    await peopleService.people.deleteContact({
      resourceName: externalId,
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

      const refreshed = await this.googleOAuth.refreshAccessToken(refreshToken);

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

  /**
   * Create Google People API client
   */
  private createPeopleClient(accessToken: string): people_v1.People {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    return google.people({ version: 'v1', auth: oauth2Client });
  }
}
