import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Stack,
  Avatar,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Send,
  Bot,
  User,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  emailContext?: {
    subject: string;
    from: string;
    content: string;
  };
}

/**
 * AI Chat Panel Component
 *
 * Features:
 * - Context-aware AI chat
 * - Email summary generation
 * - Smart reply suggestions
 * - Conversation history
 * - Copy responses
 * - Collapsible interface
 */
export function AIChatPanel({
  open,
  onClose,
  emailContext,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you're asking about: "${input}". ${
          emailContext
            ? `Based on the email from ${emailContext.from} about "${emailContext.subject}", `
            : ''
        }Here's my response...`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1500);
  };

  const handleQuickAction = async (action: string) => {
    setLoading(true);

    setTimeout(() => {
      const actionResponses: Record<string, string> = {
        summarize: `📝 **Email Summary**\n\n${
          emailContext
            ? `From: ${emailContext.from}\nSubject: ${emailContext.subject}\n\nKey points:\n- Main topic discussed\n- Action items identified\n- Important dates mentioned`
            : 'Please select an email to summarize.'
        }`,
        reply: `✍️ **Smart Reply Suggestions**\n\n1. "Thank you for your email. I'll review this and get back to you soon."\n\n2. "I appreciate you reaching out. Let me look into this matter."\n\n3. "Thanks for the update. I'll follow up on this shortly."`,
        extract: `🔍 **Extracted Information**\n\n${
          emailContext
            ? `• Contact: ${emailContext.from}\n• Date: Today\n• Topic: ${emailContext.subject}\n• Priority: Normal`
            : 'No email selected.'
        }`,
      };

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: actionResponses[action] || 'Processing...',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1000);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!open) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: { xs: 0, md: 16 },
        right: { xs: 0, md: 16 },
        width: { xs: '100%', sm: 400 },
        maxWidth: '100vw',
        height: collapsed ? 'auto' : { xs: '100vh', sm: 600 },
        display: 'flex',
        flexDirection: 'column',
        borderRadius: { xs: 0, md: 2 },
        overflow: 'hidden',
        zIndex: 1300,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Sparkles size={20} />
          <Typography variant="subtitle1" fontWeight={600}>
            AI Assistant
          </Typography>
          {emailContext && (
            <Chip
              label="Email Context"
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
                height: 20,
              }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            sx={{ color: 'inherit' }}
          >
            {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: 'inherit' }}>
            <X size={18} />
          </IconButton>
        </Stack>
      </Box>

      <Collapse in={!collapsed}>
        <>
          {/* Quick Actions */}
          {emailContext && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  startIcon={<Sparkles size={14} />}
                  onClick={() => handleQuickAction('summarize')}
                  variant="outlined"
                  disabled={loading}
                >
                  Summarize
                </Button>
                <Button
                  size="small"
                  startIcon={<Send size={14} />}
                  onClick={() => handleQuickAction('reply')}
                  variant="outlined"
                  disabled={loading}
                >
                  Smart Reply
                </Button>
                <Button
                  size="small"
                  onClick={() => handleQuickAction('extract')}
                  variant="outlined"
                  disabled={loading}
                >
                  Extract Info
                </Button>
              </Stack>
            </Box>
          )}

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              minHeight: 300,
              maxHeight: { xs: 'calc(100vh - 250px)', sm: 400 },
            }}
          >
            {messages.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 2,
                  color: 'text.secondary',
                }}
              >
                <Bot size={48} style={{ opacity: 0.3 }} />
                <Typography variant="body2" textAlign="center">
                  Ask me anything about your emails, <br />
                  or use quick actions above
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'flex-start',
                      flexDirection:
                        message.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor:
                          message.role === 'user'
                            ? 'primary.main'
                            : 'secondary.main',
                      }}
                    >
                      {message.role === 'user' ? (
                        <User size={18} />
                      ) : (
                        <Bot size={18} />
                      )}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          bgcolor:
                            message.role === 'user'
                              ? 'primary.light'
                              : 'action.hover',
                          borderRadius: 2,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Typography variant="body2">{message.content}</Typography>
                      </Paper>

                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mt: 0.5, px: 1 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>

                        {message.role === 'assistant' && (
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(message.content, message.id)}
                            sx={{ ml: 'auto' }}
                          >
                            {copiedId === message.id ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </IconButton>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                ))}

                {loading && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                      <Bot size={18} />
                    </Avatar>
                    <CircularProgress size={20} />
                  </Box>
                )}

                <div ref={messagesEndRef} />
              </Stack>
            )}
          </Box>

          <Divider />

          {/* Input */}
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask AI assistant..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                  },
                }}
              >
                <Send size={18} />
              </IconButton>
            </Stack>
          </Box>
        </>
      </Collapse>
    </Paper>
  );
}
