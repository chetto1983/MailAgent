const axios = require('./backend/node_modules/axios').default;
const { PrismaClient } = require('./backend/node_modules/.prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

(async () => {
  const provider = await prisma.providerConfig.findFirst({
    where: { tenantId: 'cmhar1fnc000092sxfi7evf1y', providerType: 'microsoft' }
  });

  const key = Buffer.from('6h727qBIKgZA5e13ya8UDckB/ltNuMxPzmQma82JFXo=', 'base64');
  const iv = Buffer.from(provider.tokenEncryptionIv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const token = decipher.update(provider.accessToken, 'hex', 'utf8') + decipher.final('utf8');

  console.log('Testing inbox delta endpoint...');
  console.log('');

  try {
    const res = await axios.get('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('WORKS inbox Delta API works!');
    console.log('Messages in first response:', res.data.value.length);
    console.log('Has deltaLink:', res.data['@odata.deltaLink'] ? 'YES' : 'NO');
    console.log('Has nextLink:', res.data['@odata.nextLink'] ? 'YES needs pagination' : 'NO');
  } catch(e) {
    console.log('ERROR:', e.response?.data?.error?.message || e.message);
  }

  await prisma.$disconnect();
})();
