const { PrismaClient } = require('./backend/node_modules/.prisma/client');

const prisma = new PrismaClient();

async function checkProviders() {
  try {
    const providers = await prisma.providerConfig.findMany({
      where: {
        tenantId: 'cmhar1fnc000092sxfi7evf1y'
      },
      select: {
        id: true,
        providerType: true,
        email: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📋 Provider Configurations:\n');
    console.log(`Found ${providers.length} providers\n`);

    providers.forEach((p, index) => {
      console.log(`${index + 1}. ${p.providerType.toUpperCase()}`);
      console.log(`   ID: ${p.id}`);
      console.log(`   Email: ${p.email}`);
      console.log(`   Active: ${p.isActive ? '✅' : '❌'}`);
      console.log(`   Created: ${p.createdAt.toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProviders();
