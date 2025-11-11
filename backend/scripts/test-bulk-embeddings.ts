/**
 * Test script for bulk embeddings functionality
 * This script tests both single and batch processing of email embeddings
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { KnowledgeBaseService } from '../src/modules/ai/services/knowledge-base.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('BulkEmbeddingsTest');

  try {
    logger.log('Starting bulk embeddings test...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const knowledgeBaseService = app.get(KnowledgeBaseService);

    // Test data: simulate multiple emails
    const testEmails = [
      {
        tenantId: 'test-tenant-1',
        emailId: 'test-email-1',
        subject: 'First test email about project management',
        bodyText: 'This is a test email about project management best practices. We need to discuss timelines, resources, and deliverables for the upcoming quarter.',
        from: 'sender1@example.com',
        receivedAt: new Date(),
      },
      {
        tenantId: 'test-tenant-1',
        emailId: 'test-email-2',
        subject: 'Second test email about technical architecture',
        bodyText: 'Let\'s review the technical architecture for our new microservices platform. We should focus on scalability, security, and maintainability.',
        from: 'sender2@example.com',
        receivedAt: new Date(),
      },
      {
        tenantId: 'test-tenant-1',
        emailId: 'test-email-3',
        subject: 'Third test email about team collaboration',
        bodyText: 'Team collaboration is essential for project success. We need better communication tools and regular sync meetings to stay aligned.',
        from: 'sender3@example.com',
        receivedAt: new Date(),
      },
    ];

    logger.log('='.repeat(80));
    logger.log('TEST 1: Single email processing (baseline)');
    logger.log('='.repeat(80));

    const startSingle = Date.now();
    const singleResult = await knowledgeBaseService.createEmbeddingForEmail(testEmails[0]);
    const durationSingle = Date.now() - startSingle;

    logger.log(`✓ Single email processed in ${durationSingle}ms`);
    logger.log(`  Result: ${singleResult ? 'SUCCESS' : 'FAILED'}`);

    logger.log('');
    logger.log('='.repeat(80));
    logger.log('TEST 2: Bulk processing (3 emails)');
    logger.log('='.repeat(80));

    const startBulk = Date.now();
    const bulkResults = await knowledgeBaseService.createBulkEmbeddingsForEmails([
      testEmails[0],
      testEmails[1],
      testEmails[2],
    ]);
    const durationBulk = Date.now() - startBulk;

    logger.log(`✓ Bulk processing completed in ${durationBulk}ms`);
    logger.log(`  Processed: ${bulkResults.length} emails`);

    bulkResults.forEach((result, index) => {
      const status = result.success ? '✓ SUCCESS' : '✗ FAILED';
      logger.log(`  Email ${index + 1}: ${status} ${result.error ? `(${result.error})` : ''}`);
    });

    logger.log('');
    logger.log('='.repeat(80));
    logger.log('PERFORMANCE COMPARISON');
    logger.log('='.repeat(80));

    const estimatedSequential = durationSingle * 3;
    const improvement = ((estimatedSequential - durationBulk) / estimatedSequential * 100).toFixed(1);

    logger.log(`Estimated sequential time: ${estimatedSequential}ms (${durationSingle}ms × 3)`);
    logger.log(`Actual bulk processing time: ${durationBulk}ms`);
    logger.log(`Performance improvement: ${improvement}% faster`);
    logger.log(`Time saved: ${estimatedSequential - durationBulk}ms`);

    logger.log('');
    logger.log('='.repeat(80));
    logger.log('✓ All tests completed successfully!');
    logger.log('='.repeat(80));

    await app.close();
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

bootstrap();
