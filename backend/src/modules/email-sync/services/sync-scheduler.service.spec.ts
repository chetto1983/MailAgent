import { SyncSchedulerService } from './sync-scheduler.service';

describe('SyncSchedulerService', () => {
  let prisma: any;
  let queueService: any;
  let service: SyncSchedulerService;

  const providerBase = {
    id: 'provider-1',
    tenantId: 'tenant-1',
    providerType: 'google',
    email: 'user@example.com',
    lastSyncedAt: null as Date | null,
    tenant: { id: 'tenant-1' },
  };

  beforeEach(() => {
    prisma = {
      providerConfig: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    queueService = {
      addBulkSyncJobs: jest.fn().mockResolvedValue(undefined),
      addSyncJob: jest.fn().mockResolvedValue(undefined),
      getQueueStatus: jest.fn().mockResolvedValue({ high: {}, normal: {}, low: {} }),
    };

    service = new SyncSchedulerService(prisma, queueService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('scheduleSyncJobs', () => {
    it('skips when already running', async () => {
      (service as any).isRunning = true;

      await service.scheduleSyncJobs();

      expect(queueService.addBulkSyncJobs).not.toHaveBeenCalled();
    });

    it('enqueues jobs when providers are returned', async () => {
      const providers = [{ ...providerBase }];
      const jobs = [
        {
          tenantId: providerBase.tenantId,
          providerId: providerBase.id,
          providerType: providerBase.providerType,
          email: providerBase.email,
          priority: 'high' as const,
          syncType: 'full' as const,
          lastSyncedAt: undefined,
        },
      ];

      jest.spyOn<any, any>(service as any, 'getProvidersToSync').mockResolvedValue(providers);
      jest.spyOn<any, any>(service as any, 'createSyncJobs').mockReturnValue(jobs);

      await service.scheduleSyncJobs();

      expect(queueService.addBulkSyncJobs).toHaveBeenCalledWith(jobs);
    });

    it('logs and exits when no providers need syncing', async () => {
      jest.spyOn<any, any>(service as any, 'getProvidersToSync').mockResolvedValue([]);

      await service.scheduleSyncJobs();

      expect(queueService.addBulkSyncJobs).not.toHaveBeenCalled();
    });
  });

  describe('createSyncJobs', () => {
    it('maps providers to SyncJobData with derived priority and syncType', () => {
      const spyPriority = jest
        .spyOn<any, any>(service as any, 'determinePriority')
        .mockReturnValue('normal');
      const spySyncType = jest
        .spyOn<any, any>(service as any, 'determineSyncType')
        .mockReturnValue('incremental');

      const jobs = (service as any).createSyncJobs([providerBase]);

      expect(spyPriority).toHaveBeenCalledWith(providerBase);
      expect(spySyncType).toHaveBeenCalledWith(providerBase);
      expect(jobs).toEqual([
        expect.objectContaining({
          tenantId: providerBase.tenantId,
          providerId: providerBase.id,
          priority: 'normal',
          syncType: 'incremental',
        }),
      ]);
    });
  });

  describe('determinePriority', () => {
    it('returns high for never-synced providers', () => {
      const priority = (service as any).determinePriority({ lastSyncedAt: null });
      expect(priority).toBe('high');
    });

    it('returns low when older than 48 hours', () => {
      const priority = (service as any).determinePriority({
        lastSyncedAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
      });
      expect(priority).toBe('low');
    });

    it('returns normal when between 6 and 48 hours', () => {
      const priority = (service as any).determinePriority({
        lastSyncedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      });
      expect(priority).toBe('normal');
    });

    it('returns high when synced recently', () => {
      const priority = (service as any).determinePriority({
        lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
      expect(priority).toBe('high');
    });
  });

  describe('determineSyncType', () => {
    it('returns full when never synced', () => {
      const type = (service as any).determineSyncType({ lastSyncedAt: null });
      expect(type).toBe('full');
    });

    it('returns incremental when last sync within threshold', () => {
      const type = (service as any).determineSyncType({
        lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
      expect(type).toBe('incremental');
    });

    it('returns full when beyond threshold', () => {
      const type = (service as any).determineSyncType({
        lastSyncedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      });
      expect(type).toBe('full');
    });
  });

  describe('syncProviderNow', () => {
    it('throws when provider does not exist', async () => {
      prisma.providerConfig.findUnique.mockResolvedValue(null);

      await expect(service.syncProviderNow('missing')).rejects.toThrow('Provider missing not found');
    });

    it('throws when provider is inactive', async () => {
      prisma.providerConfig.findUnique.mockResolvedValue({
        ...providerBase,
        isActive: false,
      });

      await expect(service.syncProviderNow('provider-1')).rejects.toThrow(
        'Provider provider-1 is not active',
      );
    });

    it('enqueues a manual sync job', async () => {
      prisma.providerConfig.findUnique.mockResolvedValue({
        ...providerBase,
        isActive: true,
        lastSyncedAt: null,
      });

      await service.syncProviderNow('provider-1', 'normal');

      expect(queueService.addSyncJob).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: providerBase.id,
          priority: 'normal',
        }),
      );
    });
  });

  describe('getSyncStats', () => {
    it('aggregates queue status and provider metrics', async () => {
      queueService.getQueueStatus.mockResolvedValue({ summary: true });
      prisma.providerConfig.count
        .mockResolvedValueOnce(100) // total active
        .mockResolvedValueOnce(5) // never synced
        .mockResolvedValueOnce(40); // synced today

      const result = await service.getSyncStats();

      expect(queueService.getQueueStatus).toHaveBeenCalled();
      expect(prisma.providerConfig.count).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        queues: { summary: true },
        providers: {
          total: 100,
          neverSynced: 5,
          syncedToday: 40,
        },
        scheduler: {
          isRunning: false,
          batchSize: expect.any(Number),
          intervalMinutes: expect.any(Number),
        },
      });
    });
  });
});
