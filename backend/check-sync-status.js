const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSyncStatus() {
  try {
    const userEmail = 'dvdmarchetto@gmail.com';

    console.log(`\n🔍 Verificando sync per: ${userEmail}\n`);

    // Trova user e tenant
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      console.log('❌ Utente non trovato');
      return;
    }

    const tenantId = user.tenantId;

    // 1. Provider
    const providers = await prisma.providerConfig.findMany({
      where: { tenantId },
      select: { id: true, email: true, providerType: true, isActive: true }
    });

    console.log(`📧 Provider: ${providers.length}`);
    providers.forEach(p => {
      console.log(`   - ${p.providerType}: ${p.email} (${p.isActive ? 'attivo' : 'inattivo'})`);
    });
    console.log('');

    // 2. Folders/Labels
    const folders = await prisma.folder.findMany({
      where: { tenantId },
      select: {
        id: true,
        providerId: true,
        name: true,
        path: true,
        specialUse: true,
        unreadCount: true,
        totalCount: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`📁 Folder/Labels: ${folders.length}`);
    if (folders.length > 0) {
      folders.forEach(f => {
        const provider = providers.find(p => p.id === f.providerId);
        console.log(`   - ${f.name} (${f.specialUse || 'custom'}) - ${f.unreadCount}/${f.totalCount} email - Provider: ${provider?.email}`);
        console.log(`     Path: ${f.path}`);
        if (f.path && f.path.includes('CATEGORY_')) {
          console.log(`     ⚠️  TROVATO PREFISSO CATEGORY_: ${f.path}`);
        }
        if (f.name && f.name.startsWith('CATEGORY_')) {
          console.log(`     ⚠️  NOME CON PREFISSO CATEGORY_: ${f.name}`);
        }
      });
    }
    console.log('');

    // 3. Email
    const emailCount = await prisma.email.count({ where: { tenantId } });
    console.log(`📬 Email totali: ${emailCount}`);

    if (emailCount > 0) {
      // Email per provider
      const emailsByProvider = await prisma.email.groupBy({
        by: ['providerId'],
        where: { tenantId },
        _count: true
      });

      for (const group of emailsByProvider) {
        const provider = providers.find(p => p.id === group.providerId);
        console.log(`   - ${provider?.email}: ${group._count} email`);
      }

      // Email per folder (check se le email hanno il folder assegnato)
      const emailsWithFolder = await prisma.email.findMany({
        where: { tenantId },
        select: {
          id: true,
          subject: true,
          folder: true,
          labels: true
        },
        take: 10
      });

      console.log(`\n   Primi 10 email (sample):`);
      emailsWithFolder.forEach(e => {
        console.log(`   - ${e.subject?.substring(0, 50) || 'No subject'}`);
        console.log(`     Folder: ${e.folder || 'NULL'}`);
        if (e.labels && e.labels.length > 0) {
          console.log(`     Labels: ${JSON.stringify(e.labels)}`);
        }
      });

      // Check quante email hanno folder NULL
      const emailsWithoutFolder = await prisma.email.count({
        where: { tenantId, folder: null }
      });
      console.log(`\n   ⚠️  Email senza folder: ${emailsWithoutFolder}/${emailCount}`);
    }
    console.log('');

    // 4. Embeddings
    const embeddingCount = await prisma.embedding.count({ where: { tenantId } });
    console.log(`🧠 Embeddings: ${embeddingCount}\n`);

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSyncStatus();
