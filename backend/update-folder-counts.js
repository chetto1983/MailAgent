const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateFolderCounts() {
  try {
    const userEmail = 'dvdmarchetto@gmail.com';

    console.log(`\n🔄 Updating folder counts for: ${userEmail}\n`);

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

    // Get provider
    const provider = await prisma.providerConfig.findFirst({
      where: { tenantId },
      select: { id: true, email: true }
    });

    if (!provider) {
      console.log('❌ No provider found');
      return;
    }

    console.log(`📧 Provider: ${provider.email}\n`);

    // Get all folders for this provider
    const folders = await prisma.folder.findMany({
      where: { tenantId, providerId: provider.id },
      select: { id: true, name: true, path: true, totalCount: true, unreadCount: true }
    });

    console.log(`📁 Updating ${folders.length} folders...\n`);

    for (const folder of folders) {
      // Count total emails for this folder
      // Email.folder stores the display name (e.g. "SOCIAL")
      const totalCount = await prisma.email.count({
        where: {
          providerId: provider.id,
          folder: folder.name
        }
      });

      // Count unread emails
      const unreadCount = await prisma.email.count({
        where: {
          providerId: provider.id,
          folder: folder.name,
          isRead: false
        }
      });

      // Update folder counts
      await prisma.folder.update({
        where: { id: folder.id },
        data: {
          totalCount,
          unreadCount
        }
      });

      console.log(`   ✓ ${folder.name.padEnd(20)} - Total: ${String(totalCount).padStart(4)} (was ${String(folder.totalCount).padStart(4)}) | Unread: ${String(unreadCount).padStart(4)} (was ${String(folder.unreadCount).padStart(4)})`);
    }

    console.log('\n📊 Final summary:');
    const updatedFolders = await prisma.folder.findMany({
      where: { tenantId, providerId: provider.id },
      select: { name: true, totalCount: true, unreadCount: true },
      orderBy: { totalCount: 'desc' }
    });

    for (const folder of updatedFolders) {
      if (folder.totalCount > 0) {
        console.log(`   - ${folder.name.padEnd(20)} - ${folder.totalCount} emails (${folder.unreadCount} unread)`);
      }
    }

    console.log('\n✅ Folder counts updated successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

updateFolderCounts();
