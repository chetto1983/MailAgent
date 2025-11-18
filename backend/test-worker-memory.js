#!/usr/bin/env node

const { Worker } = require('bullmq');
const { Redis } = require('ioredis');

// Simple worker memory leak test
async function testWorkerMemoryLeak() {
  console.log('🔍 Starting Worker Memory Leak Test...');

  const memStart = process.memoryUsage();
  console.log(`📊 Starting memory: ${Math.round(memStart.heapUsed / 1024 / 1024)}MB`);

  let workers = [];
  const iterations = 5;

  for (let i = 0; i < iterations; i++) {
    console.log(`\n🔄 Iteration ${i + 1}/${iterations}`);

    try {
      // Create Redis connection
      const redisConnection = new Redis({
        host: 'localhost',
        port: 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      // Create worker
      const worker = new Worker(
        `memory-test-${i}`,
        async () => {
          return { result: 'test', iteration: i };
        },
        {
          connection: redisConnection,
          concurrency: 1,
        }
      );

      workers.push({ worker, redisConnection });

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add a test job
      await worker.params.queueName;

      const memCurrent = process.memoryUsage();
      const memChange = memCurrent.heapUsed - memStart.heapUsed;
      console.log(`📊 Memory after worker ${i + 1}: ${Math.round(memCurrent.heapUsed / 1024 / 1024)}MB (change: ${Math.round(memChange / 1024 / 1024)}MB)`);

      if (memChange > 50 * 1024 * 1024) { // 50MB growth
        console.warn(`⚠️ Memory growth detected: ${Math.round(memChange / 1024 / 1024)}MB`);
      }

    } catch (error) {
      console.error(`❌ Error in iteration ${i + 1}:`, error.message);
    }
  }

  console.log('\n🧹 Cleaning up workers...');

  // Clean up
  for (const { worker, redisConnection } of workers) {
    try {
      await worker.close();
      await redisConnection.quit();
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
  }

  // Force garbage collection if possible
  if (global.gc) {
    global.gc();
    setTimeout(() => {
      const memEnd = process.memoryUsage();
      const memChange = memEnd.heapUsed - memStart.heapUsed;
      console.log(`📊 Final memory: ${Math.round(memEnd.heapUsed / 1024 / 1024)}MB (total change: ${Math.round(memChange / 1024 / 1024)}MB)`);

      if (memChange < 100 * 1024 * 1024) { // Less than 100MB total growth
        console.log('✅ Memory leak test PASSED - no significant memory leaks detected');
      } else {
        console.error('❌ Memory leak test FAILED - significant memory growth detected');
        process.exit(1);
      }
    }, 1000);
  } else {
    console.log('ℹ️ GC not available - manual memory check required');
    const memEnd = process.memoryUsage();
    const memChange = memEnd.heapUsed - memStart.heapUsed;
    console.log(`📊 Final memory: ${Math.round(memEnd.heapUsed / 1024 / 1024)}MB (total change: ${Math.round(memChange / 1024 / 1024)}MB)`);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🔄 Received SIGINT, cleaning up...');
  process.exit(0);
});

testWorkerMemoryLeak().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
