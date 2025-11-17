import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { URLSearchParams } from 'url';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { MicrosoftOAuthService } from '../../providers/services/microsoft-oauth.service';
import { SyncJobData, SyncJobResult } from '../interfaces/sync-job.interface';
import { EmailEmbeddingJob, EmailEmbeddingQueueService } from '../../ai/services/email-embedding.queue';
import { EmbeddingsService } from '../../ai/services/embeddings.service';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { EmailEventReason } from '../../realtime/types/realtime.types';
import { ConfigService } from '@nestjs/config';

interface MicrosoftMessage {
  id: string;
  subject: string;
  from: { emailAddress: { address: string; name: string } };
  toRecipients: { emailAddress: { address: string; name: string } }[];
  receivedDateTime: string;
  isRead: boolean;
}

interface MicrosoftDeltaResponse<T = Partial<MicrosoftMessage>> {
  value?: T[];
  '@odata.deltaLink'?: string;
  '@odata.nextLink'?: string;
}

type MicrosoftDeltaItem = Partial<MicrosoftMessage> & {
  id?: string;
  '@removed'?: {
    reason?: string;
  };
};

type MicrosoftSyncMode = 'delta' | 'timestamp';

interface MicrosoftIncrementalDeltaResult {
  messagesProcessed: number;
  newMessages: number;
  newDeltaLink: string;
  latestReceivedDate?: string;
}

interface MicrosoftIncrementalTimestampResult {
  messagesProcessed: number;
  newMessages: number;
  newTimestamp: string;
}

interface MicrosoftFullSyncInitResult {
  messagesProcessed: number;
  newMessages: number;
  syncToken: string;
  mode: MicrosoftSyncMode;
  latestTimestamp?: string;
}

