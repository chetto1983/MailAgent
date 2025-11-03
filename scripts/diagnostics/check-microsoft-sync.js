const { PrismaClient } = require('./backend/node_modules/.prisma/client');

const prisma = new PrismaClient();

async function checkMicrosoftSync() {
  try {
    const provider = await prisma.providerConfig.findFirst({
      where: {
        tenantId: 'cmhar1fnc000092sxfi7evf1y',
        providerType: 'microsoft'
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        lastSyncedAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!provider) {
      console.log('❌ Microsoft provider not found');
      return;
    }

    console.log('\n📋 Microsoft Provider Sync Status:\n');
    console.log(`ID: ${provider.id}`);
    console.log(`Email: ${provider.email}`);
    console.log(`Active: ${provider.isActive ? '✅' : '❌'}`);
    console.log(`Created: ${provider.createdAt.toLocaleString()}`);
    console.log(`Updated: ${provider.updatedAt.toLocaleString()}`);
    console.log('');

    // Check last sync
    const now = new Date();
    console.log('🔄 Sync Status:\n');
    console.log(`Last Synced: ${provider.lastSyncedAt ? provider.lastSyncedAt.toLocaleString() : '❌ NEVER SYNCED'}`);

    if (provider.lastSyncedAt) {
      const diffMinutes = Math.floor((now - provider.lastSyncedAt) / 1000 / 60);
      const diffHours = Math.floor(diffMinutes / 60);

      if (diffMinutes < 60) {
        console.log(`Time since last sync: ${diffMinutes} minutes ago`);
      } else {
        console.log(`Time since last sync: ${diffHours} hours ago`);
      }
    }

    console.log('');

    // Check metadata
    console.log('📦 Metadata:\n');
    if (provider.metadata) {
      console.log(JSON.stringify(provider.metadata, null, 2));
    } else {
      console.log('❌ No metadata saved');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMicrosoftSync();
