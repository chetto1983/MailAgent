/**
 * Mock for jsdom to avoid ESM module issues in Jest
 */

class MockDocument {
  documentElement: any;
  body: any;
  head: any;

  constructor(html: string) {
    // Simple HTML parsing mock
    this.documentElement = {
      outerHTML: html,
      innerHTML: html,
    };

    this.body = {
      textContent: this.extractTextContent(html),
      innerHTML: html,
    };

    this.head = {};
  }

  private extractTextContent(html: string): string {
    // Simple text extraction
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

class MockWindow {
  document: MockDocument;

  constructor(html: string) {
    this.document = new MockDocument(html);
  }
}

export class JSDOM {
  window: MockWindow;

  constructor(html: string) {
    this.window = new MockWindow(html);
  }
}
