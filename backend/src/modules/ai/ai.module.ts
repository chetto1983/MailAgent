import { Module } from '@nestjs/common';
import { MistralService } from './services/mistral.service';
import { AiController } from './controllers/ai.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MistralService],
  controllers: [AiController],
  exports: [MistralService],
})
export class AiModule {}
