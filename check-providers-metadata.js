const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const providers = await prisma.providerConfig.findMany({
      select: {
        email: true,
        providerType: true,
        metadata: true,
        lastSyncedAt: true
      }
    });

    console.log('📊 All Providers Status:\n');
    providers.forEach(p => {
      console.log(`${p.email} (${p.providerType})`);
      console.log('  Metadata:', Object.keys(p.metadata).length === 0 ? '✅ Empty' : JSON.stringify(p.metadata));
      console.log('  Last Synced:', p.lastSyncedAt || 'Never');
      console.log();
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
