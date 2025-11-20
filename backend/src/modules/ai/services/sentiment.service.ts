
import { Injectable } from '@nestjs/common';
import * as Sentiment from 'sentiment';

// TODO: npm install sentiment

@Injectable()
export class SentimentService {
  private sentiment: Sentiment;

  constructor() {
    this.sentiment = new Sentiment();
  }

  analyze(text: string) {
    return this.sentiment.analyze(text);
  }
}
