
import { Injectable } from '@nestjs/common';
import Sentiment from 'sentiment';

// TODO: npm install sentiment

@Injectable()
export class SentimentService {
  private sentiment: any;

  constructor() {
    this.sentiment = new Sentiment();
  }

  analyze(text: string) {
    return this.sentiment.analyze(text);
  }
}
