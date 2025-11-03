import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../modules/auth/guards/tenant.guard';
import { MistralService } from '../services/mistral.service';
import { AuthenticatedRequest } from '../../../common/types/request.types';

@Controller('ai')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiController {
  constructor(private mistralService: MistralService) {}

  /**
   * Send message to AI assistant
   * POST /ai/chat
   */
  @Post('chat')
  async chat(
    @Request() req: AuthenticatedRequest,
    @Body() body: { message: string; conversationHistory?: any[]; conversationId?: string },
  ) {
    const response = await this.mistralService.generateResponse(
      req.user.tenantId,
      req.user.userId,
      body.message,
      body.conversationHistory || [],
      {
        conversationId: body.conversationId,
      },
    );

    return {
      success: true,
      response,
    };
  }
}
