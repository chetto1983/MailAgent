import { EmailRetentionService } from './email-retention.service';

describe('EmailRetentionService', () => {
  let prisma: {
    email: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
      deleteMany: jest.Mock;
    };
    tenant: {
      findMany: jest.Mock;
    };
  };
  let config: { get: jest.Mock };
  let service: EmailRetentionService;

  beforeEach(() => {
    prisma = {
      email: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn(),
      },
      tenant: {
        findMany: jest.fn(),
      },
    };

    config = {
      get: jest.fn().mockReturnValue('true'),
    };

    service = new EmailRetentionService(prisma as any, config as any);
  });

  describe('archiveOldEmails', () => {
    const testTenantId = 'tenant-123';

    it('returns empty result when no emails match', async () => {
      const cutoff = new Date('2025-01-01T00:00:00Z');
      prisma.email.findMany.mockResolvedValueOnce([]);

      const result = await service.archiveOldEmails(testTenantId, cutoff);

      expect(prisma.email.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: testTenantId,
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

      const result = await service.archiveOldEmails(testTenantId, cutoff);

      expect(prisma.email.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['email-1', 'email-2'] },
          tenantId: testTenantId,
        },
        data: expect.objectContaining({
          isArchived: true,
          bodyText: null,
          bodyHtml: null,
          headers: expect.anything(),
        }),
      });
      expect(result).toEqual({
        count: 2,
        emailIds: ['email-1', 'email-2'],
      });
    });
  });

  describe('runManualRetention', () => {
    const testTenantId = 'tenant-123';

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calculates cutoff based on provided retention days', async () => {
      const spy = jest
        .spyOn(service as any, 'archiveOldEmails')
        .mockResolvedValue({ count: 0, emailIds: [] });

      jest.useFakeTimers().setSystemTime(new Date('2025-01-10T00:00:00Z'));

      await service.runManualRetention(testTenantId, 5);

      expect(spy).toHaveBeenCalledTimes(1);
      // Check tenantId is first parameter
      expect(spy.mock.calls[0][0]).toBe(testTenantId);
      // Check cutoff date is second parameter
      const cutoffArgument = spy.mock.calls[0][1] as Date;
      expect(cutoffArgument.toISOString()).toBe('2025-01-05T00:00:00.000Z');
    });
  });

  describe('getRetentionStats', () => {
    const testTenantId = 'tenant-123';

    it('aggregates counts and estimates saved space', async () => {
      prisma.email.count
        .mockResolvedValueOnce(500) // totalEmails
        .mockResolvedValueOnce(120) // archivedEmails
        .mockResolvedValueOnce(300) // recentEmails
        .mockResolvedValueOnce(80); // oldUnarchived

      const stats = await service.getRetentionStats(testTenantId);

      expect(prisma.email.count).toHaveBeenCalledTimes(4);
      // All calls should include tenantId filter
      expect(prisma.email.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: testTenantId }),
        }),
      );
      expect(stats).toEqual({
        tenantId: testTenantId,
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

    it('invokes archiveOldEmails for all tenants', async () => {
      const mockTenants = [
        { id: 'tenant-1', name: 'Tenant 1' },
        { id: 'tenant-2', name: 'Tenant 2' },
      ];

      prisma.tenant.findMany.mockResolvedValue(mockTenants);

      const spy = jest
        .spyOn(service as any, 'archiveOldEmails')
        .mockResolvedValue({ count: 1, emailIds: ['x'] });

      jest.useFakeTimers().setSystemTime(new Date('2025-02-01T00:00:00Z'));

      const result = await service.runRetentionPolicy();

      expect(prisma.tenant.findMany).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledTimes(2);
      // Check each tenant was processed
      expect(spy).toHaveBeenCalledWith('tenant-1', expect.any(Date));
      expect(spy).toHaveBeenCalledWith('tenant-2', expect.any(Date));
      expect(result.totalArchived).toBe(2);
      expect(result.results.length).toBe(2);
    });
  });
});
