const { PrismaClient } = require('./backend/node_modules/.prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Decrypt function (same as backend)
function decrypt(encryptedText, ivHex) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!', 'utf8');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function checkMicrosoftProvider() {
  try {
    const provider = await prisma.providerConfig.findFirst({
      where: {
        tenantId: 'cmhar1fnc000092sxfi7evf1y',
        providerType: 'microsoft'
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        tokenEncryptionIv: true,
        refreshTokenEncryptionIv: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!provider) {
      console.log('❌ Microsoft provider not found');
      return;
    }

    console.log('\n📋 Microsoft Provider Details:\n');
    console.log(`ID: ${provider.id}`);
    console.log(`Email: ${provider.email}`);
    console.log(`Active: ${provider.isActive ? '✅' : '❌'}`);
    console.log(`Created: ${provider.createdAt.toLocaleString()}`);
    console.log(`Updated: ${provider.updatedAt.toLocaleString()}`);
    console.log('');

    // Check token expiry
    const now = new Date();
    const expiry = provider.tokenExpiresAt;

    console.log('🔐 Token Status:\n');
    console.log(`Token Expiry: ${expiry ? expiry.toLocaleString() : 'NOT SET'}`);

    if (!expiry) {
      console.log('❌ Token expiry not set - PROBLEM!');
    } else if (expiry < now) {
      const diff = Math.floor((now - expiry) / 1000 / 60);
      console.log(`❌ Token EXPIRED ${diff} minutes ago`);
    } else {
      const diff = Math.floor((expiry - now) / 1000 / 60);
      console.log(`✅ Token valid for ${diff} more minutes`);
    }

    console.log('');

    // Check if tokens exist
    console.log('🔑 Token Data:\n');
    console.log(`Access Token: ${provider.accessToken ? '✅ Present' : '❌ MISSING'}`);
    console.log(`Refresh Token: ${provider.refreshToken ? '✅ Present' : '❌ MISSING'}`);
    console.log(`Access Token IV: ${provider.tokenEncryptionIv ? '✅ Present' : '❌ MISSING'}`);
    console.log(`Refresh Token IV: ${provider.refreshTokenEncryptionIv ? '✅ Present' : '❌ MISSING'}`);
    console.log('');

    // Try to decrypt and show token preview (first/last 20 chars)
    if (provider.accessToken && provider.tokenEncryptionIv) {
      try {
        const decryptedToken = decrypt(provider.accessToken, provider.tokenEncryptionIv);
        const preview = decryptedToken.length > 40
          ? `${decryptedToken.substring(0, 20)}...${decryptedToken.substring(decryptedToken.length - 20)}`
          : decryptedToken;
        console.log(`Access Token Preview: ${preview}`);
        console.log(`Token Length: ${decryptedToken.length} characters`);
      } catch (error) {
        console.log(`❌ Failed to decrypt token: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkMicrosoftProvider();
