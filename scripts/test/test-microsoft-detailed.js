/**
 * Detailed Microsoft API Test
 * This will show the actual error messages from Microsoft APIs
 */

const http = require('http');

const API_URL = 'http://localhost:3000';
const PROVIDER_ID = 'cmhdkaefz000tll8tnntr4qq9';
const JWT_TOKEN = process.argv[2] || 'YOUR_JWT_TOKEN_HERE';

if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.error('❌ Please provide your JWT token as an argument');
  process.exit(1);
}

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runDetailedTest() {
  console.log('🔍 Microsoft Provider Detailed Test\n');
  console.log('Provider ID:', PROVIDER_ID);
  console.log('');

  // Test 1: Mail Folders
  console.log('📧 Test 1: Microsoft Mail API - List Folders');
  console.log('─'.repeat(60));
  try {
    const result = await makeRequest(`/providers/${PROVIDER_ID}/test/microsoft-mail-folders`);
    console.log(`Status Code: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.log(`❌ Request Error: ${error.message}`);
  }
  console.log('');

  // Test 2: Mail Messages
  console.log('📨 Test 2: Microsoft Mail API - List Messages');
  console.log('─'.repeat(60));
  try {
    const result = await makeRequest(`/providers/${PROVIDER_ID}/test/microsoft-mail-messages`);
    console.log(`Status Code: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.log(`❌ Request Error: ${error.message}`);
  }
  console.log('');

  // Test 3: Calendars
  console.log('📅 Test 3: Microsoft Calendar API - List Calendars');
  console.log('─'.repeat(60));
  try {
    const result = await makeRequest(`/providers/${PROVIDER_ID}/test/microsoft-calendars`);
    console.log(`Status Code: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.log(`❌ Request Error: ${error.message}`);
  }
  console.log('');
}

runDetailedTest().catch(console.error);
