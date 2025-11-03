/**
 * Test Microsoft Delta Link
 */

const axios = require('./backend/node_modules/axios').default;
const { PrismaClient } = require('./backend/node_modules/.prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function decrypt(encryptedText, ivHex) {
  const keyBase64 = process.env.AES_SECRET_KEY || '6h727qBIKgZA5e13ya8UDckB/ltNuMxPzmQma82JFXo=';
  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function testDeltaLink() {
  try {
    console.log('🔍 Testing Microsoft Delta Link\n');

    // Get provider
    const provider = await prisma.providerConfig.findFirst({
      where: {
        tenantId: 'cmhar1fnc000092sxfi7evf1y',
        providerType: 'microsoft'
      }
    });

    const accessToken = decrypt(provider.accessToken, provider.tokenEncryptionIv);

    console.log('📤 Calling Delta API...\n');

    const deltaUrl = 'https://graph.microsoft.com/v1.0/me/messages/delta';

    const deltaResponse = await axios.get(deltaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log(`✅ Delta API call successful`);
    console.log(`Items in first page: ${deltaResponse.data.value.length}`);
    console.log(`Has @odata.nextLink: ${deltaResponse.data['@odata.nextLink'] ? '✅' : '❌'}`);
    console.log(`Has @odata.deltaLink: ${deltaResponse.data['@odata.deltaLink'] ? '✅' : '❌'}`);
    console.log('');

    if (deltaResponse.data['@odata.deltaLink']) {
      console.log('✅ DeltaLink obtained on first call');
      console.log(`DeltaLink: ${deltaResponse.data['@odata.deltaLink'].substring(0, 80)}...`);
    } else if (deltaResponse.data['@odata.nextLink']) {
      console.log('⚠️  Need to paginate to get deltaLink');
      console.log('This will iterate through ALL messages in mailbox...');
      console.log('With 3077 messages, this could take a while!');

      let pageCount = 1;
      let nextLink = deltaResponse.data['@odata.nextLink'];

      console.log('\n🔄 Paginating (max 5 pages for test)...\n');

      while (nextLink && pageCount < 5) {
        pageCount++;
        console.log(`Page ${pageCount}...`);

        const nextResponse = await axios.get(nextLink, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        console.log(`  Items: ${nextResponse.data.value.length}`);

        if (nextResponse.data['@odata.deltaLink']) {
          console.log(`  ✅ Got deltaLink!`);
          break;
        }

        nextLink = nextResponse.data['@odata.nextLink'];
      }

      if (pageCount >= 5) {
        console.log('\n⚠️  Stopped after 5 pages (test limit)');
        console.log('⚠️  Full sync would need to paginate through ALL messages!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDeltaLink();
