import { Module } from '@nestjs/common';
import { LabelsController } from './controllers/labels.controller';
import { LabelsService } from './services/labels.service';

@Module({
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule {}
