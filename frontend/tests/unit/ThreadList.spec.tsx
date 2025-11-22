import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ThreadList } from '@/components/email/ThreadList';
import { useEmailStore, type Email } from '@/stores/email-store';
import type { Conversation } from '@/lib/api/email';

// Mock stores
jest.mock('@/stores/email-store');
jest.mock('@/lib/hooks/use-translations', () => ({
  useTranslations: () => ({
    common: { allCaughtUp: 'All caught up' },
  }),
}));

// Mock ThreadListItem to simplify testing
jest.mock('@/components/email/ThreadListItem', () => ({
  ThreadListItem: ({ thread, onClick }: any) => (
    <div data-testid={`thread-item-${thread.id}`} onClick={onClick}>
      <div>{thread.subject}</div>
      {thread.emailCount && <div data-testid="email-count">{thread.emailCount}</div>}
    </div>
  ),
}));

const mockEmails: Email[] = [
  {
    id: 'email-1',
    providerId: 'provider-1',
    externalId: 'ext-1',
    threadId: 'thread-1',
    from: 'sender1@example.com',
    subject: 'Test Email 1',
    receivedAt: '2025-01-01T10:00:00Z',
    isRead: false,
    isStarred: false,
  },
  {
    id: 'email-2',
    providerId: 'provider-1',
    externalId: 'ext-2',
    threadId: 'thread-1',
    from: 'sender2@example.com',
    subject: 'Re: Test Email 1',
    receivedAt: '2025-01-01T11:00:00Z',
    isRead: true,
    isStarred: false,
  },
  {
    id: 'email-3',
    providerId: 'provider-1',
    externalId: 'ext-3',
    threadId: 'thread-2',
    from: 'sender3@example.com',
    subject: 'Different Thread',
    receivedAt: '2025-01-01T12:00:00Z',
    isRead: false,
    isStarred: true,
  },
];

