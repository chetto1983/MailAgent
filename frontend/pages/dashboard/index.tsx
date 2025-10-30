import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MessageCircle, Send, Mic, Volume2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { logout } = useAuthStore();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await apiClient.post('/ai/chat', {
        message: userMessage,
        conversationHistory: messages,
      });

      if (response.data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: response.data.response }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">MailAgent</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.firstName || user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/providers')}>
              Providers
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
              Settings
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto max-w-4xl mx-auto w-full">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Start a Conversation</h2>
              <p className="text-muted-foreground text-center">
                Ask me anything about your emails or get help with your tasks
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-xs lg:max-w-md px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p>{message.content}</p>
              </Card>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <Card className="bg-muted px-4 py-3">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-card sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsRecording(!isRecording)}
              className={isRecording ? 'bg-red-100' : ''}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="icon">
              <Volume2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
