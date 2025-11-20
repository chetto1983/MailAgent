import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  TextField,
  CircularProgress,
} from '@mui/material';
import { Send, Plus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { aiApi, type ChatMessage, type ChatSession } from '@/lib/api/ai';

function AiAssistantView() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    try {
      const response = await aiApi.getSession(sessionId);
      if (response.data.session) {
        setSelectedSession(response.data.session);
        setMessages(response.data.session.messages || []);
      } else {
        setSelectedSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load AI session:', error);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const response = await aiApi.listSessions();
      const data = response.data.sessions || [];
      setSessions(data);

      if (!selectedSession && data[0]) {
        await handleSelectSession(data[0].id);
      } else if (
        selectedSession &&
        !data.find((session) => session.id === selectedSession.id) &&
        data[0]
      ) {
        await handleSelectSession(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load AI sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, [selectedSession, handleSelectSession]);

  useEffect(() => {
    // Only load sessions once on mount
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSession = async () => {
    try {
      const response = await aiApi.createSession();
      await loadSessions();
      await handleSelectSession(response.data.session.id);
    } catch (error) {
      console.error('Failed to create AI session:', error);
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim()) return;

    try {
      setSending(true);
      const response = await aiApi.sendAgentMessage({
        sessionId: selectedSession?.id,
        message: prompt.trim(),
        history: messages,
      });
      setPrompt('');
      setSelectedSession(response.data.session);
      setMessages(response.data.session.messages || []);
      await loadSessions();
    } catch (error) {
      console.error('Failed to send AI prompt:', error);
      alert('Failed to send prompt. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', gap: 2 }}>
      <Paper
        sx={{
          width: 280,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            AI Sessions
          </Typography>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleCreateSession}
          >
            New Session
          </Button>
        </Box>

        {loadingSessions ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {sessions.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No sessions yet
                </Typography>
              </Box>
            )}
            {sessions.map((session) => (
              <React.Fragment key={session.id}>
                <ListItemButton
                  selected={selectedSession?.id === session.id}
                  onClick={() => handleSelectSession(session.id)}
                  sx={{ alignItems: 'flex-start' }}
                >
                  <ListItemText
                    primary={session.title || 'Untitled Session'}
                    secondary={new Date(session.updatedAt).toLocaleString()}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: selectedSession?.id === session.id ? 600 : 500,
                    }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItemButton>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      <Paper
        sx={{
          flex: 1,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {selectedSession ? (
          <>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {selectedSession.title || 'AI Assistant'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Session ID: {selectedSession.id}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {messages.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Start the conversation by typing a question below.
                </Typography>
              )}
              {messages.map((message, index) => (
                <Box
                  key={`${message.role}-${index}`}
                  sx={{
                    alignSelf: message.role === 'assistant' ? 'flex-start' : 'flex-end',
                    backgroundColor:
                      message.role === 'assistant'
                        ? 'action.hover'
                        : 'primary.main',
                    color: message.role === 'assistant' ? 'text.primary' : 'primary.contrastText',
                    borderRadius: 2,
                    p: 2,
                    maxWidth: '75%',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    {message.role === 'assistant' ? 'Assistant' : 'You'}
                  </Typography>
                  <Typography variant="body2">{message.content}</Typography>
                </Box>
              ))}
            </Box>

            <Divider />
            <Box sx={{ p: 3, display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                placeholder="Ask the AI anything about your mailbox..."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyPress={(event) => event.key === 'Enter' && handleSendPrompt()}
                disabled={sending}
              />
              <Button
                variant="contained"
                endIcon={<Send size={18} />}
                onClick={handleSendPrompt}
                disabled={sending}
              >
                Send
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Create or select a session to start chatting with the AI assistant.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default function AiAssistantPage() {
  return (
    <Layout>
      <AiAssistantView />
    </Layout>
  );
}

// Force SSR to avoid build-time errors with useRouter
export async function getServerSideProps() {
  return { props: {} };
}
