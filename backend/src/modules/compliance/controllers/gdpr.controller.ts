import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GdprService } from '../services/gdpr.service';
import { GdprStatusDto } from '../dto/gdpr-status.dto';

@ApiTags('Compliance')
@Controller('compliance/gdpr')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get GDPR compliance status' })
  @ApiOkResponse({ type: GdprStatusDto })
  getStatus(): Promise<GdprStatusDto> {
    return this.gdprService.getStatus();
  }
}
