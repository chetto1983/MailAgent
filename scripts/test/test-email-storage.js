const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJ5NlU4MGdFNDdHclB5UEd5ZkFyTW0iLCJ1c2VySWQiOiJjbWhhcjU2MGkwMDBkdnU4ZHYxeGdteHNiIiwidGVuYW50SWQiOiJjbWhhcjFmbmMwMDAwOTJzeGZpN2V2ZjF5IiwiZW1haWwiOiJkdmRtYXJjaGV0dG9AZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjIwMDYxODIsImV4cCI6MTc2MjA5MjU4Mn0.NgzdnFjc22pTJroY5vueWLiu28mjXR0sN631_tVB67M';

async function testEmailStorage() {
  console.log('=== Testing Email Storage System ===\n');

  try {
    // 1. Test manual Google sync
    console.log('1. Triggering Google sync...');
    const googleProviderId = 'cmhdft3zq0001eaoww4tkg5sl';

    const syncResponse = await axios.post(
      `${BASE_URL}/email-sync/sync/${googleProviderId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log('Sync triggered:', syncResponse.data);
    console.log('');

    // Wait for sync to complete
    console.log('Waiting 10 seconds for sync to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 2. Get email stats
    console.log('\n2. Getting email statistics...');
    const statsResponse = await axios.get(
      `${BASE_URL}/emails/stats`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log('Email stats:', JSON.stringify(statsResponse.data, null, 2));
    console.log('');

    // 3. List emails
    console.log('3. Listing emails (first page)...');
    const listResponse = await axios.get(
      `${BASE_URL}/emails?limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log(`Found ${listResponse.data.pagination.total} total emails`);
    console.log('First 5 emails:');
    listResponse.data.emails.forEach((email, index) => {
      console.log(`  ${index + 1}. From: ${email.from}`);
      console.log(`     Subject: ${email.subject}`);
      console.log(`     Received: ${email.receivedAt}`);
      console.log(`     Read: ${email.isRead}, Starred: ${email.isStarred}`);
      console.log('');
    });

    // 4. Get email detail
    if (listResponse.data.emails.length > 0) {
      const firstEmailId = listResponse.data.emails[0].id;
      console.log(`4. Getting email detail for ID: ${firstEmailId}...`);

      const detailResponse = await axios.get(
        `${BASE_URL}/emails/${firstEmailId}`,
        {
          headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
          },
        }
      );

      console.log('Email detail:');
      console.log(`  Subject: ${detailResponse.data.subject}`);
      console.log(`  From: ${detailResponse.data.from}`);
      console.log(`  To: ${detailResponse.data.to.join(', ')}`);
      console.log(`  Body preview: ${detailResponse.data.snippet}`);
      console.log(`  Labels: ${detailResponse.data.labels.join(', ')}`);
      console.log('');

      // 5. Update email (mark as read)
      console.log(`5. Marking email as read...`);
      const updateResponse = await axios.patch(
        `${BASE_URL}/emails/${firstEmailId}`,
        { isRead: true },
        {
          headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
          },
        }
      );

      console.log(`Email marked as read: ${updateResponse.data.isRead}`);
      console.log('');
    }

    // 6. Search emails
    console.log('6. Searching emails with "gmail"...');
    const searchResponse = await axios.get(
      `${BASE_URL}/emails/search?q=gmail&limit=3`,
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    console.log(`Found ${searchResponse.data.length} emails matching "gmail"`);
    searchResponse.data.forEach((email, index) => {
      console.log(`  ${index + 1}. ${email.subject} - ${email.from}`);
    });
    console.log('');

    console.log('=== All tests completed successfully! ===');

  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testEmailStorage();
