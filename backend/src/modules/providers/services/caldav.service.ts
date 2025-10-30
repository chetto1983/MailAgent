import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createDAVClient } from 'tsdav';

@Injectable()
export class CalDavService {
  private readonly logger = new Logger(CalDavService.name);

  /**
   * Test CalDAV connection
   */
  async testCalDavConnection(config: {
    url: string;
    username: string;
    password: string;
  }): Promise<boolean> {
    try {
      const client = await this.createClient(config);

      // Try to fetch calendars
      const calendars = await client.fetchCalendars();

      this.logger.log(`CalDAV connection test successful. Found ${calendars.length} calendars`);
      return true;
    } catch (error) {
      this.logger.error('CalDAV connection test failed:', error);
      return false;
    }
  }

  /**
   * Test CardDAV connection
   */
  async testCardDavConnection(config: {
    url: string;
    username: string;
    password: string;
  }): Promise<boolean> {
    try {
      const client = await this.createClient(config);

      // Try to fetch address books
      const addressBooks = await client.fetchAddressBooks();

      this.logger.log(`CardDAV connection test successful. Found ${addressBooks.length} address books`);
      return true;
    } catch (error) {
      this.logger.error('CardDAV connection test failed:', error);
      return false;
    }
  }

  /**
   * Create DAV client instance
   */
  async createClient(config: {
    url: string;
    username: string;
    password: string;
  }): Promise<any> {
    try {
      const client = await createDAVClient({
        serverUrl: config.url,
        credentials: {
          username: config.username,
          password: config.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });

      return client;
    } catch (error) {
      this.logger.error('Failed to create DAV client:', error);
      throw new UnauthorizedException('Failed to create DAV client');
    }
  }

  /**
   * List calendars from CalDAV server
   */
  async listCalendars(config: {
    url: string;
    username: string;
    password: string;
  }): Promise<Array<{ displayName: string; url: string }>> {
    try {
      const client = await this.createClient(config);

      const calendars = await client.fetchCalendars();

      return calendars.map((calendar: any) => ({
        displayName: (typeof calendar.displayName === 'string' ? calendar.displayName : 'Unnamed Calendar') || 'Unnamed Calendar',
        url: calendar.url,
      }));
    } catch (error) {
      this.logger.error('Failed to list CalDAV calendars:', error);
      throw new UnauthorizedException('Failed to list CalDAV calendars');
    }
  }

  /**
   * List address books from CardDAV server
   */
  async listAddressBooks(config: {
    url: string;
    username: string;
    password: string;
  }): Promise<Array<{ displayName: string; url: string }>> {
    try {
      const client = await this.createClient(config);

      const addressBooks = await client.fetchAddressBooks();

      return addressBooks.map((addressBook: any) => ({
        displayName: (typeof addressBook.displayName === 'string' ? addressBook.displayName : 'Unnamed Address Book') || 'Unnamed Address Book',
        url: addressBook.url,
      }));
    } catch (error) {
      this.logger.error('Failed to list CardDAV address books:', error);
      throw new UnauthorizedException('Failed to list CardDAV address books');
    }
  }
}
