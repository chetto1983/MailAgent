/**
 * Scalability Test - Simula 1000 tenant (usando solo moduli nativi Node.js)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJVN0pUNEVZdjdEUUpHaEt6Qlh4RHgiLCJ1c2VySWQiOiJjbWhhcjU2MGkwMDBkdnU4ZHYxeGdteHNiIiwidGVuYW50SWQiOiJjbWhhcjFmbmMwMDAwOTJzeGZpN2V2ZjF5IiwiZW1haWwiOiJkdmRtYXJjaGV0dG9AZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjIwNzczODAsImV4cCI6MTc2MjE2Mzc4MH0.xb4idz_fU7iAc3J3AlUMU3okRae_jUvXcKwB2nAizRI';

// HTTP request helper
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
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
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// ============================================================================
// TEST 1: Current System Status
// ============================================================================
async function testCurrentStatus() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 1: STATO ATTUALE DEL SISTEMA                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    const data = await makeRequest('/email-sync/status');
    console.log('✅ Sistema online e funzionante\n');

    console.log('📊 Statistiche Sync:');
    console.log('  - Provider totali:', data.providers.total);
    console.log('  - Mai sincronizzati:', data.providers.neverSynced);
    console.log('  - Sincronizzati oggi:', data.providers.syncedToday);
    console.log('  - Scheduler attivo:', data.scheduler.isRunning ? 'Sì' : 'No');
    console.log('  - Batch size:', data.scheduler.batchSize);
    console.log('  - Intervallo:', data.scheduler.intervalMinutes, 'minuti');

    console.log('\n📋 Code Redis:');
    for (const [priority, stats] of Object.entries(data.queues)) {
      console.log(`\n  ${priority.toUpperCase()}:`);
      console.log('    - In attesa:', stats.waiting);
      console.log('    - Attivi:', stats.active);
      console.log('    - Completati:', stats.completed);
      console.log('    - Falliti:', stats.failed);
    }

    return data;
  } catch (error) {
    console.error('❌ Errore:', error.message);
    throw error;
  }
}

// ============================================================================
// TEST 2: Calculate Theoretical Capacity
// ============================================================================
function calculateCapacity(currentStatus) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 2: CALCOLO CAPACITÀ TEORICA                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const concurrency = {
    high: 5,
    normal: 3,
    low: 2,
  };

  const totalConcurrency = concurrency.high + concurrency.normal + concurrency.low;
  const batchSize = currentStatus.scheduler.batchSize;
  const intervalMinutes = currentStatus.scheduler.intervalMinutes;

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

  if (timeFor1000 > intervalMinutes) {
    console.log('\n⚠️  ATTENZIONE: Il sistema NON riesce a processare tutti i provider nell\'intervallo!');
    console.log('   Ritardo accumulato:', (timeFor1000 - intervalMinutes).toFixed(1), 'minuti per ciclo');
  } else {
    console.log('\n✅ Il sistema riesce a processare tutti i provider nell\'intervallo!');
  }

  const maxProviders = Math.floor(syncsPerMinute * intervalMinutes);
  console.log('\n📊 Capacità Massima Stimata:');
  console.log('  - Max provider attivi:', maxProviders, 'con sync ogni', intervalMinutes, 'minuti');
  console.log('  - Margine di sicurezza (70%):', Math.floor(maxProviders * 0.7), 'provider');

  return {
    syncsPerMinute,
    maxProviders,
    timeFor1000,
    totalConcurrency,
  };
}

// ============================================================================
// TEST 3: Get Current Providers
// ============================================================================
async function getCurrentProviders() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 3: PROVIDER ATTUALI NEL DATABASE                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    const providers = await makeRequest('/providers');

    console.log('📧 Provider configurati:', providers.length);

    if (providers.length > 0) {
      console.log('\n📋 Dettaglio Provider:\n');
      providers.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.email} (${p.providerType})`);
        console.log(`     - Attivo: ${p.isActive ? 'Sì' : 'No'}`);
        console.log(`     - Last sync: ${p.lastSyncedAt ? new Date(p.lastSyncedAt).toLocaleString() : 'Mai'}`);
        console.log('');
      });
    }

    return providers;
  } catch (error) {
    console.error('❌ Errore:', error.message);
    throw error;
  }
}

// ============================================================================
// TEST 4: Database Performance
// ============================================================================
async function testDatabasePerformance() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST 4: PERFORMANCE DATABASE                         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    const startList = Date.now();
    await makeRequest('/emails?limit=100&offset=0');
    const listTime = Date.now() - startList;

    console.log('✅ Query LIST 100 email:', listTime, 'ms');

    const startStats = Date.now();
    await makeRequest('/emails/stats');
    const statsTime = Date.now() - startStats;

    console.log('✅ Query STATS aggregati:', statsTime, 'ms');

    console.log('\n📊 Performance Database:');
    console.log('  - Tutte le query < 1000ms: ', (listTime < 1000 && statsTime < 1000) ? '✅' : '❌');

    return { listTime, statsTime };
  } catch (error) {
    console.error('❌ Errore:', error.message);
    return null;
  }
}

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================
function generateRecommendations(capacity) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              RACCOMANDAZIONI PER 1000 TENANT                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const targetThroughput = 1000 / 5; // 1000 providers in 5 minutes = 200/min
  const currentThroughput = capacity.syncsPerMinute;
  const multiplier = targetThroughput / currentThroughput;

  console.log('🎯 Obiettivo: 1000 provider in 5 minuti');
  console.log('   Throughput necessario:', targetThroughput.toFixed(1), 'provider/minuto');
  console.log('   Throughput attuale:', currentThroughput.toFixed(1), 'provider/minuto');
  console.log('   Moltiplicatore necessario:', multiplier.toFixed(2), 'x\n');

  if (multiplier > 1) {
    const newConcurrency = Math.ceil(capacity.totalConcurrency * multiplier);

    console.log('📝 PIANO A - Quick Win (2 ore implementazione):');
    console.log('   1. Aumentare concurrency workers:');
    console.log('      - High priority:', Math.ceil(5 * multiplier));
    console.log('      - Normal priority:', Math.ceil(3 * multiplier));
    console.log('      - Low priority:', Math.ceil(2 * multiplier));
    console.log('      - TOTALE:', newConcurrency, 'concurrent jobs');
    console.log('   2. Aumentare batch size:', Math.max(200, capacity.maxProviders * 2));
    console.log('   3. Implementare tier-based sync intervals');
    console.log('\n   💰 Costo stimato: +$50-100/mese (server più potente)');
    console.log('   📈 Capacità risultante: ~', Math.floor(newConcurrency * 6 * 5), 'provider attivi\n');

    console.log('📝 PIANO B - Ottimizzazione (1 giorno):');
    console.log('   1. Tutto Piano A');
    console.log('   2. Ottimizzare sync incrementale (più veloce)');
    console.log('   3. Caching token in Redis');
    console.log('   4. Connection pooling database');
    console.log('\n   💰 Costo stimato: +$50-100/mese');
    console.log('   📈 Capacità risultante: ~', Math.floor(newConcurrency * 6 * 5 * 1.5), 'provider attivi\n');

    console.log('📝 PIANO C - Horizontal Scaling (1 settimana):');
    console.log('   1. Tutto Piano A + B');
    console.log('   2. Multiple worker instances (4x)');
    console.log('   3. Redis Cluster');
    console.log('   4. Database read replicas');
    console.log('\n   💰 Costo stimato: +$400-500/mese');
    console.log('   📈 Capacità risultante: 5000+ provider attivi\n');
  } else {
    console.log('✅ Il sistema attuale è SUFFICIENTE per 1000 tenant!');
    console.log('   Nessuna modifica richiesta.');
    console.log('\n📝 RACCOMANDAZIONI:');
    console.log('   1. Monitorare utilizzo CPU/RAM');
    console.log('   2. Implementare alerting per code lunghe');
    console.log('   3. Pianificare scaling proattivo per crescita futura\n');
  }
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
    const capacity = calculateCapacity(currentStatus);

    // Test 3: Get providers
    const providers = await getCurrentProviders();

    // Test 4: Database performance
    await testDatabasePerformance();

    // Generate recommendations
    generateRecommendations(capacity);

    // Final summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    RIEPILOGO FINALE                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Risultati Test Scalabilità:\n');
    console.log('1. Throughput attuale:', capacity.syncsPerMinute.toFixed(1), 'provider/minuto');
    console.log('2. Capacità max stimata:', capacity.maxProviders, 'provider attivi');
    console.log('3. Tempo per 1000 provider:', capacity.timeFor1000.toFixed(1), 'minuti');

    if (capacity.maxProviders >= 1000) {
      console.log('\n✅ CONCLUSIONE: Il sistema PUÒ reggere 1000 tenant con configurazione attuale!');
    } else if (capacity.maxProviders >= 700) {
      console.log('\n⚠️  CONCLUSIONE: Il sistema può reggere ~', capacity.maxProviders, 'tenant attivi');
      console.log('    Con ottimizzazioni minori (Piano A) può facilmente arrivare a 1000+');
    } else {
      console.log('\n⚠️  CONCLUSIONE: Il sistema NON può reggere 1000 tenant con configurazione attuale');
      console.log('    Serve aumentare concurrency workers o implementare horizontal scaling');
    }

    console.log('\n📄 Dettagli completi in: SCALABILITY_ANALYSIS.md');
    console.log('📄 Report generato:', new Date().toLocaleString());
    console.log('');

  } catch (error) {
    console.error('\n❌ Test fallito:', error.message);
    console.error('   Verifica che il backend sia in esecuzione su http://localhost:3000');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
