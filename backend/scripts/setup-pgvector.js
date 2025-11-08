const { Client } = require('pg');
require('dotenv').config();

async function setupPgVector() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Install pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✓ pgvector extension installed');

    await client.end();
    console.log('✓ Setup completed successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setupPgVector();
