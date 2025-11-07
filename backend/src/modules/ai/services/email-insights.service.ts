import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MistralService } from './mistral.service';
import { parseArrayFromAiPayload } from '../utils/ai-output.utils';

type LocaleKey = 'en' | 'it';

interface EmailRecord {
  id: string;
  subject: string | null;
  from: string;
  to: string[];
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
  receivedAt: Date;
}

@Injectable()
export class EmailInsightsService {
  private readonly logger = new Logger(EmailInsightsService.name);
  private readonly allowedLabels = [
    'Important',
    'Follow-up',
    'Action Items',
    'Info',
    'Personal',
    'Finance',
    'Promotions',
    'Updates',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly mistral: MistralService,
  ) {}

  async summarizeEmail(tenantId: string, emailId: string, locale?: string) {
    const email = await this.getEmailOrThrow(tenantId, emailId);
    const lang = this.resolveLocale(locale);
    const systemPrompt =
      lang === 'it'
        ? 'Sei un assistente che riassume email di lavoro. Rispondi con un breve riassunto (massimo 5 frasi) evidenziando intenti, richieste e prossimi passi.'
        : 'You are an assistant who summarizes business emails. Reply with a short summary (max 5 sentences) highlighting intent, requests, and next steps.';

    const userPrompt = this.buildEmailPrompt(email, lang);

    try {
      const summary = await this.mistral.completePrompt({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 400,
      });
      return summary.trim();
    } catch (error) {
      this.logger.error(`Failed to summarize email ${emailId}: ${this.getErrorMessage(error)}`);
      throw new BadRequestException('Unable to generate email summary');
    }
  }

  async generateSmartReplies(tenantId: string, emailId: string, locale?: string) {
    const email = await this.getEmailOrThrow(tenantId, emailId);
    const lang = this.resolveLocale(locale);

    const systemPrompt =
      lang === 'it'
        ? 'Genera da 2 a 3 possibili risposte brevi e professionali all’email. Rispondi in JSON nel formato {"replies":["..."]}.'
        : 'Generate 2-3 concise professional replies to the email. Respond in JSON format {"replies":["..."]}.';

    const userPrompt = this.buildEmailPrompt(email, lang);

    try {
      const raw = await this.mistral.completePrompt({
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        maxTokens: 500,
      });

      const suggestions = this.parseJsonArray(raw, 'replies') ?? this.extractLines(raw);

      if (!suggestions.length) {
        throw new Error('Empty smart replies');
      }

      return suggestions.slice(0, 3);
    } catch (error) {
      this.logger.error(
        `Failed to generate smart replies for email ${emailId}: ${this.getErrorMessage(error)}`,
      );
      throw new BadRequestException('Unable to generate smart replies');
    }
  }

  async categorizeEmail(tenantId: string, emailId: string, locale?: string) {
    const email = await this.getEmailOrThrow(tenantId, emailId);
    const lang = this.resolveLocale(locale);

    const labelsList = this.allowedLabels.join(', ');
    const systemPrompt =
      lang === 'it'
        ? `Suggerisci fino a 3 etichette dall'elenco [${labelsList}]. Rispondi in JSON: {"labels":["..."]}.`
        : `Suggest up to 3 labels from [${labelsList}]. Respond in JSON: {"labels":["..."]}.`;

    const userPrompt = this.buildEmailPrompt(email, lang);

    try {
      const raw = await this.mistral.completePrompt({
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 300,
      });

      let labels = this.parseJsonArray(raw, 'labels');
      if (!labels || labels.length === 0) {
        labels = this.guessLabelsFromText(raw);
      }

      if (!labels.length) {
        labels = ['Important'];
      }

      return Array.from(
        new Set(
          labels
            .map((label) => this.normaliseLabel(label))
            .filter((label) => this.allowedLabels.includes(label)),
        ),
      ).slice(0, 3);
    } catch (error) {
      this.logger.error(
        `Failed to categorize email ${emailId}: ${this.getErrorMessage(error)}`,
      );
      throw new BadRequestException('Unable to categorize email');
    }
  }

  private async getEmailOrThrow(tenantId: string, emailId: string): Promise<EmailRecord> {
    const email = await this.prisma.email.findFirst({
      where: { id: emailId, tenantId },
      select: {
        id: true,
        subject: true,
        from: true,
        to: true,
        bodyText: true,
        bodyHtml: true,
        snippet: true,
        receivedAt: true,
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return email;
  }

  private buildEmailPrompt(email: EmailRecord, locale: LocaleKey): string {
    const toList = email.to.join(', ');
    const header =
      locale === 'it'
        ? `Oggetto: ${email.subject || '(senza oggetto)'}\nDa: ${email.from}\nA: ${toList}`
        : `Subject: ${email.subject || '(no subject)'}\nFrom: ${email.from}\nTo: ${toList}`;

    const content = this.extractEmailContent(email);

    return `${header}\n\n${locale === 'it' ? 'Testo email:' : 'Email body:'}\n${content}`;
  }

  private extractEmailContent(email: EmailRecord): string {
    if (email.bodyText && email.bodyText.trim().length > 0) {
      return this.truncate(email.bodyText.trim());
    }

    if (email.bodyHtml) {
      const text = email.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 0) {
        return this.truncate(text);
      }
    }

    if (email.snippet) {
      return this.truncate(email.snippet.trim());
    }

    return '(content unavailable)';
  }

  private stripCodeFences(payload: string): string {
    return payload.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  private tryParseArray(text: string, key: string): string[] | null {
    try {
      const parsed = JSON.parse(text);
      const value = parsed?.[key];
      if (Array.isArray(value)) {
        return value
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
      }
      return null;
    } catch {
      return null;
    }
  }

  private extractFirstJsonObject(payload: string): string | null {
    const stripped = this.stripCodeFences(payload);
    let depth = 0;
    let start = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < stripped.length; i += 1) {
      const char = stripped[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{') {
        if (depth === 0) start = i;
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          return stripped.slice(start, i + 1);
        }
      }
    }
    return null;
  }

  private parseJsonArray(payload: string, key: string): string[] | null {
    const stripped = this.stripCodeFences(payload);
    const direct = this.tryParseArray(stripped, key);
    if (direct?.length) {
      return direct;
    }

    const jsonBlock = this.extractFirstJsonObject(stripped);
    if (jsonBlock) {
      const blockResult = this.tryParseArray(jsonBlock, key);
      if (blockResult?.length) {
        return blockResult;
      }
    }
    return null;
  }

  private extractLines(payload: string): string[] {
    return payload
      .split(/\n+/)
      .map((line) => line.replace(/^[\-\*\d.\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  private guessLabelsFromText(payload: string): string[] {
    const lowered = payload.toLowerCase();
    return this.allowedLabels.filter((label) => lowered.includes(label.toLowerCase()));
  }

  private normaliseLabel(label: string): string {
    const trimmed = label.trim().toLowerCase();
    const found = this.allowedLabels.find(
      (item) => item.toLowerCase() === trimmed || item.toLowerCase().includes(trimmed),
    );
    return found ?? label.trim();
  }

  private resolveLocale(locale?: string): LocaleKey {
    return locale && locale.toLowerCase().startsWith('it') ? 'it' : 'en';
  }

  private truncate(value: string, limit = 6000): string {
    return value.length > limit ? `${value.slice(0, limit)}...` : value;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

