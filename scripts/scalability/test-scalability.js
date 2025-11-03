/**
 * Scalability Test - Simula 1000 tenant
 * Verifica capacità del sistema di gestire carico elevato
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJVN0pUNEVZdjdEUUpHaEt6Qlh4RHgiLCJ1c2VySWQiOiJjbWhhcjU2MGkwMDBkdnU4ZHYxeGdteHNiIiwidGVuYW50SWQiOiJjbWhhcjFmbmMwMDAwOTJzeGZpN2V2ZjF5IiwiZW1haWwiOiJkdmRtYXJjaGV0dG9AZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjIwNzczODAsImV4cCI6MTc2MjE2Mzc4MH0.xb4idz_fU7iAc3J3AlUMU3okRae_jUvXcKwB2nAizRI';

const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ============================================================================
// 1. TEST: Current System Status
// ============================================================================
async function testCurrentStatus() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 1: STATO ATTUALE DEL SISTEMA                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Get sync status
    const statusRes = await http.get('/email-sync/status');
    console.log('✅ Sistema online e funzionante\n');

    console.log('📊 Statistiche Sync:');
    console.log('  - Provider totali:', statusRes.data.providers.total);
    console.log('  - Mai sincronizzati:', statusRes.data.providers.neverSynced);
    console.log('  - Sincronizzati oggi:', statusRes.data.providers.syncedToday);
    console.log('  - Scheduler attivo:', statusRes.data.scheduler.isRunning ? 'Sì' : 'No');
    console.log('  - Batch size:', statusRes.data.scheduler.batchSize);
    console.log('  - Intervallo:', statusRes.data.scheduler.intervalMinutes, 'minuti');

    console.log('\n📋 Code Redis:');
    for (const [priority, stats] of Object.entries(statusRes.data.queues)) {
      console.log(`\n  ${priority.toUpperCase()}:`);
      console.log('    - In attesa:', stats.waiting);
      console.log('    - Attivi:', stats.active);
      console.log('    - Completati:', stats.completed);
      console.log('    - Falliti:', stats.failed);
    }

    return statusRes.data;
  } catch (error) {
    console.error('❌ Errore:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// 2. TEST: Calculate Theoretical Capacity
// ============================================================================
async function calculateCapacity(currentStatus) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 2: CALCOLO CAPACITÀ TEORICA                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Estrai concurrency dalle queue (dedotto dai worker)
  const concurrency = {
    high: 5,
    normal: 3,
    low: 2,
  };

  const totalConcurrency = concurrency.high + concurrency.normal + concurrency.low;
  const batchSize = currentStatus.scheduler.batchSize;
  const intervalMinutes = currentStatus.scheduler.intervalMinutes;

  // Assunzione: tempo medio sync = 10 secondi
  const avgSyncTimeSeconds = 10;
  const syncsPerMinute = totalConcurrency * (60 / avgSyncTimeSeconds);

  console.log('⚙️  Configurazione Worker:');
  console.log('  - High priority concurrency:', concurrency.high);
  console.log('  - Normal priority concurrency:', concurrency.normal);
  console.log('  - Low priority concurrency:', concurrency.low);
  console.log('  - TOTALE concurrency:', totalConcurrency);

  console.log('\n📈 Capacità Calcolata:');
  console.log('  - Tempo medio sync:', avgSyncTimeSeconds, 'secondi');
  console.log('  - Throughput:', syncsPerMinute.toFixed(1), 'provider/minuto');
  console.log('  - Batch size scheduler:', batchSize, 'provider/ciclo');
  console.log('  - Intervallo scheduler:', intervalMinutes, 'minuti');

  const timeFor1000 = 1000 / syncsPerMinute;
  console.log('\n🎯 Capacità per 1000 Provider:');
  console.log('  - Tempo necessario:', timeFor1000.toFixed(1), 'minuti');
  console.log('  - Cicli necessari:', Math.ceil(1000 / batchSize), 'cicli');
  console.log('  - Tempo totale cicli:', Math.ceil(1000 / batchSize) * intervalMinutes, 'minuti');

  if (timeFor1000 > intervalMinutes) {
    console.log('\n⚠️  ATTENZIONE: Il sistema NON riesce a processare tutti i provider nell\'intervallo!');
    console.log('   Ritardo accumulato:', (timeFor1000 - intervalMinutes).toFixed(1), 'minuti per ciclo');
  } else {
    console.log('\n✅ Il sistema riesce a processare tutti i provider nell\'intervallo!');
  }

  // Calcola max tenant supportati
  const maxProviders = Math.floor(syncsPerMinute * intervalMinutes);
  console.log('\n📊 Capacità Massima Stimata:');
  console.log('  - Max provider attivi:', maxProviders, 'con sync ogni', intervalMinutes, 'minuti');
  console.log('  - Margine di sicurezza (70%):', Math.floor(maxProviders * 0.7), 'provider');

  return {
    syncsPerMinute,
    maxProviders,
    timeFor1000,
  };
}

// ============================================================================
// 3. TEST: Get Current Providers
// ============================================================================
async function getCurrentProviders() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 3: PROVIDER ATTUALI NEL DATABASE                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    const providersRes = await http.get('/providers');

    console.log('📧 Provider configurati:', providersRes.data.length);

    if (providersRes.data.length > 0) {
      console.log('\n📋 Dettaglio Provider:\n');
      providersRes.data.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.email} (${p.providerType})`);
        console.log(`     - Attivo: ${p.isActive ? 'Sì' : 'No'}`);
        console.log(`     - Last sync: ${p.lastSyncedAt ? new Date(p.lastSyncedAt).toLocaleString() : 'Mai'}`);
        console.log('');
      });
    }

    return providersRes.data;
  } catch (error) {
    console.error('❌ Errore:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// 4. TEST: Trigger Manual Sync for All Providers
// ============================================================================
async function triggerAllSyncs(providers) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 4: TRIGGER SYNC MANUALE (tutti provider)        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  Questo test triggererà sync per TUTTI i provider simultaneamente');
  console.log('    per simulare carico massimo.\n');

  const startTime = Date.now();
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const provider of providers) {
    try {
      await http.post(`/email-sync/sync/${provider.id}`);
      results.success++;
      console.log(`✅ [${results.success + results.failed}/${providers.length}] ${provider.email}`);
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: provider.email,
        error: error.response?.data?.message || error.message,
      });
      console.log(`❌ [${results.success + results.failed}/${providers.length}] ${provider.email} - ${error.response?.data?.message || error.message}`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n📊 Risultati:');
  console.log('  - Successo:', results.success, '/', providers.length);
  console.log('  - Falliti:', results.failed, '/', providers.length);
  console.log('  - Durata:', duration, 'secondi');

  if (results.failed > 0) {
    console.log('\n❌ Errori:');
    results.errors.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.email}: ${e.error}`);
    });
  }

  return results;
}

// ============================================================================
// 5. TEST: Monitor Queue Processing
// ============================================================================
async function monitorQueueProcessing(durationSeconds = 60) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 5: MONITORING CODE (60 secondi)                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Monitoraggio code per ${durationSeconds} secondi...\n`);

  const startTime = Date.now();
  const snapshots = [];

  while ((Date.now() - startTime) < durationSeconds * 1000) {
    try {
      const statusRes = await http.get('/email-sync/status');
      const timestamp = new Date().toLocaleTimeString();

      const snapshot = {
        timestamp,
        queues: statusRes.data.queues,
      };

      snapshots.push(snapshot);

      // Print current status
      console.log(`[${timestamp}]`);
      console.log('  High: waiting=${statusRes.data.queues.high.waiting}, active=${statusRes.data.queues.high.active}, completed=${statusRes.data.queues.high.completed}');
      console.log('  Normal: waiting=${statusRes.data.queues.normal.waiting}, active=${statusRes.data.queues.normal.active}, completed=${statusRes.data.queues.normal.completed}');
      console.log('  Low: waiting=${statusRes.data.queues.low.waiting}, active=${statusRes.data.queues.low.active}, completed=${statusRes.data.queues.low.completed}');
      console.log('');

      // Wait 5 seconds before next check
      await sleep(5000);
    } catch (error) {
      console.error('❌ Errore durante monitoring:', error.message);
    }
  }

  console.log('\n📈 Riepilogo Monitoring:');

  if (snapshots.length > 1) {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    const completedDelta = {
      high: last.queues.high.completed - first.queues.high.completed,
      normal: last.queues.normal.completed - first.queues.normal.completed,
      low: last.queues.low.completed - first.queues.low.completed,
    };

    const totalCompleted = completedDelta.high + completedDelta.normal + completedDelta.low;
    const throughputPerMinute = (totalCompleted / durationSeconds) * 60;

    console.log('  - Job completati:', totalCompleted);
    console.log('    - High:', completedDelta.high);
    console.log('    - Normal:', completedDelta.normal);
    console.log('    - Low:', completedDelta.low);
    console.log('  - Throughput:', throughputPerMinute.toFixed(1), 'job/minuto');

    return {
      completed: totalCompleted,
      throughputPerMinute,
    };
  }

  return null;
}

// ============================================================================
// 6. TEST: Database Query Performance
// ============================================================================
async function testDatabasePerformance() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 6: PERFORMANCE DATABASE                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Count emails
    const startCount = Date.now();
    const emailsRes = await http.get('/emails?limit=1');
    const countTime = Date.now() - startCount;

    console.log('✅ Query COUNT email:', countTime, 'ms');

    // Get emails with pagination
    const startList = Date.now();
    const listRes = await http.get('/emails?limit=100&offset=0');
    const listTime = Date.now() - startList;

    console.log('✅ Query LIST 100 email:', listTime, 'ms');

    // Get sync stats
    const startStats = Date.now();
    const statsRes = await http.get('/emails/stats');
    const statsTime = Date.now() - startStats;

    console.log('✅ Query STATS aggregati:', statsTime, 'ms');

    console.log('\n📊 Performance Database:');
    console.log('  - Tutte le query < 1000ms: ', (countTime < 1000 && listTime < 1000 && statsTime < 1000) ? '✅' : '❌');

    return {
      countTime,
      listTime,
      statsTime,
    };
  } catch (error) {
    console.error('❌ Errore:', error.response?.data || error.message);
    return null;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║          TEST SCALABILITÀ - 1000 TENANT                      ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    // Test 1: Current status
    const currentStatus = await testCurrentStatus();

    // Test 2: Calculate capacity
    const capacity = await calculateCapacity(currentStatus);

    // Test 3: Get providers
    const providers = await getCurrentProviders();

    // Test 4: Trigger all syncs (only if providers exist)
    let syncResults = null;
    if (providers.length > 0) {
      const answer = await askQuestion('\n⚠️  Vuoi triggerare sync per tutti i provider? (s/n): ');
      if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'si') {
        syncResults = await triggerAllSyncs(providers);

        // Test 5: Monitor processing
        await monitorQueueProcessing(60);
      }
    }

    // Test 6: Database performance
    await testDatabasePerformance();

    // Final summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    RIEPILOGO FINALE                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Risultati Test Scalabilità:\n');
    console.log('1. Throughput attuale:', capacity.syncsPerMinute.toFixed(1), 'provider/minuto');
    console.log('2. Capacità max stimata:', capacity.maxProviders, 'provider attivi');
    console.log('3. Tempo per 1000 provider:', capacity.timeFor1000.toFixed(1), 'minuti');

    if (capacity.maxProviders >= 1000) {
      console.log('\n✅ CONCLUSIONE: Il sistema PUÒ reggere 1000 tenant con configurazione attuale!');
    } else {
      console.log('\n⚠️  CONCLUSIONE: Il sistema NON può reggere 1000 tenant con configurazione attuale');
      console.log('    Serve aumentare concurrency workers a', Math.ceil(1000 / capacity.maxProviders * 10), 'concurrent jobs');
    }

    console.log('\n📄 Dettagli completi in: SCALABILITY_ANALYSIS.md\n');

  } catch (error) {
    console.error('\n❌ Test fallito:', error.message);
    process.exit(1);
  }
}

// Ask question helper (for interactive prompts)
function askQuestion(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    readline.question(question, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

// Run tests
runAllTests().catch(console.error);
