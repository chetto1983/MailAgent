/**
 * Test script for Microsoft Provider APIs
 * This script will test all Microsoft Graph API integrations
 */

const https = require('http');

const API_URL = 'http://localhost:3000';
const PROVIDER_ID = 'cmhdbcm220001ro7n7h2lwxdo'; // The Microsoft provider ID from database

// You need to provide your JWT token here
// To get it:
// 1. Open browser dev tools (F12)
// 2. Go to http://localhost:3001
// 3. Check Application > Local Storage > access_token
// OR check cookies/headers for the authorization token
const JWT_TOKEN = process.argv[2] || 'YOUR_JWT_TOKEN_HERE';

if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.error('❌ Please provide your JWT token as an argument:');
  console.error('   node test-microsoft-apis.js YOUR_JWT_TOKEN');
  console.error('\nTo get your token:');
  console.error('1. Open http://localhost:3001 in browser');
  console.error('2. Open Dev Tools (F12)');
  console.error('3. Go to Application tab > Local Storage');
  console.error('4. Copy the "access_token" value');
  console.error('\nAlso, make sure to update PROVIDER_ID in this file with your Microsoft provider ID');
  process.exit(1);
}

if (PROVIDER_ID === 'YOUR_MICROSOFT_PROVIDER_ID') {
  console.error('❌ Please update the PROVIDER_ID variable in this file');
  console.error('   You can find your Microsoft provider ID by:');
  console.error('   1. Check the database providers table');
  console.error('   2. Or call GET /providers endpoint to list all providers');
  process.exit(1);
}

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Microsoft Provider API Tests\n');
  console.log('═'.repeat(60));

  // Test 1: Mail Folders
  try {
    console.log('\n📧 Test 1: Microsoft Mail API - List Mail Folders');
    console.log('─'.repeat(60));
    const folders = await makeRequest(`/providers/${PROVIDER_ID}/test/mail-folders`);
    console.log('✅ Success!');
    console.log(`Found ${folders.folders?.length || 0} mail folders:`);
    folders.folders?.forEach(folder => {
      console.log(`   - ${folder.displayName} (Total: ${folder.totalItemCount}, Unread: ${folder.unreadItemCount})`);
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 2: Mail Messages
  try {
    console.log('\n📨 Test 2: Microsoft Mail API - List Recent Messages');
    console.log('─'.repeat(60));
    const messages = await makeRequest(`/providers/${PROVIDER_ID}/test/mail-messages`);
    console.log('✅ Success!');
    console.log(`Found ${messages.count || 0} messages:`);
    messages.messages?.slice(0, 3).forEach(msg => {
      console.log(`   From: ${msg.fromName} <${msg.from}>`);
      console.log(`   Subject: ${msg.subject}`);
      console.log(`   Preview: ${msg.bodyPreview?.substring(0, 60)}...`);
      console.log(`   Read: ${msg.isRead ? 'Yes' : 'No'}`);
      console.log();
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 3: Calendars
  try {
    console.log('\n📅 Test 3: Microsoft Calendar API - List Calendars');
    console.log('─'.repeat(60));
    const calendars = await makeRequest(`/providers/${PROVIDER_ID}/test/microsoft-calendars`);
    console.log('✅ Success!');
    console.log(`Found ${calendars.calendars?.length || 0} calendars:`);
    calendars.calendars?.forEach(cal => {
      const defaultMarker = cal.isDefaultCalendar ? '⭐' : '  ';
      console.log(`   ${defaultMarker} ${cal.name}`);
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 4: Calendar Events
  try {
    console.log('\n🗓️  Test 4: Microsoft Calendar API - List Upcoming Events');
    console.log('─'.repeat(60));
    const events = await makeRequest(`/providers/${PROVIDER_ID}/test/microsoft-calendar-events`);
    console.log('✅ Success!');
    console.log(`Found ${events.events?.length || 0} upcoming events:`);
    events.events?.slice(0, 3).forEach(event => {
      console.log(`   📌 ${event.subject}`);
      console.log(`      Start: ${event.start?.dateTime || event.start?.date}`);
      if (event.location) console.log(`      Location: ${event.location}`);
      if (event.isAllDay) console.log(`      All Day: Yes`);
      console.log();
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 5: Contacts
  try {
    console.log('\n👥 Test 5: Microsoft Contacts API - List Contacts');
    console.log('─'.repeat(60));
    const contacts = await makeRequest(`/providers/${PROVIDER_ID}/test/microsoft-contacts`);
    console.log('✅ Success!');
    console.log(`Found ${contacts.contacts?.length || 0} contacts:`);
    contacts.contacts?.slice(0, 5).forEach(contact => {
      console.log(`   👤 ${contact.name || 'Unnamed'}`);
      if (contact.emails?.length) console.log(`      📧 ${contact.emails.join(', ')}`);
      if (contact.mobilePhone) console.log(`      📱 ${contact.mobilePhone}`);
      if (contact.businessPhones?.length) console.log(`      📞 ${contact.businessPhones.join(', ')}`);
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 All tests completed!\n');
}

runTests().catch(console.error);
