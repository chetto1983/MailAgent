const axios = require('axios');

async function testMicrosoftAutoRefresh() {
  console.log('=== Test Auto-Refresh Token Microsoft ===\n');

  const PROVIDER_ID = 'cmhdkaefz000tll8tnntr4qq9'; // chetto983@hotmail.it
  const API_URL = 'http://localhost:3000';

  try {
    console.log('1. Triggering Microsoft sync manually...');
    console.log(`   Provider: ${PROVIDER_ID}`);

    const syncResponse = await axios.post(
      `${API_URL}/email-sync/sync/${PROVIDER_ID}`,
      {},
      {
        validateStatus: () => true, // Accept any status
      }
    );

    console.log(`   Status: ${syncResponse.status}`);

    if (syncResponse.status === 200 || syncResponse.status === 201) {
      console.log('   ✅ Sync triggered successfully');
      console.log('   Response:', JSON.stringify(syncResponse.data, null, 2));
    } else {
      console.log('   ❌ Sync failed');
      console.log('   Error:', syncResponse.data);
    }

    console.log('\n2. Waiting 10 seconds for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n3. Checking queue status...');
    const queueResponse = await axios.get(`${API_URL}/email-sync/queues`, {
      validateStatus: () => true,
    });

    if (queueResponse.status === 200) {
      const queues = queueResponse.data;
      console.log('   Queue Status:');
      for (const [priority, stats] of Object.entries(queues)) {
        console.log(`     ${priority}:`, JSON.stringify(stats, null, 6));
      }
    }

    console.log('\n4. Checking database for emails...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const microsoftEmails = await prisma.email.count({
      where: {
        providerId: PROVIDER_ID,
      },
    });

    const totalEmails = await prisma.email.count();

    console.log(`   Microsoft emails: ${microsoftEmails}`);
    console.log(`   Total emails: ${totalEmails}`);

    if (microsoftEmails > 0) {
      console.log('\n   ✅ SUCCESS! Emails were synced from Microsoft');

      const recentEmails = await prisma.email.findMany({
        where: { providerId: PROVIDER_ID },
        orderBy: { receivedAt: 'desc' },
        take: 3,
        select: {
          from: true,
          subject: true,
          receivedAt: true,
        },
      });

      console.log('\n   Recent emails:');
      recentEmails.forEach((email, i) => {
        console.log(`   ${i + 1}. From: ${email.from}`);
        console.log(`      Subject: ${email.subject}`);
        console.log(`      Received: ${email.receivedAt}`);
      });
    } else {
      console.log('\n   ⚠️  No emails synced yet');
    }

    await prisma.$disconnect();

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testMicrosoftAutoRefresh();
