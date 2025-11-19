import { GoogleSyncService } from './google-sync.service';

describe('GoogleSyncService helpers', () => {
  let prisma: any;
  let service: GoogleSyncService;

  beforeEach(() => {
    prisma = {
      email: {
        update: jest.fn(),
      },
    };

    service = new GoogleSyncService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('determineFolderFromLabels', () => {
    it('returns fallback when no labels provided', () => {
      const folder = (service as any).determineFolderFromLabels(undefined, 'CUSTOM');
      expect(folder).toBe('CUSTOM');
    });

    it('resolves system folders', () => {
      expect((service as any).determineFolderFromLabels(['TRASH'])).toBe('TRASH');
      expect((service as any).determineFolderFromLabels(['SPAM'])).toBe('SPAM');
      expect((service as any).determineFolderFromLabels(['SENT'])).toBe('SENT');
      expect((service as any).determineFolderFromLabels(['DRAFT'])).toBe('DRAFTS');
      expect((service as any).determineFolderFromLabels(['INBOX'])).toBe('INBOX');
    });

    it('maps category labels to folders', () => {
      expect(
        (service as any).determineFolderFromLabels(['CATEGORY_PROMOTIONS']),
      ).toBe('PROMOTIONS');
      expect(
        (service as any).determineFolderFromLabels(['CATEGORY_PERSONAL']),
      ).toBe('INBOX');
    });

    it('falls back to INBOX when no match', () => {
      expect((service as any).determineFolderFromLabels(['CUSTOM_LABEL'])).toBe('INBOX');
    });
  });

  describe('mergeEmailStatusMetadata', () => {
    it('adds deletedAt timestamp when marking deleted', () => {
      const result = (service as any).mergeEmailStatusMetadata({}, 'deleted');

      expect(result.status).toBe('deleted');
      expect(result.deletedAt).toBeDefined();
    });

    it('removes deletedAt when reverting to active', () => {
      const existing = { status: 'deleted', deletedAt: '2024-01-01T00:00:00Z' };
      const result = (service as any).mergeEmailStatusMetadata(existing, 'active');

      expect(result.status).toBe('active');
      expect(result.deletedAt).toBeUndefined();
    });
  });

  describe('applyStatusMetadata', () => {
    it('skips update when metadata unchanged', async () => {
      const existing = { status: 'active' };

      await (service as any).applyStatusMetadata('email-1', existing, 'active');

      expect(prisma.email.update).not.toHaveBeenCalled();
    });

    it('updates metadata when status changes', async () => {
      prisma.email.update.mockResolvedValueOnce(undefined);

      await (service as any).applyStatusMetadata('email-1', { status: 'active' }, 'deleted');

      expect(prisma.email.update).toHaveBeenCalledWith({
        where: { id: 'email-1' },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'deleted',
            deletedAt: expect.any(String),
          }),
        }),
      });
    });
  });
});
