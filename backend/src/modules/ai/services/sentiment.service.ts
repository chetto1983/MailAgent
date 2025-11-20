
import { Injectable } from '@nestjs/common';
import Sentiment = require('sentiment');

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
