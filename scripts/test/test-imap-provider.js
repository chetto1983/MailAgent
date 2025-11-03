/**
 * Test script for Generic IMAP/SMTP Provider
 * This script will test IMAP and SMTP connections
 */

const https = require('http');

const API_URL = 'http://localhost:3000';
const PROVIDER_ID = 'cmhdjnga00007101psc89ylky'; // The Generic provider ID from database

// You need to provide your JWT token here
const JWT_TOKEN = process.argv[2] || 'YOUR_JWT_TOKEN_HERE';

if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.error('❌ Please provide your JWT token as an argument:');
  console.error('   node test-imap-provider.js YOUR_JWT_TOKEN');
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${json.message || data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
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
  console.log('🚀 Starting Generic IMAP/SMTP Provider Tests\n');
  console.log('═'.repeat(60));
  console.log('');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: IMAP Connection
  console.log('📧 Test 1: IMAP Connection Test');
  console.log('─'.repeat(60));
  try {
    const result = await makeRequest(`/providers/${PROVIDER_ID}/test/imap-connection`);
    if (result.success) {
      console.log('✅ Success!');
      console.log(`   Host: ${result.host}:${result.port}`);
      console.log(`   Message: ${result.message}`);
      passedTests++;
    } else {
      console.log('❌ Failed!');
      console.log(`   Message: ${result.message}`);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Error!');
    console.log(`   ${error.message}`);
    failedTests++;
  }
  console.log('');

  // Test 2: IMAP Folders
  console.log('📂 Test 2: IMAP Folders - List Folders');
  console.log('─'.repeat(60));
  try {
    const result = await makeRequest(`/providers/${PROVIDER_ID}/test/imap-folders`);
    if (result.success) {
      console.log('✅ Success!');
      console.log(`Found ${result.count} folders:`);
      result.folders.slice(0, 10).forEach(folder => {
        console.log(`   - ${folder}`);
      });
      if (result.folders.length > 10) {
        console.log(`   ... and ${result.folders.length - 10} more`);
      }
      passedTests++;
    } else {
      console.log('❌ Failed!');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Error!');
    console.log(`   ${error.message}`);
    failedTests++;
  }
  console.log('');

  // Test 3: IMAP Messages
  console.log('📨 Test 3: IMAP Messages - Fetch Recent Messages');
  console.log('─'.repeat(60));
  try {
    const result = await makeRequest(`/providers/${PROVIDER_ID}/test/imap-messages`);
    if (result.success) {
      console.log('✅ Success!');
      console.log(`Found ${result.count} messages:\n`);
      result.messages.slice(0, 5).forEach((msg, index) => {
        console.log(`   ${index + 1}. From: ${msg.from}`);
        console.log(`      Subject: ${msg.subject}`);
        console.log(`      Date: ${new Date(msg.date).toLocaleString()}`);
        const flags = Array.isArray(msg.flags) ? msg.flags.join(', ') : (msg.flags ? Array.from(msg.flags).join(', ') : 'none');
        console.log(`      Flags: ${flags || 'none'}`);
        console.log('');
      });
      if (result.messages.length > 5) {
        console.log(`   ... and ${result.messages.length - 5} more messages`);
      }
      passedTests++;
    } else {
      console.log('❌ Failed!');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Error!');
    console.log(`   ${error.message}`);
    failedTests++;
  }
  console.log('');

  // Test 4: SMTP Connection
  console.log('📤 Test 4: SMTP Connection Test');
  console.log('─'.repeat(60));
  try {
    const result = await makeRequest(`/providers/${PROVIDER_ID}/test/smtp-connection`);
    if (result.success) {
      console.log('✅ Success!');
      console.log(`   Host: ${result.host}:${result.port}`);
      console.log(`   Message: ${result.message}`);
      passedTests++;
    } else {
      console.log('❌ Failed!');
      console.log(`   Message: ${result.message}`);
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Error!');
    console.log(`   ${error.message}`);
    failedTests++;
  }
  console.log('');

  // Summary
  console.log('═'.repeat(60));
  console.log('📊 Test Summary');
  console.log('─'.repeat(60));
  console.log(`Total Tests: ${passedTests + failedTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('═'.repeat(60));

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
