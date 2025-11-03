const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const SYNC_INTERVAL_MINUTES = 5;
    const cutoffTime = new Date(Date.now() - SYNC_INTERVAL_MINUTES * 60 * 1000);

    console.log('Testing scheduler query...');
    console.log('Cutoff time:', cutoffTime.toISOString());
    console.log();

    const providers = await prisma.providerConfig.findMany({
      where: {
        isActive: true,
        OR: [
          { lastSyncedAt: null },
          { lastSyncedAt: { lt: cutoffTime } }
        ]
      },
      select: {
        email: true,
        providerType: true,
        lastSyncedAt: true,
        isActive: true
      },
      orderBy: [
        { lastSyncedAt: 'asc' }
      ],
      take: 200
    });

    console.log('Found', providers.length, 'providers that need syncing:');
    providers.forEach(p => {
      console.log(' -', p.email, '(', p.providerType, ') last synced:', p.lastSyncedAt?.toISOString() || 'never');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
