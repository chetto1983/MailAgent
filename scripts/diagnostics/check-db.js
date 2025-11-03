const { Client } = require('pg');

async function checkDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'mailagent',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('✓ Connesso al database\n');

    // Check if emails table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'emails'
      );
    `);
    console.log('Tabella emails esiste:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Count total emails
      const countResult = await client.query('SELECT COUNT(*) FROM emails');
      console.log('Totale email nel database:', countResult.rows[0].count);

      // Get first 5 emails
      const emailsResult = await client.query(`
        SELECT id, "externalId", "from", subject, "receivedAt", "isRead"
        FROM emails
        ORDER BY "receivedAt" DESC
        LIMIT 5
      `);

      if (emailsResult.rows.length > 0) {
        console.log('\nPrime 5 email:');
        emailsResult.rows.forEach((email, i) => {
          console.log(`${i + 1}. [${email.externalId}] ${email.from}`);
          console.log(`   Subject: ${email.subject}`);
          console.log(`   Received: ${email.receivedAt}`);
          console.log(`   Read: ${email.isRead}`);
          console.log('');
        });
      } else {
        console.log('\n⚠️ Nessuna email trovata nel database');
      }

      // Check by tenantId
      const byTenantResult = await client.query(`
        SELECT COUNT(*) FROM emails WHERE "tenantId" = $1
      `, ['cmhar1fnc000092sxfi7evf1y']);
      console.log('Email per il tenant:', byTenantResult.rows[0].count);
    }

  } catch (error) {
    console.error('Errore:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
