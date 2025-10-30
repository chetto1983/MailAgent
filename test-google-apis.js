/**
 * Test script for Google Provider APIs
 * This script will test all Google API integrations
 */

const https = require('http');

const API_URL = 'http://localhost:3000';
const PROVIDER_ID = 'cmhc66y3r0001u16zzou7qpfe'; // The Google provider ID from database

// You need to provide your JWT token here
// To get it:
// 1. Open browser dev tools (F12)
// 2. Go to http://localhost:3001
// 3. Check Application > Local Storage > access_token
// OR check cookies/headers for the authorization token
const JWT_TOKEN = process.argv[2] || 'YOUR_JWT_TOKEN_HERE';

if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.error('❌ Please provide your JWT token as an argument:');
  console.error('   node test-google-apis.js YOUR_JWT_TOKEN');
  console.error('\nTo get your token:');
  console.error('1. Open http://localhost:3001 in browser');
  console.error('2. Open Dev Tools (F12)');
  console.error('3. Go to Application tab > Local Storage');
  console.error('4. Copy the "access_token" value');
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
  console.log('🚀 Starting Google Provider API Tests\n');
  console.log('═'.repeat(60));

  // Test 1: Gmail Labels
  try {
    console.log('\n📧 Test 1: Gmail API - List Labels');
    console.log('─'.repeat(60));
    const labels = await makeRequest(`/providers/${PROVIDER_ID}/test/gmail-labels`);
    console.log('✅ Success!');
    console.log(`Found ${labels.labels?.length || 0} labels:`);
    labels.labels?.slice(0, 5).forEach(label => {
      console.log(`   - ${label.name} (${label.type})`);
    });
    if (labels.labels?.length > 5) {
      console.log(`   ... and ${labels.labels.length - 5} more`);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 2: Gmail Messages
  try {
    console.log('\n📨 Test 2: Gmail API - List Recent Messages');
    console.log('─'.repeat(60));
    const messages = await makeRequest(`/providers/${PROVIDER_ID}/test/gmail-messages`);
    console.log('✅ Success!');
    console.log(`Found ${messages.count || 0} messages:`);
    messages.messages?.slice(0, 3).forEach(msg => {
      console.log(`   From: ${msg.from}`);
      console.log(`   Subject: ${msg.subject}`);
      console.log(`   Snippet: ${msg.snippet?.substring(0, 60)}...`);
      console.log();
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 3: Google Calendars
  try {
    console.log('\n📅 Test 3: Google Calendar API - List Calendars');
    console.log('─'.repeat(60));
    const calendars = await makeRequest(`/providers/${PROVIDER_ID}/test/calendars`);
    console.log('✅ Success!');
    console.log(`Found ${calendars.calendars?.length || 0} calendars:`);
    calendars.calendars?.forEach(cal => {
      const primary = cal.primary ? '⭐' : '  ';
      console.log(`   ${primary} ${cal.summary} (${cal.accessRole})`);
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 4: Calendar Events
  try {
    console.log('\n🗓️  Test 4: Google Calendar API - List Upcoming Events');
    console.log('─'.repeat(60));
    const events = await makeRequest(`/providers/${PROVIDER_ID}/test/calendar-events`);
    console.log('✅ Success!');
    console.log(`Found ${events.events?.length || 0} upcoming events:`);
    events.events?.slice(0, 3).forEach(event => {
      console.log(`   📌 ${event.summary}`);
      console.log(`      Start: ${event.start?.dateTime || event.start?.date}`);
      if (event.location) console.log(`      Location: ${event.location}`);
      console.log();
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  // Test 5: Google Contacts
  try {
    console.log('\n👥 Test 5: Google People API - List Contacts');
    console.log('─'.repeat(60));
    const contacts = await makeRequest(`/providers/${PROVIDER_ID}/test/contacts`);
    console.log('✅ Success!');
    console.log(`Found ${contacts.contacts?.length || 0} contacts:`);
    contacts.contacts?.slice(0, 5).forEach(contact => {
      console.log(`   👤 ${contact.name || 'Unnamed'}`);
      if (contact.emails?.length) console.log(`      📧 ${contact.emails.join(', ')}`);
      if (contact.phones?.length) console.log(`      📞 ${contact.phones.join(', ')}`);
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 All tests completed!\n');
}

runTests().catch(console.error);