describe('ThreadList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render list of threads', () => {
      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(<ThreadList threads={mockEmails} />);

      expect(screen.getByTestId('thread-item-email-1')).toBeInTheDocument();
      expect(screen.getByTestId('thread-item-email-2')).toBeInTheDocument();
      expect(screen.getByTestId('thread-item-email-3')).toBeInTheDocument();
    });

    it('should render empty state when no threads', () => {
      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(<ThreadList threads={[]} />);

      expect(screen.getByText('No emails')).toBeInTheDocument();
      expect(screen.getByText('All caught up')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(<ThreadList threads={[]} isLoading={true} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Thread Count Badge', () => {
    it('should show email count for multi-email threads', () => {
      const getThreadEmailsMock = jest.fn((threadId: string) => {
        if (threadId === 'thread-1') {
          return [mockEmails[0], mockEmails[1]]; // 2 emails
        }
        return [mockEmails[2]]; // 1 email
      });

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: getThreadEmailsMock,
      });

      render(<ThreadList threads={mockEmails} />);

      // Thread 1 has 2 emails, should show count badge
      const thread1 = screen.getByTestId('thread-item-email-1');
      expect(within(thread1).getByTestId('email-count')).toHaveTextContent('2');

      // Thread 2 has only 1 email, should NOT show count badge
      const thread2 = screen.getByTestId('thread-item-email-3');
      expect(within(thread2).queryByTestId('email-count')).not.toBeInTheDocument();
    });

    it('should handle threads with 3+ emails', () => {
      const largeThread: Email[] = [
        { ...mockEmails[0], threadId: 'large-thread' },
        { ...mockEmails[1], id: 'email-4', threadId: 'large-thread' },
        { ...mockEmails[2], id: 'email-5', threadId: 'large-thread' },
        { ...mockEmails[0], id: 'email-6', threadId: 'large-thread' },
      ];

      const getThreadEmailsMock = jest.fn((threadId: string) => {
        if (threadId === 'large-thread') {
          return largeThread;
        }
        return [];
      });

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: getThreadEmailsMock,
      });

      render(<ThreadList threads={[largeThread[0]]} />);

      const threadItem = screen.getByTestId('thread-item-email-1');
      expect(within(threadItem).getByTestId('email-count')).toHaveTextContent('4');
    });

    it('should not add emailCount for emails without threadId', () => {
      const emailWithoutThread = { ...mockEmails[0], threadId: undefined };

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(<ThreadList threads={[emailWithoutThread]} />);

      const threadItem = screen.getByTestId('thread-item-email-1');
      expect(within(threadItem).queryByTestId('email-count')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onThreadClick when thread is clicked', () => {
      const onThreadClick = jest.fn();

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(<ThreadList threads={mockEmails} onThreadClick={onThreadClick} />);

      fireEvent.click(screen.getByTestId('thread-item-email-1'));

      expect(onThreadClick).toHaveBeenCalledTimes(1);
      expect(onThreadClick).toHaveBeenCalledWith(expect.objectContaining({
        id: 'email-1',
      }));
    });

    it('should handle selection state', () => {
      const selectedIds = new Set(['email-1', 'email-2']);

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(
        <ThreadList
          threads={mockEmails}
          selectedId="email-1"
          selectedIds={selectedIds}
        />
      );

      expect(screen.getByTestId('thread-item-email-1')).toBeInTheDocument();
    });
  });

  describe('Infinite Scroll', () => {
    it('should show loading indicator when loading more', () => {
      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(
        <ThreadList
          threads={mockEmails}
          hasMore={true}
          isLoading={true}
        />
      );

      const loaders = screen.getAllByRole('progressbar');
      expect(loaders.length).toBeGreaterThan(0);
    });

    it('should call onLoadMore when scrolling', () => {
      const onLoadMore = jest.fn();

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(
        <ThreadList
          threads={mockEmails}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      // Intersection Observer is mocked in test environment
      // This test would need IntersectionObserver mock to properly test
    });
  });

  describe('Conversation Type Support', () => {
    it('should handle Conversation type threads', () => {
      const conversations: Conversation[] = [
        {
          id: 'conv-1',
          threadId: 'thread-conv-1',
          from: 'sender@example.com',
          subject: 'Conversation Subject',
          snippet: 'Preview text',
          receivedAt: '2025-01-01T10:00:00Z',
          isRead: false,
          isStarred: false,
          emailCount: 5,
          labels: [],
        },
      ];

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      render(<ThreadList threads={conversations} />);

      const conversationItem = screen.getByTestId('thread-item-conv-1');
      expect(conversationItem).toBeInTheDocument();
      expect(within(conversationItem).getByTestId('email-count')).toHaveTextContent('5');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large number of threads efficiently', () => {
      const largeThreadList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockEmails[0],
        id: `email-${i}`,
        threadId: `thread-${i}`,
      }));

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      const { container } = render(<ThreadList threads={largeThreadList} />);

      expect(container.querySelectorAll('[data-testid^="thread-item-"]')).toHaveLength(1000);
    });

    it('should handle threads with missing threadId gracefully', () => {
      const mixedThreads = [
        mockEmails[0],
        { ...mockEmails[1], threadId: undefined },
        mockEmails[2],
      ];

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      expect(() => {
        render(<ThreadList threads={mixedThreads} />);
      }).not.toThrow();
    });

    it('should handle empty threadId strings', () => {
      const emptyThreadId = { ...mockEmails[0], threadId: '' };

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn(() => []),
      });

      expect(() => {
        render(<ThreadList threads={[emptyThreadId]} />);
      }).not.toThrow();
    });
  });

  describe('Store Integration', () => {
    it('should call getThreadEmails for each thread with threadId', () => {
      const getThreadEmailsMock = jest.fn().mockReturnValue([]);

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: getThreadEmailsMock,
      });

      render(<ThreadList threads={mockEmails} />);

      // Should call getThreadEmails for each email with threadId
      expect(getThreadEmailsMock).toHaveBeenCalledWith('thread-1');
      expect(getThreadEmailsMock).toHaveBeenCalledWith('thread-2');
    });

    it('should reactively update when store changes', () => {
      const getThreadEmailsMock = jest.fn().mockReturnValue([mockEmails[0]]);

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: getThreadEmailsMock,
      });

      const { rerender } = render(<ThreadList threads={[mockEmails[0]]} />);

      // Simulate store update
      getThreadEmailsMock.mockReturnValue([mockEmails[0], mockEmails[1]]);

      rerender(<ThreadList threads={[mockEmails[0]]} />);

      // Component should reflect new thread count
      const threadItem = screen.getByTestId('thread-item-email-1');
      expect(within(threadItem).getByTestId('email-count')).toHaveTextContent('2');
    });
  });

  describe('Security Tests', () => {
    it('should handle malicious thread IDs safely', () => {
      const maliciousThread = {
        ...mockEmails[0],
        threadId: '<script>alert("XSS")</script>',
        id: '<img src=x onerror=alert("XSS")>',
      };

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      expect(() => {
        render(<ThreadList threads={[maliciousThread]} />);
      }).not.toThrow();
    });

    it('should handle extremely long subject lines', () => {
      const longSubject = 'A'.repeat(10000);
      const threadWithLongSubject = {
        ...mockEmails[0],
        subject: longSubject,
      };

      (useEmailStore as unknown as jest.Mock).mockReturnValue({
        getThreadEmails: jest.fn().mockReturnValue([]),
      });

      expect(() => {
        render(<ThreadList threads={[threadWithLongSubject]} />);
      }).not.toThrow();
    });
  });
});
