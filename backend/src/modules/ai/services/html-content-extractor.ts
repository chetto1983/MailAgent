import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { Logger } from '@nestjs/common';

/**
 * Extracts clean, semantic content from HTML emails using Mozilla Readability.
 * This removes noise like headers, footers, tracking pixels, and other non-essential elements.
 */
export class HtmlContentExtractor {
  private static readonly logger = new Logger(HtmlContentExtractor.name);

  /**
   * Extracts the main content from HTML using Readability algorithm.
   * Falls back to basic HTML stripping if Readability fails.
   *
   * @param html - The raw HTML content
   * @returns Clean text content or null if extraction fails
   */
  static extractMainContent(html: string): string | null {
    if (!html || html.trim().length === 0) {
      return null;
    }

    try {
      // Create a DOM from the HTML
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Use Readability to extract the main content
      const reader = new Readability(document, {
        // Increase char threshold to be more lenient with email content
        charThreshold: 25,
        // Keep classes for better structure detection
        keepClasses: false,
      });

      const article = reader.parse();

      if (article && article.textContent) {
        // Clean up the extracted text
        const cleaned = this.cleanExtractedText(article.textContent);

        if (cleaned && cleaned.length > 0) {
          // Calculate total text in HTML (without tags) for more meaningful comparison
          const rawTextLength = this.fallbackStripHtml(html).length;
          const retentionPercent = rawTextLength > 0
            ? Math.round((cleaned.length / rawTextLength) * 100)
            : 0;

          this.logger.debug(
            `Readability extracted ${cleaned.length} chars from ${rawTextLength} chars total text (${retentionPercent}% retained, HTML was ${html.length} chars)`
          );
          return cleaned;
        }
      }

      // If Readability didn't extract anything meaningful, fall back to basic stripping
      this.logger.debug('Readability extraction yielded no content, falling back to basic HTML stripping');
      return this.fallbackStripHtml(html);
    } catch (error) {
      this.logger.warn(
        `Failed to extract content with Readability: ${error instanceof Error ? error.message : String(error)}. Using fallback.`
      );
      return this.fallbackStripHtml(html);
    }
  }

  /**
   * Cleans up extracted text by normalizing whitespace and removing excessive newlines
   */
  private static cleanExtractedText(text: string): string {
    return text
      // Normalize multiple newlines to max 2
      .replace(/\n{3,}/g, '\n\n')
      // Normalize spaces (but preserve single newlines)
      .replace(/[^\S\n]+/g, ' ')
      // Remove leading/trailing whitespace from each line
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
  }

  /**
   * Fallback method that simply strips HTML tags
   */
  private static fallbackStripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
