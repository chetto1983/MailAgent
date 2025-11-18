/**
 * IMAP Email Provider
 *
 * Attualmente fornisce una superficie coerente con IEmailProvider ma demanda le
 * operazioni reali all'integrazione futura (manca configurazione host/porta).
 * Espone errori typed invece di throw generici per una migliore DX.
 */

import { BaseEmailProvider } from '../base/base-email-provider';
import {
  Draft,
  DraftData,
  EmailAttachment,
  EmailMessage,
  IEmailProvider,
  Label,
  ListEmailsParams,
  ListEmailsResponse,
  ProviderConfig,
  ProviderError,
  SendEmailData,
  SyncOptions,
  SyncResult,
  ThreadResponse,
  UserInfo,
} from '../interfaces/email-provider.interface';

export class ImapEmailProvider extends BaseEmailProvider implements IEmailProvider {
  readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    super(ImapEmailProvider.name);
    this.config = config;
    this.logger.log(`ImapEmailProvider initialized for user ${config.userId}`);
  }

  // ==================== User & Authentication ====================

  async getUserInfo(): Promise<UserInfo> {
    return {
      email: this.config.email,
      name: this.config.email.split('@')[0],
    };
  }

  async refreshToken(): Promise<{ accessToken: string; expiresAt: Date }> {
    throw new ProviderError('IMAP provider does not support token refresh', 'NOT_SUPPORTED', 'imap');
  }

  async revokeToken(): Promise<boolean> {
    return false;
  }

  // ==================== Thread Operations ====================

  async getThread(_threadId: string, _includeMessages?: boolean): Promise<ThreadResponse> {
    throw new ProviderError('IMAP thread retrieval not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  async listThreads(_params: ListEmailsParams): Promise<ListEmailsResponse> {
    throw new ProviderError('IMAP listing not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  async deleteThreads(_threadIds: string[]): Promise<void> {
    throw new ProviderError('IMAP delete not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  // ==================== Message Operations ====================

  async getMessage(_messageId: string): Promise<EmailMessage> {
    throw new ProviderError('IMAP getMessage not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  async sendEmail(_data: SendEmailData): Promise<{ id: string }> {
    throw new ProviderError('IMAP sendEmail not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  // ==================== Draft Operations ====================

  async createDraft(_data: DraftData): Promise<{ id: string }> {
    throw new ProviderError('IMAP drafts not supported', 'NOT_SUPPORTED', 'imap');
  }

  async getDraft(_draftId: string): Promise<Draft> {
    throw new ProviderError('IMAP drafts not supported', 'NOT_SUPPORTED', 'imap');
  }

  async updateDraft(_draftId: string, _data: DraftData): Promise<void> {
    throw new ProviderError('IMAP drafts not supported', 'NOT_SUPPORTED', 'imap');
  }

  async deleteDraft(_draftId: string): Promise<void> {
    throw new ProviderError('IMAP drafts not supported', 'NOT_SUPPORTED', 'imap');
  }

  async sendDraft(_draftId: string): Promise<{ id: string }> {
    throw new ProviderError('IMAP drafts not supported', 'NOT_SUPPORTED', 'imap');
  }

  async listDrafts(): Promise<{ drafts: Draft[]; nextPageToken?: string }> {
    throw new ProviderError('IMAP drafts not supported', 'NOT_SUPPORTED', 'imap');
  }

  // ==================== Attachment Operations ====================

  async getAttachment(_messageId: string, _attachmentId: string): Promise<string> {
    throw new ProviderError('IMAP attachments not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  async getMessageAttachments(_messageId: string): Promise<EmailAttachment[]> {
    throw new ProviderError('IMAP attachments not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  // ==================== Label/Folder Operations ====================

  async getLabels(): Promise<Label[]> {
    throw new ProviderError('IMAP labels not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  async getLabel(_labelId: string): Promise<Label> {
    throw new ProviderError('IMAP labels not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  async createLabel(): Promise<{ id: string }> {
    throw new ProviderError('IMAP does not support creating labels', 'NOT_SUPPORTED', 'imap');
  }

  async updateLabel(): Promise<void> {
    throw new ProviderError('IMAP does not support updating labels', 'NOT_SUPPORTED', 'imap');
  }

  async deleteLabel(): Promise<void> {
    throw new ProviderError('IMAP does not support deleting labels', 'NOT_SUPPORTED', 'imap');
  }

  async modifyLabels(): Promise<void> {
    throw new ProviderError('IMAP labels not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  // ==================== Read/Unread Operations ====================

  async markAsRead(_threadIds: string[]): Promise<void> {
    throw new ProviderError('IMAP markAsRead not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  async markAsUnread(_threadIds: string[]): Promise<void> {
    throw new ProviderError('IMAP markAsUnread not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  // ==================== Sync Operations ====================

  async syncEmails(_options: SyncOptions): Promise<SyncResult> {
    throw new ProviderError('IMAP sync not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  // ==================== Utility Methods ====================

  normalizeIds(ids: string[]): { threadIds: string[] } {
    return { threadIds: ids };
  }

  async getEmailCount(): Promise<Array<{ label: string; count: number }>> {
    throw new ProviderError('IMAP getEmailCount not implemented', 'NOT_IMPLEMENTED', 'imap');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getUserInfo();
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }
}
