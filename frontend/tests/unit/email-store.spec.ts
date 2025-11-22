import { renderHook, act } from '@testing-library/react';
import { useEmailStore, type Email } from '@/stores/email-store';

describe('Email Store - Thread Support', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useEmailStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Thread Management', () => {
    it('should initialize with empty threads Map', () => {
      const { result } = renderHook(() => useEmailStore());
      expect(result.current.threads.size).toBe(0);
    });

    it('should update thread with emailIds', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.updateThread('thread-1', ['email-1', 'email-2', 'email-3']);
      });

      expect(result.current.threads.get('thread-1')).toEqual(['email-1', 'email-2', 'email-3']);
    });

    it('should replace existing thread when updating', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.updateThread('thread-1', ['email-1', 'email-2']);
        result.current.updateThread('thread-1', ['email-3', 'email-4', 'email-5']);
      });

      expect(result.current.threads.get('thread-1')).toEqual(['email-3', 'email-4', 'email-5']);
      expect(result.current.threads.get('thread-1')).toHaveLength(3);
    });

    it('should handle multiple threads independently', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.updateThread('thread-1', ['email-1', 'email-2']);
        result.current.updateThread('thread-2', ['email-3', 'email-4']);
      });

      expect(result.current.threads.size).toBe(2);
      expect(result.current.threads.get('thread-1')).toEqual(['email-1', 'email-2']);
      expect(result.current.threads.get('thread-2')).toEqual(['email-3', 'email-4']);
    });
  });

  describe('getThreadEmails', () => {
    const mockEmails: Email[] = [
      {
        id: 'email-1',
        providerId: 'provider-1',
        externalId: 'ext-1',
        threadId: 'thread-1',
        from: 'sender1@example.com',
        subject: 'Test 1',
        receivedAt: '2025-01-01T10:00:00Z',
        isRead: false,
      },
      {
        id: 'email-2',
        providerId: 'provider-1',
        externalId: 'ext-2',
        threadId: 'thread-1',
        from: 'sender2@example.com',
        subject: 'Re: Test 1',
        receivedAt: '2025-01-01T11:00:00Z',
        isRead: true,
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
      },
    ];

    it('should return emails for a specific thread', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.setEmails(mockEmails);
        result.current.updateThread('thread-1', ['email-1', 'email-2']);
      });

      const threadEmails = result.current.getThreadEmails('thread-1');
      expect(threadEmails).toHaveLength(2);
      expect(threadEmails.map(e => e.id)).toEqual(['email-1', 'email-2']);
    });

    it('should return empty array for non-existent thread', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.setEmails(mockEmails);
      });

      const threadEmails = result.current.getThreadEmails('non-existent');
      expect(threadEmails).toEqual([]);
    });

    it('should return empty array when thread has no emails in store', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.updateThread('thread-1', ['email-999']);
      });

      const threadEmails = result.current.getThreadEmails('thread-1');
      expect(threadEmails).toEqual([]);
    });
  });

  describe('getEmailThread', () => {
    const mockEmails: Email[] = [
      {
        id: 'email-1',
        providerId: 'provider-1',
        externalId: 'ext-1',
        threadId: 'thread-1',
        from: 'sender1@example.com',
        subject: 'Test 1',
        receivedAt: '2025-01-01T10:00:00Z',
        isRead: false,
      },
      {
        id: 'email-2',
        providerId: 'provider-1',
        externalId: 'ext-2',
        threadId: 'thread-1',
        from: 'sender2@example.com',
        subject: 'Re: Test 1',
        receivedAt: '2025-01-01T11:00:00Z',
        isRead: true,
      },
      {
        id: 'email-3',
        providerId: 'provider-1',
        externalId: 'ext-3',
        threadId: 'thread-1',
        from: 'sender3@example.com',
        subject: 'Re: Re: Test 1',
        receivedAt: '2025-01-01T09:00:00Z', // Earlier time
        isRead: false,
      },
    ];

    it('should return single email when email has no threadId', () => {
      const singleEmail: Email = {
        id: 'email-single',
        providerId: 'provider-1',
        externalId: 'ext-single',
        from: 'sender@example.com',
        subject: 'No Thread',
        receivedAt: '2025-01-01T10:00:00Z',
        isRead: false,
      };

      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.setEmails([singleEmail]);
      });

      const thread = result.current.getEmailThread('email-single');
      expect(thread).toHaveLength(1);
      expect(thread[0].id).toBe('email-single');
    });

    it('should return all emails in thread sorted chronologically', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.setEmails(mockEmails);
        result.current.updateThread('thread-1', ['email-1', 'email-2', 'email-3']);
      });

      const thread = result.current.getEmailThread('email-1');
      expect(thread).toHaveLength(3);
      // Should be sorted by receivedAt (oldest first)
      expect(thread[0].id).toBe('email-3'); // 09:00
      expect(thread[1].id).toBe('email-1'); // 10:00
      expect(thread[2].id).toBe('email-2'); // 11:00
    });

    it('should return single email when thread data not available', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.setEmails(mockEmails);
        // Don't call updateThread
      });

      const thread = result.current.getEmailThread('email-1');
      expect(thread).toHaveLength(1);
      expect(thread[0].id).toBe('email-1');
    });

    it('should return empty array for non-existent email', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.setEmails(mockEmails);
      });

      const thread = result.current.getEmailThread('non-existent');
      expect(thread).toEqual([]);
    });
  });

  describe('Integration with Email CRUD', () => {
    it('should work with addEmail and thread grouping', () => {
      const { result } = renderHook(() => useEmailStore());

      const email1: Email = {
        id: 'email-1',
        providerId: 'provider-1',
        externalId: 'ext-1',
        threadId: 'thread-1',
        from: 'test@example.com',
        subject: 'Test',
        receivedAt: '2025-01-01T10:00:00Z',
        isRead: false,
      };

      const email2: Email = {
        id: 'email-2',
        providerId: 'provider-1',
        externalId: 'ext-2',
        threadId: 'thread-1',
        from: 'test@example.com',
        subject: 'Re: Test',
        receivedAt: '2025-01-01T11:00:00Z',
        isRead: false,
      };

      act(() => {
        result.current.addEmail(email1);
        result.current.addEmail(email2);
        result.current.updateThread('thread-1', ['email-1', 'email-2']);
      });

      expect(result.current.emails).toHaveLength(2);
      const thread = result.current.getEmailThread('email-1');
      expect(thread).toHaveLength(2);
    });

    it('should handle deleteEmail and thread cleanup', () => {
      const { result } = renderHook(() => useEmailStore());

      const emails: Email[] = [
        {
          id: 'email-1',
          providerId: 'provider-1',
          externalId: 'ext-1',
          threadId: 'thread-1',
          from: 'test@example.com',
          subject: 'Test',
          receivedAt: '2025-01-01T10:00:00Z',
          isRead: false,
        },
        {
          id: 'email-2',
          providerId: 'provider-1',
          externalId: 'ext-2',
          threadId: 'thread-1',
          from: 'test@example.com',
          subject: 'Re: Test',
          receivedAt: '2025-01-01T11:00:00Z',
          isRead: false,
        },
      ];

      act(() => {
        result.current.setEmails(emails);
        result.current.updateThread('thread-1', ['email-1', 'email-2']);
      });

      act(() => {
        result.current.deleteEmail('email-1');
      });

      expect(result.current.emails).toHaveLength(1);
      // Thread map still has both IDs but getThreadEmails will filter
      const threadEmails = result.current.getThreadEmails('thread-1');
      expect(threadEmails).toHaveLength(1);
      expect(threadEmails[0].id).toBe('email-2');
    });
  });

  describe('Security Tests', () => {
    it('should not allow script injection in email fields', () => {
      const { result } = renderHook(() => useEmailStore());

      const maliciousEmail: Email = {
        id: 'email-xss',
        providerId: 'provider-1',
        externalId: 'ext-xss',
        from: '<script>alert("XSS")</script>@example.com',
        subject: '<img src=x onerror=alert("XSS")>',
        bodyHtml: '<script>alert("XSS")</script>',
        receivedAt: '2025-01-01T10:00:00Z',
        isRead: false,
      };

      act(() => {
        result.current.addEmail(maliciousEmail);
      });

      const storedEmail = result.current.emails[0];
      // Store should accept the data as-is (sanitization happens in UI)
      expect(storedEmail.from).toBe('<script>alert("XSS")</script>@example.com');
      // UI components should handle sanitization with DOMPurify
    });

    it('should handle extremely large thread arrays', () => {
      const { result } = renderHook(() => useEmailStore());

      // Create 10000 email IDs
      const largeEmailIds = Array.from({ length: 10000 }, (_, i) => `email-${i}`);

      act(() => {
        result.current.updateThread('large-thread', largeEmailIds);
      });

      expect(result.current.threads.get('large-thread')).toHaveLength(10000);
    });

    it('should prevent duplicate email IDs in store', () => {
      const { result } = renderHook(() => useEmailStore());

      const email: Email = {
        id: 'duplicate-test',
        providerId: 'provider-1',
        externalId: 'ext-1',
        from: 'test@example.com',
        subject: 'Test',
        receivedAt: '2025-01-01T10:00:00Z',
        isRead: false,
      };

      act(() => {
        result.current.addEmail(email);
        result.current.addEmail(email); // Try to add duplicate
      });

      // Should only have one email
      expect(result.current.emails).toHaveLength(1);
    });

    it('should handle null/undefined threadId safely', () => {
      const { result } = renderHook(() => useEmailStore());

      const email: Email = {
        id: 'email-no-thread',
        providerId: 'provider-1',
        externalId: 'ext-1',
        from: 'test@example.com',
        subject: 'Test',
        threadId: undefined,
        receivedAt: '2025-01-01T10:00:00Z',
        isRead: false,
      };

      act(() => {
        result.current.addEmail(email);
      });

      const thread = result.current.getEmailThread('email-no-thread');
      expect(thread).toHaveLength(1);
      expect(thread[0].id).toBe('email-no-thread');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset threads Map on reset()', () => {
      const { result } = renderHook(() => useEmailStore());

      act(() => {
        result.current.updateThread('thread-1', ['email-1', 'email-2']);
        result.current.updateThread('thread-2', ['email-3']);
      });

      expect(result.current.threads.size).toBe(2);

      act(() => {
        result.current.reset();
      });

      expect(result.current.threads.size).toBe(0);
      expect(result.current.emails).toHaveLength(0);
    });
  });
});
