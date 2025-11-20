import type { Email } from '@/stores/email-store';

export const mockEmails: Email[] = [
  {
    id: '1',
    subject: 'Welcome to MailAgent!',
    from: 'John Doe <john@example.com>',
    to: ['you@example.com'],
    receivedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    bodyPreview: 'Thank you for joining MailAgent. Here are some tips to get started with our AI-powered email assistant...',
    isRead: false,
    isStarred: false,
    hasAttachments: true,
    providerId: 'provider-1',
    folder: 'INBOX',
    labels: [],
  },
  {
    id: '2',
    subject: 'Your weekly summary',
    from: 'MailAgent Team <team@mailagent.com>',
    to: ['you@example.com'],
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    bodyPreview: 'Here is your weekly email summary: You received 47 emails this week, sent 23 replies...',
    isRead: false,
    isStarred: true,
    hasAttachments: false,
    providerId: 'provider-1',
    folder: 'INBOX',
    labels: [],
  },
  {
    id: '3',
    subject: 'Meeting reminder: Team sync',
    from: 'Calendar <calendar@example.com>',
    to: ['you@example.com'],
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    bodyPreview: 'Your meeting "Team sync" is scheduled for tomorrow at 10:00 AM...',
    isRead: true,
    isStarred: false,
    hasAttachments: false,
    providerId: 'provider-1',
    folder: 'INBOX',
    labels: [],
  },
  {
    id: '4',
    subject: 'Project update: Q4 goals',
    from: 'Jane Smith <jane@company.com>',
    to: ['you@example.com', 'team@company.com'],
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    bodyPreview: 'Hi team, I wanted to share an update on our Q4 goals. We are making great progress...',
    isRead: true,
    isStarred: true,
    hasAttachments: true,
    providerId: 'provider-1',
    folder: 'INBOX',
    labels: [],
  },
  {
    id: '5',
    subject: 'Invoice #12345',
    from: 'Billing <billing@service.com>',
    to: ['you@example.com'],
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    bodyPreview: 'Your invoice for the period ending December 2024 is now available...',
    isRead: false,
    isStarred: false,
    hasAttachments: true,
    providerId: 'provider-1',
    folder: 'INBOX',
    labels: [],
  },
  {
    id: '6',
    subject: 'Re: Question about API integration',
    from: 'Support Team <support@service.com>',
    to: ['you@example.com'],
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    bodyPreview: 'Thank you for reaching out! Regarding your question about the API integration...',
    isRead: true,
    isStarred: false,
    hasAttachments: false,
    providerId: 'provider-1',
    folder: 'INBOX',
    labels: [],
  },
  {
    id: '7',
    subject: 'New feature announcement',
    from: 'Product Team <product@mailagent.com>',
    to: ['all@company.com'],
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
    bodyPreview: 'We are excited to announce our new AI-powered email categorization feature...',
    isRead: false,
    isStarred: true,
    hasAttachments: false,
    providerId: 'provider-1',
    folder: 'INBOX',
    labels: [],
  },
  {
    id: '8',
    subject: 'Security alert',
    from: 'Security <security@example.com>',
    to: ['you@example.com'],
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    bodyPreview: 'We detected a login attempt from a new device. If this was you, you can ignore this message...',
    isRead: true,
    isStarred: false,
    hasAttachments: false,
    providerId: 'provider-1',
    folder: 'INBOX',
    labels: [],
  },
];

export const mockFolders = {
  foldersByProvider: {
    'provider-1': [
      {
        id: 'inbox-1',
        name: 'INBOX',
        specialUse: 'inbox',
        unreadCount: 3,
        providerId: 'provider-1',
      },
      {
        id: 'sent-1',
        name: 'Sent',
        specialUse: 'sent',
        unreadCount: 0,
        providerId: 'provider-1',
      },
      {
        id: 'draft-1',
        name: 'Drafts',
        specialUse: 'drafts',
        unreadCount: 0,
        providerId: 'provider-1',
      },
      {
        id: 'trash-1',
        name: 'Trash',
        specialUse: 'trash',
        unreadCount: 0,
        providerId: 'provider-1',
      },
    ],
  },
  providers: [
    {
      id: 'provider-1',
      email: 'you@example.com',
      providerType: 'google' as const,
      isDefault: true,
    },
  ],
};
