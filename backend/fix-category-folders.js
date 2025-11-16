const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCategoryFolders() {
  try {
    const userEmail = 'dvdmarchetto@gmail.com';

    console.log(`\n🔧 Fixing CATEGORY_ prefixes for: ${userEmail}\n`);

    // Find user and tenant
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    const tenantId = user.tenantId;

    // 1. Update folder names - remove CATEGORY_ prefix
    console.log('📁 Updating folder names...');
    const foldersToUpdate = await prisma.folder.findMany({
      where: {
        tenantId,
        name: { startsWith: 'CATEGORY_' }
      },
      select: { id: true, name: true, path: true }
    });

    console.log(`   Found ${foldersToUpdate.length} folders with CATEGORY_ prefix`);

    for (const folder of foldersToUpdate) {
      const newName = folder.name.replace('CATEGORY_', '');
      await prisma.folder.update({
        where: { id: folder.id },
        data: { name: newName }
      });
      console.log(`   ✓ ${folder.name} → ${newName}`);
    }

    // 2. Re-categorize emails based on their labels
    console.log('\n📧 Re-categorizing emails...');
    const emails = await prisma.email.findMany({
      where: { tenantId },
      select: { id: true, labels: true, folder: true }
    });

    console.log(`   Processing ${emails.length} emails...`);

    let categorized = 0;
    const categoryMap = {
      'CATEGORY_SOCIAL': 'SOCIAL',
      'CATEGORY_PROMOTIONS': 'PROMOTIONS',
      'CATEGORY_UPDATES': 'UPDATES',
      'CATEGORY_FORUMS': 'FORUMS',
      'CATEGORY_PERSONAL': 'INBOX',
    };

    for (const email of emails) {
      const labels = email.labels || [];

      // Check for category labels
      const categoryLabel = labels.find(label => label.startsWith('CATEGORY_'));

      if (categoryLabel && categoryMap[categoryLabel]) {
        const newFolder = categoryMap[categoryLabel];

        // Only update if folder changed
        if (email.folder !== newFolder) {
          await prisma.email.update({
            where: { id: email.id },
            data: { folder: newFolder }
          });
          categorized++;
        }
      }
    }

    console.log(`   ✓ Re-categorized ${categorized} emails`);

    // 3. Show summary
    console.log('\n📊 Summary by folder:');
    const emailsByFolder = await prisma.email.groupBy({
      by: ['folder'],
      where: { tenantId },
      _count: { folder: true }
    });

    // Sort by count descending
    emailsByFolder.sort((a, b) => b._count.folder - a._count.folder);

    for (const group of emailsByFolder) {
      console.log(`   - ${group.folder}: ${group._count.folder} emails`);
    }

    console.log('\n✅ Migration completed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixCategoryFolders();
