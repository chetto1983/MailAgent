import { EmailRetentionService } from './email-retention.service';

describe('EmailRetentionService', () => {
  let prisma: {
    email: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let service: EmailRetentionService;

  beforeEach(() => {
    prisma = {
      email: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };

    service = new EmailRetentionService(prisma as any);
  });

  describe('archiveOldEmails', () => {
    it('returns empty result when no emails match', async () => {
      const cutoff = new Date('2025-01-01T00:00:00Z');
      prisma.email.findMany.mockResolvedValueOnce([]);

      const result = await service.archiveOldEmails(cutoff);

      expect(prisma.email.findMany).toHaveBeenCalledWith({
        where: {
          receivedAt: { lt: cutoff },
          isArchived: false,
          isDeleted: false,
        },
        select: {
          id: true,
          subject: true,
          receivedAt: true,
        },
      });
      expect(prisma.email.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0, emailIds: [] });
    });

    it('archives matching emails and returns ids', async () => {
      const cutoff = new Date('2025-01-01T00:00:00Z');
      const emails = [
        { id: 'email-1', subject: 'One', receivedAt: cutoff },
        { id: 'email-2', subject: 'Two', receivedAt: cutoff },
      ];
      prisma.email.findMany.mockResolvedValueOnce(emails);
      prisma.email.updateMany.mockResolvedValueOnce({ count: emails.length });

      const result = await service.archiveOldEmails(cutoff);

      expect(prisma.email.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['email-1', 'email-2'] },
        },
        data: {
          isArchived: true,
          bodyText: null,
          bodyHtml: null,
          headers: expect.any(Object),
        },
      });
      expect(result).toEqual({
        count: 2,
        emailIds: ['email-1', 'email-2'],
      });
    });
  });

  describe('runManualRetention', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('calculates cutoff based on provided retention days', async () => {
      const spy = jest
        .spyOn(service as any, 'archiveOldEmails')
        .mockResolvedValue({ count: 0, emailIds: [] });

      jest.useFakeTimers().setSystemTime(new Date('2025-01-10T00:00:00Z'));

      await service.runManualRetention(5);

      expect(spy).toHaveBeenCalledTimes(1);
      const cutoffArgument = spy.mock.calls[0][0] as Date;
      expect(cutoffArgument.toISOString()).toBe('2025-01-05T00:00:00.000Z');
    });
  });

  describe('getRetentionStats', () => {
    it('aggregates counts and estimates saved space', async () => {
      prisma.email.count
        .mockResolvedValueOnce(500) // totalEmails
        .mockResolvedValueOnce(120) // archivedEmails
        .mockResolvedValueOnce(300) // recentEmails
        .mockResolvedValueOnce(80); // oldUnarchived

      const stats = await service.getRetentionStats();

      expect(prisma.email.count).toHaveBeenCalledTimes(4);
      expect(stats).toEqual({
        totalEmails: 500,
        archivedEmails: 120,
        recentEmails: 300,
        oldUnarchived: 80,
        retentionDays: 30,
        estimatedSpaceSavedMB: Math.round((120 * 10000) / (1024 * 1024)),
      });
    });
  });

  describe('runRetentionPolicy', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('invokes archiveOldEmails with the default cutoff', async () => {
      const spy = jest
        .spyOn(service as any, 'archiveOldEmails')
        .mockResolvedValue({ count: 1, emailIds: ['x'] });

      jest.useFakeTimers().setSystemTime(new Date('2025-02-01T00:00:00Z'));

      const result = await service.runRetentionPolicy();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ count: 1, emailIds: ['x'] });
      const cutoff = spy.mock.calls[0][0] as Date;
      expect(cutoff <= new Date('2025-02-01T00:00:00Z')).toBe(true);
    });
  });
});
