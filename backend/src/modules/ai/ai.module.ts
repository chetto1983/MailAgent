import { Module } from '@nestjs/common';
import { MistralService } from './services/mistral.service';
import { AiController } from './controllers/ai.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmbeddingsService } from './services/embeddings.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { KnowledgeBaseController } from './controllers/knowledge-base.controller';
import { EmailEmbeddingQueueService } from './services/email-embedding.queue';
import { AgentService } from './services/agent.service';

@Module({
  imports: [PrismaModule],
  providers: [
    MistralService,
    EmbeddingsService,
    KnowledgeBaseService,
    EmailEmbeddingQueueService,
    AgentService,
  ],
  controllers: [AiController, KnowledgeBaseController],
  exports: [
    MistralService,
    EmbeddingsService,
    KnowledgeBaseService,
    EmailEmbeddingQueueService,
    AgentService,
  ],
})
export class AiModule {}
