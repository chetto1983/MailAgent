import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../modules/auth/guards/tenant.guard';
import { MistralService } from '../services/mistral.service';
import { AgentService } from '../services/agent.service';
import { AuthenticatedRequest } from '../../../common/types/request.types';
import { ChatSessionService, StoredChatMessage } from '../services/chat-session.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiController {
  constructor(
    private readonly mistralService: MistralService,
    private readonly agentService: AgentService,
    private readonly chatSessionService: ChatSessionService,
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
   * List latest chat sessions (FIFO)
   * GET /ai/chat/sessions
   */
  @Get('chat/sessions')
  async listSessions(@Request() req: AuthenticatedRequest) {
    const sessions = await this.chatSessionService.listSessions(req.user.tenantId, req.user.userId);
    return {
      success: true,
      sessions,
    };
  }

  /**
   * Get a single chat session by id
   * GET /ai/chat/sessions/:id
   */
  @Get('chat/sessions/:id')
  async getSession(
    @Request() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
  ) {
    const session = await this.chatSessionService.getSession(
      req.user.tenantId,
      req.user.userId,
      sessionId,
    );

    if (!session) {
      return {
        success: false,
        session: null,
      };
    }

    return {
      success: true,
      session,
    };
  }

  /**
   * Create a new chat session
   * POST /ai/chat/sessions
   */
  @Post('chat/sessions')
  async createSession(@Request() req: AuthenticatedRequest) {
    const session = await this.chatSessionService.createSession({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
    });

    return {
      success: true,
      session,
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
      sessionId?: string;
      history?: Array<{ role: string; content: string; steps?: Array<{ tool: string; output: string }> }>;
      locale?: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    let session =
      (await this.chatSessionService.getSession(tenantId, userId, body.sessionId ?? '')) ?? null;

    if (!session) {
      session = await this.chatSessionService.createSession({
        tenantId,
        userId,
      });
    }

    const history: StoredChatMessage[] = (body.history ?? []).map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content,
      ...(item.steps ? { steps: item.steps } : {}),
    }));

    const result = await this.agentService.runAgent({
      tenantId,
      userId,
      prompt: body.message,
      conversationId: session.id,
      history,
    });

    const assistantMessage: StoredChatMessage = {
      role: 'assistant',
      content: result.output,
      steps: result.intermediateSteps ?? [],
    };

    const updatedMessages: StoredChatMessage[] = [...history, assistantMessage];

    const updatedSession = await this.chatSessionService.saveSessionMessages({
      tenantId,
      userId,
      sessionId: session.id,
      messages: updatedMessages,
      locale: body.locale,
    });

    return {
      success: true,
      sessionId: updatedSession.id,
      session: updatedSession,
      messages: updatedMessages,
      response: result.output,
      steps: result.intermediateSteps ?? [],
    };
  }
}
