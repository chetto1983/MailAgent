/**
 * Seed database with sample data for local development
 * Run with: npx prisma db seed
 * This runs automatically when Docker starts the backend
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with test data...');
  console.log('');

  // Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default',
      description: 'Default tenant for local development',
      isActive: true,
    },
  });

  console.log('✅ Created default tenant:', defaultTenant.name);

  // Create test user (admin)
  const adminPassword = await bcrypt.hash('TestPassword123!', 10);
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: defaultTenant.id,
        email: 'admin@mailagent.local',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      email: 'admin@mailagent.local',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isMfaEnabled: true,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create regular test user
  const userPassword = await bcrypt.hash('UserPassword123!', 10);
  const regularUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: defaultTenant.id,
        email: 'test@mailagent.local',
      },
    },
    update: {},
    create: {
      tenantId: defaultTenant.id,
      email: 'test@mailagent.local',
      passwordHash: userPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isMfaEnabled: true,
    },
  });

  console.log('✅ Created regular user:', regularUser.email);

  // Create sample conversation messages
  await prisma.message.deleteMany({
    where: { tenantId: defaultTenant.id },
  });

  await prisma.message.createMany({
    data: [
      {
        tenantId: defaultTenant.id,
        userId: adminUser.id,
        role: 'user',
        content: 'Hello, can you help me organize my emails?',
      },
      {
        tenantId: defaultTenant.id,
        userId: adminUser.id,
        role: 'assistant',
        content:
          'Of course! I can help you organize your emails by creating filters, archiving old messages, and setting up smart categories. What would you like to focus on first?',
      },
      {
        tenantId: defaultTenant.id,
        userId: adminUser.id,
        role: 'user',
        content: 'I get way too many emails. Can you set up automatic filtering?',
      },
      {
        tenantId: defaultTenant.id,
        userId: adminUser.id,
        role: 'assistant',
        content:
          'Absolutely! I can help you set up filters based on sender, subject, keywords, or folders. Once connected to your email, I can automatically sort incoming messages. What types of emails would you like to filter?',
      },
    ],
  });

  console.log('✅ Created sample conversation');

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Test Accounts Created:');
  console.log('─────────────────────────────────────────');
  console.log('  Admin Account:');
  console.log('    • Email: admin@mailagent.local');
  console.log('    • Password: TestPassword123!');
  console.log('    • Role: Administrator');
  console.log('');
  console.log('  Regular User Account:');
  console.log('    • Email: test@mailagent.local');
  console.log('    • Password: UserPassword123!');
  console.log('    • Role: User');
  console.log('');
  console.log('🔐 Security Notes:');
  console.log('  • MFA is ENABLED for both accounts');
  console.log('  • OTP will be sent via email in real deployment');
  console.log('  • For testing: check logs for generated OTP codes');
  console.log('');
  console.log('📊 Sample Data:');
  console.log('  • Default tenant created');
  console.log('  • Sample conversation added (4 messages)');
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('  1. Visit: http://localhost:3001/auth/login');
  console.log('  2. Use admin@mailagent.local or test@mailagent.local');
  console.log('  3. Enter password');
  console.log('  4. Enter OTP (check docker logs for code)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
