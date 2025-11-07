import { EmailCleanupService } from './email-cleanup.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { KnowledgeBaseService } from '../../ai/services/knowledge-base.service';

describe('EmailCleanupService', () => {
  let service: EmailCleanupService;
  const deleteMock = jest.fn();
  const findManyMock = jest.fn();
  const queryRawMock = jest.fn();
  const knowledgeMock = {
    deleteEmbeddingsForEmail: jest.fn(),
  } as unknown as KnowledgeBaseService;

  const prismaMock = {
    $queryRaw: queryRawMock,
    email: {
      delete: deleteMock,
      findMany: findManyMock,
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailCleanupService(prismaMock, knowledgeMock);
  });

  it('removes duplicate emails using raw query results', async () => {
    queryRawMock.mockResolvedValue([
      { id: 'dup-1', tenantId: 'tenant-a' },
      { id: 'dup-2', tenantId: 'tenant-a' },
    ]);

    const result = await service.removeDuplicateEmails('tenant-a');

    expect(result.removed).toBe(2);
    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(knowledgeMock.deleteEmbeddingsForEmail).toHaveBeenCalledTimes(2);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it('purges soft deleted emails older than threshold', async () => {
    findManyMock.mockResolvedValue([
      { id: 'soft-1', tenantId: 'tenant-a' },
      { id: 'soft-2', tenantId: 'tenant-a' },
    ]);

    const result = await service.purgeSoftDeletedEmails('tenant-a', 0);

    expect(result.removed).toBe(2);
    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(knowledgeMock.deleteEmbeddingsForEmail).toHaveBeenCalledTimes(2);
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });
});
