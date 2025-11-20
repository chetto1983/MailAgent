declare module 'sentiment' {
  export interface SentimentResult {
    score: number;
    comparative: number;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  export interface SentimentOptions {
    extras?: Record<string, number>;
    language?: string;
  }

  class Sentiment {
    constructor();
    analyze(phrase: string, options?: SentimentOptions): SentimentResult;
  }

  export = Sentiment;
}