@Injectable()
export class MicrosoftSyncService implements OnModuleInit {
  private readonly logger = new Logger(MicrosoftSyncService.name);
  private readonly GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
  private BATCH_FETCH_SIZE = 20;
  private suppressMessageEvents = false;
  private RETRY_ON_429_DELAY_MS = 2000;
  private RETRY_ON_5XX_DELAY_MS = 2000;
  private RETRY_MAX_ATTEMPTS = 3;

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private microsoftOAuth: MicrosoftOAuthService,
    private emailEmbeddingQueue: EmailEmbeddingQueueService,
    private embeddingsService: EmbeddingsService,
    private realtimeEvents: RealtimeEventsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.BATCH_FETCH_SIZE = this.config.get<number>('MS_BATCH_FETCH_SIZE', 20);
    this.suppressMessageEvents = this.config.get<boolean>('REALTIME_SUPPRESS_MESSAGE_EVENTS', false);
    this.RETRY_ON_429_DELAY_MS = this.config.get<number>('MS_RETRY_429_DELAY_MS', 2000);
    this.RETRY_ON_5XX_DELAY_MS = this.config.get<number>('MS_RETRY_5XX_DELAY_MS', 2000);
    this.RETRY_MAX_ATTEMPTS = this.config.get<number>('MS_RETRY_MAX_ATTEMPTS', 3);
  }

  async syncProvider(jobData: SyncJobData): Promise<SyncJobResult> {
    const { providerId, email, syncType, lastSyncedAt } = jobData;

    this.logger.log(`Starting ${syncType} Microsoft sync for ${email}`);

    try {
      // Get provider config
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        throw new Error('Provider not found');
      }

      // Get valid access token (refresh + persist if needed)
      const accessToken = await this.microsoftOAuth.getTokenOrRefresh(provider);

      // Get tracking metadata
      const metadata = (provider.metadata as any) || {};
      const lastDeltaLink =
        typeof metadata.lastSyncToken === 'string' ? (metadata.lastSyncToken as string) : undefined;
      const deltaMode: MicrosoftSyncMode | undefined = metadata.microsoftDeltaMode;
      const lastTimestamp =
        typeof metadata.microsoftLastSyncTimestamp === 'string'
          ? (metadata.microsoftLastSyncTimestamp as string)
          : undefined;
      const lastSyncedIso = this.normalizeTimestamp(lastSyncedAt);

      let messagesProcessed = 0;
      let newMessages = 0;
      let metadataUpdates: Record<string, any> = {};
      let incrementalHandled = false;
      let shouldRunFull = syncType === 'full';

      if (!shouldRunFull && syncType === 'incremental') {
        const canUseDelta =
          deltaMode !== 'timestamp' &&
          !!lastDeltaLink &&
          lastDeltaLink.includes('graph.microsoft.com');

        if (canUseDelta) {
          this.logger.log(`Using incremental delta sync for ${email}`);

          try {
            const deltaResult = await this.syncIncremental(
              accessToken,
              lastDeltaLink,
              providerId,
              provider.tenantId,
            );

            messagesProcessed = deltaResult.messagesProcessed;
            newMessages = deltaResult.newMessages;
            metadataUpdates = {
              lastSyncToken: deltaResult.newDeltaLink,
              microsoftDeltaMode: 'delta' as MicrosoftSyncMode,
            };

            if (deltaResult.latestReceivedDate) {
              metadataUpdates.microsoftLastSyncTimestamp = deltaResult.latestReceivedDate;
            }

            incrementalHandled = true;
          } catch (deltaError) {
            if (this.isDeltaUnsupportedError(deltaError)) {
              this.logger.warn(
                `Microsoft delta sync is not supported for ${email}; switching to timestamp-based incremental sync.`,
              );
              incrementalHandled = false; // will try timestamp mode below
              shouldRunFull = false;
            } else {
              this.logger.warn(
                `Delta sync failed for ${email}, fallback to timestamp/full: ${
                  deltaError instanceof Error ? deltaError.message : String(deltaError)
                }`,
              );
              incrementalHandled = false;
              shouldRunFull = false;
              // Reset delta link to force re-initialization on next full
              metadataUpdates = {
                ...metadataUpdates,
                lastSyncToken: undefined,
                microsoftDeltaMode: 'timestamp',
              };
            }
          }
        }

        if (!shouldRunFull && !incrementalHandled) {
          const sinceTimestamp =
            lastTimestamp ||
            (lastDeltaLink && !lastDeltaLink.includes('graph.microsoft.com')
              ? lastDeltaLink
              : lastSyncedIso);

          if (sinceTimestamp) {
            this.logger.log(`Using incremental timestamp sync for ${email} since ${sinceTimestamp}`);

            const timestampResult = await this.syncIncrementalByTimestamp(
              accessToken,
              sinceTimestamp,
              providerId,
              provider.tenantId,
            );

            messagesProcessed = timestampResult.messagesProcessed;
            newMessages = timestampResult.newMessages;
            metadataUpdates = {
              lastSyncToken: timestampResult.newTimestamp,
              microsoftDeltaMode: 'timestamp' as MicrosoftSyncMode,
              microsoftLastSyncTimestamp: timestampResult.newTimestamp,
            };

            incrementalHandled = true;
          } else {
            shouldRunFull = true;
          }
        }
      }

      if (!incrementalHandled) {
        this.logger.log(
          `Running full Microsoft sync for ${email} (this may take a while for large mailboxes)`,
        );

        const fullResult = await this.syncFullAndInitializeDelta(
          accessToken,
          email,
          providerId,
          provider.tenantId,
        );

        messagesProcessed = fullResult.messagesProcessed;
        newMessages = fullResult.newMessages;
        metadataUpdates = {
          lastSyncToken: fullResult.syncToken,
          microsoftDeltaMode: fullResult.mode,
        };

        if (fullResult.latestTimestamp) {
          metadataUpdates.microsoftLastSyncTimestamp = fullResult.latestTimestamp;
        }
      }

      if (this.suppressMessageEvents && messagesProcessed > 0) {
        this.realtimeEvents.emitEmailBatchProcessed(provider.tenantId, {
          providerId,
          processed: messagesProcessed,
          created: newMessages,
          syncType,
        });
        this.realtimeEvents.emitSyncStatus(provider.tenantId, {
          providerId,
          status: 'in_progress',
          processed: messagesProcessed,
        });
      }

      return {
        success: true,
        providerId,
        email,
        messagesProcessed,
        newMessages,
        syncDuration: 0, // Will be set by worker
        lastSyncToken: metadataUpdates.lastSyncToken,
        metadata: metadataUpdates,
      };
    } catch (error) {
      this.logger.error(`Microsoft sync failed for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Incremental sync using Microsoft Graph Delta API
   */
  private async syncIncremental(
    accessToken: string,
    deltaLink: string,
    providerId: string,
    tenantId: string,
  ): Promise<MicrosoftIncrementalDeltaResult> {
    this.logger.debug(`Incremental sync using deltaLink`);

    try {
      let nextLink: string | undefined = deltaLink;
      let newDeltaLink: string | undefined;
      let messagesProcessed = 0;
      let newMessages = 0;
      let latestReceivedDate: string | undefined;
      let page = 0;
      const maxPages = 25;

      while (nextLink) {
        if (page++ >= maxPages) {
          this.logger.warn(
            `Delta pagination exceeded ${maxPages} pages for provider ${providerId}; stop processing early.`,
          );
          break;
        }

        const response: AxiosResponse<MicrosoftDeltaResponse<MicrosoftDeltaItem>> =
          await axios.get<MicrosoftDeltaResponse<MicrosoftDeltaItem>>(nextLink, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

        const items = response.data.value ?? [];
        const toProcessIds: string[] = [];

        for (const item of items) {
          const messageId = item?.id;
          const itemReceived = item?.receivedDateTime;

          if (item && item['@removed']) {
            if (messageId) {
              await this.handleRemoteRemoval(providerId, tenantId, messageId);
              messagesProcessed++;
            }
            continue;
          }

          if (!messageId) {
            continue;
          }

          toProcessIds.push(messageId);

          if (itemReceived) {
            if (!latestReceivedDate) {
              latestReceivedDate = itemReceived;
            } else if (new Date(itemReceived).getTime() > new Date(latestReceivedDate).getTime()) {
              latestReceivedDate = itemReceived;
            }
          }
        }

        if (toProcessIds.length) {
          for (let i = 0; i < toProcessIds.length; i += this.BATCH_FETCH_SIZE) {
            const chunk = toProcessIds.slice(i, i + this.BATCH_FETCH_SIZE);
            const messages = await this.fetchMessagesBatch(accessToken, chunk);
            if (!messages.length) continue;
            const result = await this.processMessagesBatch(messages, providerId, tenantId);
            messagesProcessed += result.processed;
            newMessages += result.created;
          }
        }

        const delta = response.data['@odata.deltaLink'];
        const next = response.data['@odata.nextLink'];

        if (delta) {
          newDeltaLink = delta;
        }

        nextLink = next || undefined;

        if (!nextLink) {
          break;
        }
      }

      return {
        messagesProcessed,
        newMessages,
        newDeltaLink: newDeltaLink || deltaLink,
        latestReceivedDate,
      };
    } catch (error) {
      this.logger.error('Incremental sync error:', error);
      throw error;
    }
  }

  private async syncIncrementalByTimestamp(
    accessToken: string,
    sinceTimestamp: string,
    providerId: string,
    tenantId: string,
  ): Promise<MicrosoftIncrementalTimestampResult> {
    this.logger.debug(`Incremental sync using timestamp since ${sinceTimestamp}`);

    let sinceDate = new Date(sinceTimestamp);
    if (Number.isNaN(sinceDate.getTime())) {
      this.logger.warn(
        `Invalid timestamp "${sinceTimestamp}" provided for incremental sync; defaulting to epoch.`,
      );
      sinceDate = new Date(0);
    }
    const sinceIso = sinceDate.toISOString();

    const params = new URLSearchParams({
      $filter: `receivedDateTime ge ${sinceIso}`,
      $orderby: 'receivedDateTime asc',
      $top: '50',
    });

    let nextLink: string | undefined = `${this.GRAPH_API_BASE}/me/messages?${params.toString()}`;
    let page = 0;
    const maxPages = 25;

    let messagesProcessed = 0;
    let newMessages = 0;
    let latestTimestamp = sinceIso;
    const toProcessIds: string[] = [];

    while (nextLink) {
      if (page++ >= maxPages) {
        this.logger.warn(
          `Timestamp pagination exceeded ${maxPages} pages for provider ${providerId}; stopping early.`,
        );
        break;
      }

      const response: AxiosResponse<MicrosoftDeltaResponse<MicrosoftMessage>> =
        await axios.get<MicrosoftDeltaResponse<MicrosoftMessage>>(nextLink, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

      const messages = response.data.value ?? [];

      for (const message of messages) {
        if (!message?.id) {
          continue;
        }

        toProcessIds.push(message.id);

        if (message.receivedDateTime) {
          latestTimestamp = message.receivedDateTime;
        }
      }

      const next = response.data['@odata.nextLink'];
      nextLink = next || undefined;

      if (!nextLink) {
        break;
      }
    }

    if (toProcessIds.length) {
      for (let i = 0; i < toProcessIds.length; i += this.BATCH_FETCH_SIZE) {
        const chunk = toProcessIds.slice(i, i + this.BATCH_FETCH_SIZE);
        const messages = await this.fetchMessagesBatch(accessToken, chunk);
        if (!messages.length) continue;
        const result = await this.processMessagesBatch(messages, providerId, tenantId);
        messagesProcessed += result.processed;
        newMessages += result.created;
      }
    }

    if (messagesProcessed === 0 && newMessages === 0) {
      latestTimestamp = new Date().toISOString();
    }

    return {
      messagesProcessed,
      newMessages,
      newTimestamp: latestTimestamp,
    };
  }

  /**
   * Full sync - fetch messages from last 60 days (max 1000)
   */
  private async syncFull(
    accessToken: string,
    email: string,
    providerId: string,
    tenantId: string,
  ): Promise<{
    messagesProcessed: number;
    newMessages: number;
    latestReceivedDate?: string;
  }> {
    this.logger.debug('Full sync - fetching messages from last 60 days');

    try {
      // Calculate date 60 days ago
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sinceIso = sixtyDaysAgo.toISOString();

      this.logger.debug(`Fetching Microsoft messages since ${sinceIso}`);

      // Fetch messages from last 60 days with pagination (max 1000)
      const params = new URLSearchParams({
        $filter: `receivedDateTime ge ${sinceIso}`,
        $orderby: 'receivedDateTime desc',
        $top: '100', // Microsoft Graph API max per request
      });

      let messagesUrl: string | undefined = `${this.GRAPH_API_BASE}/me/messages?${params.toString()}`;
      let allMessages: MicrosoftMessage[] = [];
      let page = 0;
      const maxPages = 10; // 10 pages * 100 = max 1000 messages

      // Fetch all pages up to limit
      while (messagesUrl && page < maxPages) {
        const messagesResponse: AxiosResponse<MicrosoftDeltaResponse<MicrosoftMessage>> = await axios.get(messagesUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const messages: MicrosoftMessage[] = messagesResponse.data.value || [];
        allMessages = [...allMessages, ...messages];

        this.logger.debug(`Fetched page ${page + 1}: ${messages.length} messages (total: ${allMessages.length})`);

        // Check for next page
        messagesUrl = messagesResponse.data['@odata.nextLink'];
        page++;

        if (allMessages.length >= 1000) {
          break;
        }
      }

      this.logger.debug(`Found ${allMessages.length} Microsoft messages in last 60 days`);

      let messagesProcessed = 0;
      let newMessages = 0;

      const ids = allMessages.map((m) => m.id).filter((id): id is string => !!id);
      for (let i = 0; i < ids.length; i += this.BATCH_FETCH_SIZE) {
        const chunk = ids.slice(i, i + this.BATCH_FETCH_SIZE);
        if (!chunk.length) continue;

        const messages = await this.fetchMessagesBatch(accessToken, chunk);
        if (!messages.length) continue;

        const result = await this.processMessagesBatch(messages, providerId, tenantId);
        messagesProcessed += result.processed;
        newMessages += result.created;
      }

      const latestReceivedDate = allMessages.length > 0 ? allMessages[0].receivedDateTime : undefined;

      if (latestReceivedDate) {
        this.logger.debug(`Most recent message timestamp: ${latestReceivedDate}`);
      }

      return {
        messagesProcessed,
        newMessages,
        latestReceivedDate,
      };
    } catch (error) {
      this.logger.error('Full sync error:', error);
      throw error;
    }
  }

  private async syncFullAndInitializeDelta(
    accessToken: string,
    email: string,
    providerId: string,
    tenantId: string,
  ): Promise<MicrosoftFullSyncInitResult> {
    const fullResult = await this.syncFull(accessToken, email, providerId, tenantId);

    let syncToken: string;
    let mode: MicrosoftSyncMode = 'delta';
    let latestTimestamp = fullResult.latestReceivedDate;

    try {
      syncToken = await this.initializeDeltaLink(accessToken);
      this.logger.debug('Initialized Microsoft delta link after full sync');
    } catch (error) {
      mode = 'timestamp';
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.isDeltaUnsupportedError(error)) {
        this.logger.warn(
          'Microsoft account does not support change tracking; using timestamp fallback for incremental sync.',
        );
      } else {
        this.logger.warn(
          `Failed to initialize delta link via Microsoft Graph (reason: ${errorMessage}); falling back to timestamp tracking.`,
        );
      }

      if (!latestTimestamp) {
        latestTimestamp = new Date().toISOString();
      }
      syncToken = latestTimestamp;
    }

    return {
      messagesProcessed: fullResult.messagesProcessed,
      newMessages: fullResult.newMessages,
      syncToken,
      mode,
      latestTimestamp,
    };
  }

  private isDeltaUnsupportedError(error: any): boolean {
    const message: string | undefined =
      error?.response?.data?.error?.message || error?.message || error?.toString?.();
    const code: string | undefined = error?.response?.data?.error?.code;

    if (typeof message === 'string' && message.toLowerCase().includes('change tracking is not supported')) {
      return true;
    }

    if (typeof code === 'string' && code.toLowerCase().includes('changetracking')) {
      return true;
    }

    return false;
  }

  private normalizeTimestamp(timestamp?: Date | string): string | undefined {
    if (!timestamp) {
      return undefined;
    }

    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }

    return parsed.toISOString();
  }

  private async initializeDeltaLink(accessToken: string): Promise<string> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    let requestUrl = `${this.GRAPH_API_BASE}/me/messages/delta?$select=id&$top=50`;
    let page = 0;
    const maxPages = 50;

    while (true) {
      if (page++ >= maxPages) {
        throw new Error(
          `Delta initialization exceeded ${maxPages} pages without receiving a delta link`,
        );
      }

      const response: AxiosResponse<MicrosoftDeltaResponse> =
        await axios.get<MicrosoftDeltaResponse>(requestUrl, { headers });
      const deltaLink = response.data['@odata.deltaLink'];
      const nextLink = response.data['@odata.nextLink'];

      if (deltaLink) {
        return deltaLink;
      }

      if (!nextLink) {
        throw new Error('Delta initialization ended without delta or next links from Microsoft Graph');
      }

      requestUrl = nextLink;
    }
  }

  /**
   * Determine folder name from Microsoft folder ID
   */
  private async determineFolderFromParentId(
    parentFolderId: string | undefined,
    providerId: string,
    isDraft: boolean,
  ): Promise<string> {
    // Default fallback
    if (!parentFolderId) {
      return isDraft ? 'DRAFTS' : 'INBOX';
    }

    try {
      // Lookup folder in database
      const folder = await this.prisma.folder.findFirst({
        where: {
          providerId,
          path: parentFolderId,
        },
        select: {
          specialUse: true,
          name: true,
        },
      });

      if (!folder) {
        return isDraft ? 'DRAFTS' : 'INBOX';
      }

      // Use specialUse if available (already normalized to INBOX, SENT, TRASH, etc.)
      if (folder.specialUse) {
        return folder.specialUse.replace('\\', '').toUpperCase();
      }

      // Normalize Italian folder names to standard names
      const normalized = folder.name.toLowerCase().trim();
      if (normalized === 'posta in arrivo' || normalized === 'inbox') return 'INBOX';
      if (normalized === 'posta inviata' || normalized === 'sent' || normalized === 'inviata') return 'SENT';
      if (normalized === 'posta eliminata' || normalized === 'trash' || normalized === 'cestino' || normalized === 'eliminata') return 'TRASH';
      if (normalized === 'bozze' || normalized === 'draft' || normalized === 'drafts') return 'DRAFTS';
      if (normalized === 'posta indesiderata' || normalized === 'spam' || normalized === 'junk') return 'SPAM';
      if (normalized === 'archive' || normalized === 'archivia' || normalized === 'archivio') return 'ARCHIVE';
      if (normalized === 'posta in uscita' || normalized === 'outbox') return 'OUTBOX';

      // Return original name if no mapping found
      return folder.name.toUpperCase();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to determine folder from parentId ${parentFolderId}: ${errorMessage}`);
      return isDraft ? 'DRAFTS' : 'INBOX';
    }
  }

  private async fetchMessagesBatch(
    accessToken: string,
    ids: string[],
  ): Promise<any[]> {
    if (!ids.length) return [];

    const results: any[] = [];
    for (let i = 0; i < ids.length; i += this.BATCH_FETCH_SIZE) {
      const slice = ids.slice(i, i + this.BATCH_FETCH_SIZE);
      const requests = slice.map((id, idx) => ({
        id: `${idx}`,
        method: 'GET',
        url: `/me/messages/${id}`,
        headers: { 'Content-Type': 'application/json' },
      }));

      try {
        const resp = await this.msRequestWithRetry(() =>
          axios.post(
            `${this.GRAPH_API_BASE}/$batch`,
            { requests },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          ),
        );
        const responses = resp.data?.responses ?? [];
        responses.forEach((r: any) => {
          if (r?.status === 200 && r.body?.id) {
            results.push(r.body);
          }
        });
      } catch (error) {
        this.logger.warn(
          `Microsoft batch fetch failed for ${slice.length} ids, fallback to sequential: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        const sequential = await Promise.all(
          slice.map((id) =>
            axios
              .get(`${this.GRAPH_API_BASE}/me/messages/${id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              })
              .then((res) => res.data)
              .catch(() => null),
          ),
        );
        sequential.filter(Boolean).forEach((m) => results.push(m));
      }
    }

    return results;
  }

  private async parseMicrosoftMessage(
    message: any,
    providerId: string,
  ): Promise<{
    externalId: string;
    threadId?: string | null;
    messageIdHeader?: string | null;
    from: string;
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    bodyText: string;
    bodyHtml: string;
    snippet: string;
    folder: string;
    labels: string[];
    isRead: boolean;
    isStarred: boolean;
    isDeleted: boolean;
    sentAt: Date;
    receivedAt: Date;
    size?: number | null;
    metadataStatus: 'active' | 'deleted';
  } | null> {
    const externalId = message.id;
    if (!externalId) return null;

    const from = message.from?.emailAddress?.address || '';
    const to = (message.toRecipients || [])
      .map((r: any) => r.emailAddress?.address)
      .filter(Boolean);
    const cc = (message.ccRecipients || [])
      .map((r: any) => r.emailAddress?.address)
      .filter(Boolean);
    const bcc = (message.bccRecipients || [])
      .map((r: any) => r.emailAddress?.address)
      .filter(Boolean);

    const subject = message.subject || '(No Subject)';
    const bodyText = message.body?.contentType === 'text' ? message.body.content : '';
    const bodyHtml =
      message.body?.contentType === 'html' ? message.body.content : message.body?.content || '';
    const snippet = message.bodyPreview || bodyText.substring(0, 200);
    const sentAt = message.sentDateTime ? new Date(message.sentDateTime) : new Date();
    const receivedAt = message.receivedDateTime ? new Date(message.receivedDateTime) : new Date();
    const labels = message.categories || [];
    const isRead = !!message.isRead;
    const isStarred = message.flag?.flagStatus === 'flagged';
    const folder = await this.determineFolderFromParentId(
      message.parentFolderId,
      providerId,
      message.isDraft || false,
    );
    const isDeleted = folder === 'TRASH';

    return {
      externalId,
      threadId: message.conversationId,
      messageIdHeader: message.internetMessageId,
      from,
      to,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      snippet,
      folder,
      labels,
      isRead,
      isStarred,
      isDeleted,
      sentAt,
      receivedAt,
      size: message.size,
      metadataStatus: isDeleted ? 'deleted' : 'active',
    };
  }

  private async processParsedMessagesBatch(
    mapped: Array<NonNullable<Awaited<ReturnType<MicrosoftSyncService['parseMicrosoftMessage']>>>>,
    providerId: string,
    tenantId: string,
  ): Promise<{ processed: number; created: number }> {
    if (!mapped.length) return { processed: 0, created: 0 };

    const externalIds = mapped.map((m) => m.externalId);
    const existing = await this.prisma.email.findMany({
      where: {
        providerId,
        externalId: { in: externalIds },
      },
      select: {
        id: true,
        externalId: true,
        metadata: true,
      },
    });
    const existingMap = new Map(existing.map((e) => [e.externalId, e]));
    const creates = mapped.filter((m) => !existingMap.has(m.externalId));
    const updates = mapped.filter((m) => existingMap.has(m.externalId));

    if (creates.length) {
      await this.prisma.email.createMany({
        data: creates.map((m) => ({
          tenantId,
          providerId,
          externalId: m.externalId,
          threadId: m.threadId,
          messageId: m.messageIdHeader ?? undefined,
          inReplyTo: null,
          references: null,
          from: m.from,
          to: m.to,
          cc: m.cc,
          bcc: m.bcc,
          subject: m.subject,
          bodyText: m.bodyText,
          bodyHtml: m.bodyHtml,
          snippet: m.snippet,
          folder: m.folder,
          labels: m.labels,
          isRead: m.isRead,
          isStarred: m.isStarred,
          isDeleted: m.isDeleted,
          sentAt: m.sentAt,
          receivedAt: m.receivedAt,
          size: m.size,
          metadata: this.mergeEmailStatusMetadata(null, m.metadataStatus),
        })),
        skipDuplicates: true,
      });
    }

    if (updates.length) {
      await Promise.all(
        updates.map(async (m) => {
          const existingEmail = existingMap.get(m.externalId);
          if (!existingEmail) return;

          const metadata = this.mergeEmailStatusMetadata(
            existingEmail.metadata as Record<string, any> | null,
            m.metadataStatus,
          );

          await this.prisma.email.update({
            where: { id: existingEmail.id },
            data: {
              labels: m.labels,
              folder: m.folder,
              isRead: m.isRead,
              isStarred: m.isStarred,
              isDeleted: m.isDeleted,
              metadata,
            },
          });
        }),
      );
    }

    const persisted = await this.prisma.email.findMany({
      where: {
        providerId,
        externalId: { in: externalIds },
      },
      select: {
        id: true,
        externalId: true,
        receivedAt: true,
      },
    });
    const persistedMap = new Map(persisted.map((p) => [p.externalId, p]));

    const embeddingJobs: EmailEmbeddingJob[] = [];
    for (const m of mapped) {
      const persistedEmail = persistedMap.get(m.externalId);
      if (!persistedEmail) continue;

      const alreadyEmbedded = await this.embeddingsService.hasEmbeddingForEmail(
        tenantId,
        persistedEmail.id,
      );
      if (alreadyEmbedded) continue;

      embeddingJobs.push({
        tenantId,
        providerId,
        emailId: persistedEmail.id,
        subject: m.subject,
        snippet: m.snippet,
        bodyText: m.bodyText,
        bodyHtml: m.bodyHtml,
        from: m.from,
        receivedAt: persistedEmail.receivedAt,
      });
    }

    if (embeddingJobs.length) {
      await this.emailEmbeddingQueue.enqueueMany(embeddingJobs);
    }

    return { processed: mapped.length, created: creates.length };
  }

  private async processMessagesBatch(
    messages: any[],
    providerId: string,
    tenantId: string,
  ): Promise<{ processed: number; created: number }> {
    const parsed: Array<
      NonNullable<Awaited<ReturnType<MicrosoftSyncService['parseMicrosoftMessage']>>>
    > = [];

    for (const msg of messages) {
      const mapped = await this.parseMicrosoftMessage(msg, providerId);
      if (mapped) {
        parsed.push(mapped);
      }
    }

    return this.processParsedMessagesBatch(parsed, providerId, tenantId);
  }

  private async msRequestWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt < this.RETRY_MAX_ATTEMPTS) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const status =
          (error as any)?.response?.status ??
          (error as any)?.response?.statusCode ??
          (error as any)?.status ??
          (error as any)?.statusCode;

        attempt += 1;

        if (status === 429) {
          const delay = this.RETRY_ON_429_DELAY_MS * attempt;
          this.logger.warn(`Graph 429 on attempt ${attempt}/${this.RETRY_MAX_ATTEMPTS}, retry in ${delay}ms`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        if (status && status >= 500 && status < 600) {
          const delay = this.RETRY_ON_5XX_DELAY_MS * attempt;
          this.logger.warn(`Graph ${status} on attempt ${attempt}/${this.RETRY_MAX_ATTEMPTS}, retry in ${delay}ms`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Batch update read/unread state via Graph /$batch and reflect locally.
   */
  private async batchUpdateReadState(
    accessToken: string,
    providerId: string,
    tenantId: string,
    messageIds: string[],
    isRead: boolean,
  ): Promise<void> {
    if (!messageIds.length) return;

    const chunkSize = Math.min(this.BATCH_FETCH_SIZE, 20);
    for (let i = 0; i < messageIds.length; i += chunkSize) {
      const slice = messageIds.slice(i, i + chunkSize);
      const requests = slice.map((id, idx) => ({
        id: `${idx}`,
        method: 'PATCH',
        url: `/me/messages/${id}`,
        body: { isRead },
        headers: { 'Content-Type': 'application/json' },
      }));

      await this.msRequestWithRetry(() =>
        axios.post(
          `${this.GRAPH_API_BASE}/$batch`,
          { requests },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );

      await this.prisma.email.updateMany({
        where: {
          providerId,
          tenantId,
          externalId: { in: slice },
        },
        data: {
          isRead,
          metadata: this.mergeEmailStatusMetadata(null, 'active'),
        },
      });
    }
  }

  /**
   * Batch move messages to another folder via Graph /$batch and reflect locally.
   */
  private async batchMoveMessages(
    accessToken: string,
    providerId: string,
    tenantId: string,
    messageIds: string[],
    destinationFolderId: string,
    destinationFolderName?: string,
  ): Promise<void> {
    if (!messageIds.length || !destinationFolderId) return;

    const chunkSize = Math.min(this.BATCH_FETCH_SIZE, 20);
    for (let i = 0; i < messageIds.length; i += chunkSize) {
      const slice = messageIds.slice(i, i + chunkSize);
      const requests = slice.map((id, idx) => ({
        id: `${idx}`,
        method: 'POST',
        url: `/me/messages/${id}/move`,
        body: { destinationId: destinationFolderId },
        headers: { 'Content-Type': 'application/json' },
      }));

      await this.msRequestWithRetry(() =>
        axios.post(
          `${this.GRAPH_API_BASE}/$batch`,
          { requests },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );

      await this.prisma.email.updateMany({
        where: {
          providerId,
          tenantId,
          externalId: { in: slice },
        },
        data: {
          folder: destinationFolderName ?? destinationFolderId,
          metadata: this.mergeEmailStatusMetadata(null, 'active'),
        },
      });
    }
  }

  /**
   * Process a single Microsoft message
   */
  private async processMessage(
    messageId: string,
    accessToken: string,
    providerId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      const messages = await this.fetchMessagesBatch(accessToken, [messageId]);
      if (!messages.length) return false;

      const result = await this.processMessagesBatch(messages, providerId, tenantId);
      return result.processed > 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process Microsoft message ${messageId}: ${message}`);
      return false;
    }
  }

  private mergeEmailStatusMetadata(
    existing: Record<string, any> | null | undefined,
    status: 'deleted' | 'active',
  ): Record<string, any> {
    const metadata = { ...(existing ?? {}) };
    metadata.status = status;
    if (status === 'deleted') {
      if (!metadata.deletedAt) {
        metadata.deletedAt = new Date().toISOString();
      }
    } else if (metadata.deletedAt) {
      delete metadata.deletedAt;
    }
    return metadata;
  }

  private async handleRemoteRemoval(
    providerId: string,
    tenantId: string,
    externalId: string,
  ): Promise<void> {
    const affected = await this.prisma.email.findMany({
      where: {
        providerId,
        externalId,
      },
      select: {
        id: true,
      },
    });

    if (affected.length === 0) {
      return;
    }

    await this.prisma.email.updateMany({
      where: {
        providerId,
        externalId,
      },
      data: {
        isDeleted: true,
        folder: 'TRASH',
      },
    });

    for (const record of affected) {
      this.notifyMailboxChange(tenantId, providerId, 'message-deleted', {
        emailId: record.id,
        externalId,
      });
    }
  }

  /**
   * Sync Microsoft mail folders
   */
  async syncMicrosoftFolders(tenantId: string, providerId: string): Promise<void> {
    this.logger.log(`Starting Microsoft folder sync for provider ${providerId}`);

    try {
      // Get provider config
      const provider = await this.prisma.providerConfig.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.accessToken || !provider.tokenEncryptionIv) {
        throw new Error('Provider not found or missing access token');
      }

      // Decrypt access token
      const accessToken = this.crypto.decrypt(
        provider.accessToken,
        provider.tokenEncryptionIv,
      );

      // Fetch folders from Microsoft Graph
      const url = `${this.GRAPH_API_BASE}/me/mailFolders`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const folders = response.data.value || [];
      this.logger.log(`Found ${folders.length} Microsoft folders for provider ${providerId}`);

      // Get existing folders
      const existingFolders = await (this.prisma as any).folder.findMany({
        where: { providerId, tenantId },
      });

      const existingPaths = new Set(existingFolders.map((f: any) => f.path as string));
      const newPaths = new Set(folders.map((f: any) => f.id as string));

      // Delete folders that no longer exist
      const deletedPaths = Array.from(existingPaths).filter(
        (path) => !newPaths.has(path),
      );

      if (deletedPaths.length > 0) {
        this.logger.log(`Deleting ${deletedPaths.length} removed Microsoft folders`);
        await (this.prisma as any).folder.deleteMany({
          where: {
            providerId,
            path: { in: deletedPaths },
          },
        });
      }

      // Sync each folder
      for (const folder of folders) {
        if (!folder.id || !folder.displayName) continue;

        // Determine special use based on well-known folder names
        const specialUse = this.determineMicrosoftFolderType(folder.displayName);

        await (this.prisma as any).folder.upsert({
          where: {
            providerId_path: {
              providerId,
              path: folder.id,
            },
          },
          create: {
            tenantId,
            providerId,
            path: folder.id,
            name: folder.displayName,
            delimiter: '/',
            specialUse,
            isSelectable: true,
            totalCount: folder.totalItemCount || 0,
            unreadCount: folder.unreadItemCount || 0,
            level: folder.parentFolderId ? 1 : 0,
          },
          update: {
            name: folder.displayName,
            specialUse,
            totalCount: folder.totalItemCount || 0,
            unreadCount: folder.unreadItemCount || 0,
            lastSyncedAt: new Date(),
          },
        });
      }

      this.logger.log(`Synced ${folders.length} Microsoft folders for provider ${providerId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error syncing Microsoft folders for provider ${providerId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Determine folder type from Microsoft folder name
   */
  private determineMicrosoftFolderType(folderName: string): string | undefined {
    const lowerName = folderName.toLowerCase();

    // Well-known Microsoft folder names
    if (lowerName === 'inbox') return 'INBOX';
    if (lowerName === 'sent items' || lowerName === 'sentitems') return 'SENT';
    if (lowerName === 'drafts') return 'DRAFTS';
    if (lowerName === 'deleted items' || lowerName === 'deleteditems' || lowerName === 'trash') return 'TRASH';
    if (lowerName === 'junk email' || lowerName === 'junk' || lowerName === 'spam') return 'JUNK';
    if (lowerName === 'archive') return 'ARCHIVE';
    if (lowerName === 'outbox') return undefined; // Outbox is temporary

    return undefined;
  }

  private notifyMailboxChange(
    tenantId: string,
    providerId: string,
    reason: EmailEventReason,
    payload?: { emailId?: string; externalId?: string; folder?: string },
  ): void {
    try {
      const eventPayload = {
        providerId,
        reason,
        ...payload,
      };

      if (
        this.suppressMessageEvents &&
        (reason === 'message-processed' || reason === 'labels-updated' || reason === 'message-deleted')
      ) {
        return;
      }

      switch (reason) {
        case 'message-processed':
          this.realtimeEvents.emitEmailNew(tenantId, eventPayload);
          break;
        case 'labels-updated':
          this.realtimeEvents.emitEmailUpdate(tenantId, eventPayload);
          break;
        case 'message-deleted':
          this.realtimeEvents.emitEmailDelete(tenantId, eventPayload);
          break;
        case 'sync-complete':
          this.realtimeEvents.emitSyncStatus(tenantId, {
            providerId,
            status: 'completed',
          });
          break;
        default:
          this.realtimeEvents.emitEmailUpdate(tenantId, eventPayload);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to emit Microsoft mailbox event: ${message}`);
    }
  }
}

