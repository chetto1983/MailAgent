import { apiClient } from '../api-client';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  steps?: Array<{ tool: string; output: string }>;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export const aiApi = {
  listSessions() {
    return apiClient.get<{ success: boolean; sessions: ChatSession[] }>('/ai/chat/sessions');
  },
  getSession(sessionId: string) {
    return apiClient.get<{ success: boolean; session: ChatSession | null }>(
      `/ai/chat/sessions/${sessionId}`,
    );
  },
  createSession() {
    return apiClient.post<{ success: boolean; session: ChatSession }>('/ai/chat/sessions');
  },
  sendAgentMessage(payload: {
    sessionId?: string;
    message: string;
    history: ChatMessage[];
  }) {
    return apiClient.post<{
      success: boolean;
      sessionId: string;
      session: ChatSession;
      messages: ChatMessage[];
      response: string;
      steps?: Array<{ tool: string; output: string }>;
    }>('/ai/agent', payload);
  },
};
