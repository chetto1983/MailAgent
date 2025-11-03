/**
 * Test diretto Microsoft API
 */

const axios = require('./backend/node_modules/axios').default;
const { PrismaClient } = require('./backend/node_modules/.prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function decrypt(encryptedText, ivHex) {
  // Use AES_SECRET_KEY from .env (base64 encoded)
  const keyBase64 = process.env.AES_SECRET_KEY || '6h727qBIKgZA5e13ya8UDckB/ltNuMxPzmQma82JFXo=';
  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function testMicrosoftDirect() {
  try {
    console.log('🔍 Testing Microsoft API Direct\n');

    // Get provider
    const provider = await prisma.providerConfig.findFirst({
      where: {
        tenantId: 'cmhar1fnc000092sxfi7evf1y',
        providerType: 'microsoft'
      }
    });

    if (!provider) {
      console.log('❌ Provider not found');
      return;
    }

    console.log(`Provider: ${provider.email}`);
    console.log(`Token exists: ${provider.accessToken ? '✅' : '❌'}`);
    console.log(`IV exists: ${provider.tokenEncryptionIv ? '✅' : '❌'}`);
    console.log('');

    if (!provider.accessToken || !provider.tokenEncryptionIv) {
      console.log('❌ Missing token or IV');
      return;
    }

    // Decrypt token
    let accessToken;
    try {
      accessToken = decrypt(provider.accessToken, provider.tokenEncryptionIv);
      console.log(`✅ Token decrypted successfully (${accessToken.length} chars)`);
    } catch (error) {
      console.log(`❌ Failed to decrypt token: ${error.message}`);
      return;
    }

    console.log('');
    console.log('📤 Calling Microsoft Graph API...\n');

    // Test API call
    try {
      const response = await axios.get(
        'https://graph.microsoft.com/v1.0/me/messages?$top=5',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log(`✅ API call successful`);
      console.log(`Messages found: ${response.data.value.length}`);
      console.log('');

      if (response.data.value.length > 0) {
        console.log('First message:');
        const msg = response.data.value[0];
        console.log(`  Subject: ${msg.subject}`);
        console.log(`  From: ${msg.from?.emailAddress?.address}`);
        console.log(`  Date: ${msg.receivedDateTime}`);
      }

    } catch (error) {
      console.log(`❌ API call failed`);
      console.log(`Status: ${error.response?.status}`);
      console.log(`Error: ${error.response?.data?.error?.message || error.message}`);
      console.log('');

      if (error.response?.status === 401) {
        console.log('⚠️  Token expired or invalid - needs refresh');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMicrosoftDirect();
