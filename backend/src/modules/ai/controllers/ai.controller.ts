import { Controller, Post, Body, UseGuards, Request, Get, Param, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../modules/auth/guards/tenant.guard';
import { MistralService } from '../services/mistral.service';
import { AgentService } from '../services/agent.service';
import { AuthenticatedRequest } from '../../../common/types/request.types';
import { ChatSessionService, StoredChatMessage } from '../services/chat-session.service';
import { EmailInsightsService } from '../services/email-insights.service';
import { KnowledgeBaseService, type KnowledgeBaseSearchHit } from '../services/knowledge-base.service';
import { SearchKnowledgeBaseDto } from '../dto/knowledge-base.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiController {
  constructor(
    private readonly mistralService: MistralService,
    private readonly agentService: AgentService,
    private readonly chatSessionService: ChatSessionService,
    private readonly emailInsightsService: EmailInsightsService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
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
  async createSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: { locale?: string },
  ) {
    const session = await this.chatSessionService.createSession({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      locale: body?.locale,
    });

    return {
      success: true,
      session,
    };
  }

  /**
   * Delete a chat session
   * DELETE /ai/chat/sessions/:id
   */
  @Delete('chat/sessions/:id')
  async deleteSession(
    @Request() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
  ) {
    const deleted = await this.chatSessionService.deleteSession({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      sessionId,
    });

    return {
      success: deleted,
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
        locale: body.locale,
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

  /**
   * POST /ai/summarize/:emailId - Generate AI summary for an email
   */
  @Post('summarize/:emailId')
  async summarizeEmail(
    @Request() req: AuthenticatedRequest,
    @Param('emailId') emailId: string,
    @Body() body?: { locale?: string },
  ) {
    const summary = await this.emailInsightsService.summarizeEmail(
      req.user.tenantId,
      emailId,
      body?.locale,
    );

    return {
      success: true,
      summary,
    };
  }

  /**
   * POST /ai/smart-reply/:emailId - Generate smart reply suggestions
   */
  @Post('smart-reply/:emailId')
  async smartReply(
    @Request() req: AuthenticatedRequest,
    @Param('emailId') emailId: string,
    @Body() body?: { locale?: string },
  ) {
    const suggestions = await this.emailInsightsService.generateSmartReplies(
      req.user.tenantId,
      emailId,
      body?.locale,
    );

    return {
      success: true,
      suggestions,
    };
  }

  /**
   * POST /ai/categorize/:emailId - Suggest labels for an email
   */
  @Post('categorize/:emailId')
  async categorizeEmail(
    @Request() req: AuthenticatedRequest,
    @Param('emailId') emailId: string,
    @Body() body?: { locale?: string },
  ) {
    const labels = await this.emailInsightsService.categorizeEmail(
      req.user.tenantId,
      emailId,
      body?.locale,
    );

    return {
      success: true,
      labels,
    };
  }

  /**
   * POST /ai/memory/search - Retrieve semantic memories (RAG) scoped to the tenant
   */
  @Post('memory/search')
  async searchMemory(
    @Request() req: AuthenticatedRequest,
    @Body() body: SearchKnowledgeBaseDto,
  ): Promise<{ success: true; usedQuery: string; items: KnowledgeBaseSearchHit[] }> {
    const result = await this.knowledgeBaseService.searchKnowledgeBase({
      tenantId: req.user.tenantId,
      emailId: body.emailId,
      query: body.query,
      limit: body.limit,
    });

    return {
      success: true,
      ...result,
    };
  }
}
