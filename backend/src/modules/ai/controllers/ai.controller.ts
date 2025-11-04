import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../modules/auth/guards/tenant.guard';
import { MistralService } from '../services/mistral.service';
import { AgentService } from '../services/agent.service';
import { AuthenticatedRequest } from '../../../common/types/request.types';

@Controller('ai')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiController {
  constructor(
    private readonly mistralService: MistralService,
    private readonly agentService: AgentService,
  ) {}

  /**
   * Classic chat completion backed by the Mistral service
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

  /**
   * Agentic workflow powered by LangChain
   * POST /ai/agent
   */
  @Post('agent')
  async agent(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      message: string;
      conversationId?: string;
      history?: Array<{ role: string; content: string }>;
    },
  ) {
    const result = await this.agentService.runAgent({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      prompt: body.message,
      conversationId: body.conversationId,
      history: body.history,
    });

    return {
      success: true,
      response: result.output,
      steps: result.intermediateSteps ?? [],
    };
  }
}
