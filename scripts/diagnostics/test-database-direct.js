const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEmailStorage() {
  try {
    console.log('=== Test diretto database email ===\n');

    // 1. Crea una email di test
    console.log('1. Creo email di test...');
    const testEmail = await prisma.email.create({
      data: {
        tenantId: 'cmhar1fnc000092sxfi7evf1y',
        providerId: 'cmhc66y3r0001u16zzou7qpfe',
        externalId: 'test-' + Date.now(),
        threadId: 'test-thread-123',
        messageId: '<test@example.com>',
        from: 'test@example.com',
        to: ['recipient@example.com'],
        cc: [],
        bcc: [],
        subject: 'Test Email from Script',
        bodyText: 'This is a test email body',
        bodyHtml: '<p>This is a test email body</p>',
        snippet: 'This is a test email...',
        folder: 'INBOX',
        labels: ['test'],
        isRead: false,
        isStarred: false,
        sentAt: new Date(),
        receivedAt: new Date(),
        size: 1024,
        headers: { test: 'header' },
      },
    });

    console.log('✓ Email creata:', testEmail.id);
    console.log('  Subject:', testEmail.subject);
    console.log('  From:', testEmail.from);
    console.log('');

    // 2. Conta totale email
    const total = await prisma.email.count({
      where: { tenantId: 'cmhar1fnc000092sxfi7evf1y' },
    });
    console.log('2. Totale email nel database:', total);
    console.log('');

    // 3. Recupera l'email
    const retrieved = await prisma.email.findFirst({
      where: { id: testEmail.id },
      include: {
        provider: {
          select: {
            email: true,
            providerType: true,
          },
        },
      },
    });

    console.log('3. Email recuperata:');
    console.log('  ID:', retrieved.id);
    console.log('  Subject:', retrieved.subject);
    console.log('  Provider:', retrieved.provider.email, `(${retrieved.provider.providerType})`);
    console.log('');

    // 4. Test upsert (aggiornamento)
    console.log('4. Test upsert (stesso externalId)...');
    const upserted = await prisma.email.upsert({
      where: {
        providerId_externalId: {
          providerId: testEmail.providerId,
          externalId: testEmail.externalId,
        },
      },
      create: {
        // Questo non sarà usato perché l'email esiste già
        ...testEmail,
      },
      update: {
        isRead: true,
      },
    });

    console.log('✓ Email aggiornata (isRead):', upserted.isRead);
    console.log('');

    // 5. Elimina email di test
    console.log('5. Elimino email di test...');
    await prisma.email.delete({
      where: { id: testEmail.id },
    });
    console.log('✓ Email eliminata');
    console.log('');

    console.log('=== Test completato con successo! ===');
    console.log('Lo schema database funziona correttamente.');

  } catch (error) {
    console.error('ERRORE:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailStorage();
