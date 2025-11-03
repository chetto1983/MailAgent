/**
 * Test script for Mistral API
 * This script will diagnose Mistral API connection issues
 */

const { Mistral } = require('@mistralai/mistralai');

// Load from .env or use directly
const API_KEY = process.env.MISTRAL_API_KEY || '50yMLyTFFOyyqc1AqMLpE6Y5N4tT5GPW';
const MODEL = process.env.MISTRAL_MODEL || 'mistral-medium-latest';

console.log('🔍 Mistral API Diagnostic Test\n');
console.log('═'.repeat(60));

async function testMistralAPI() {
  // Test 1: API Key validation
  console.log('\n📋 Test 1: API Key Validation');
  console.log('─'.repeat(60));
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log(`Model: ${MODEL}`);

  if (!API_KEY || API_KEY === 'your-mistral-api-key-here') {
    console.log('❌ FAILED: API key not configured');
    process.exit(1);
  }
  console.log('✅ API key is configured');

  // Test 2: Create Mistral client
  console.log('\n🔧 Test 2: Create Mistral Client');
  console.log('─'.repeat(60));

  let mistralClient;
  try {
    mistralClient = new Mistral({
      apiKey: API_KEY,
    });
    console.log('✅ Mistral client created successfully');
  } catch (error) {
    console.log('❌ FAILED: Cannot create Mistral client');
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }

  // Test 3: List available models
  console.log('\n📚 Test 3: List Available Models');
  console.log('─'.repeat(60));

  try {
    const modelsResponse = await mistralClient.models.list();
    console.log('✅ Successfully retrieved models list');
    console.log(`Found ${modelsResponse.data?.length || 0} models:`);

    if (modelsResponse.data && modelsResponse.data.length > 0) {
      modelsResponse.data.slice(0, 10).forEach(model => {
        const isTargetModel = model.id === MODEL;
        const marker = isTargetModel ? '👉' : '  ';
        console.log(`   ${marker} ${model.id}`);
      });

      // Check if target model exists
      const modelExists = modelsResponse.data.some(m => m.id === MODEL);
      if (!modelExists) {
        console.log(`\n⚠️  WARNING: Target model "${MODEL}" not found in available models!`);
        console.log('   Available models that might work:');
        const alternatives = modelsResponse.data
          .filter(m => m.id.includes('mistral') || m.id.includes('medium') || m.id.includes('large'))
          .slice(0, 5);
        alternatives.forEach(m => console.log(`      - ${m.id}`));
      } else {
        console.log(`\n✅ Target model "${MODEL}" is available`);
      }
    }
  } catch (error) {
    console.log('⚠️  WARNING: Cannot list models (this may be normal)');
    console.log(`Error: ${error.message}`);
    if (error.statusCode) {
      console.log(`Status Code: ${error.statusCode}`);
    }
  }

  // Test 4: Simple chat completion
  console.log('\n💬 Test 4: Simple Chat Completion');
  console.log('─'.repeat(60));

  try {
    console.log('Sending test message to Mistral...');
    const completion = await mistralClient.chat.complete({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, I am working!" and nothing else.',
        },
      ],
      temperature: 0.7,
      maxTokens: 50,
    });

    const response = completion.choices?.[0]?.message?.content;
    console.log('✅ SUCCESS: Mistral API is working!');
    console.log(`Response: "${response}"`);
    console.log(`\nModel used: ${completion.model}`);
    console.log(`Tokens used: ${completion.usage?.totalTokens || 'N/A'}`);

  } catch (error) {
    console.log('❌ FAILED: Chat completion error');
    console.log(`Error: ${error.message}`);

    if (error.statusCode) {
      console.log(`Status Code: ${error.statusCode}`);

      if (error.statusCode === 401) {
        console.log('\n🔴 ERROR: Invalid API key (401 Unauthorized)');
        console.log('   - Check that your API key is correct');
        console.log('   - Verify the key is active in your Mistral dashboard');
        console.log('   - Get your key at: https://console.mistral.ai/');
      } else if (error.statusCode === 403) {
        console.log('\n🔴 ERROR: Access forbidden (403)');
        console.log('   - Your API key may not have permission for this model');
        console.log('   - Try a different model (e.g., "mistral-small-latest")');
      } else if (error.statusCode === 404) {
        console.log('\n🔴 ERROR: Model not found (404)');
        console.log(`   - Model "${MODEL}" does not exist`);
        console.log('   - Try: "mistral-small-latest" or "mistral-large-latest"');
      } else if (error.statusCode === 429) {
        console.log('\n🔴 ERROR: Rate limit exceeded (429)');
        console.log('   - You have hit the API rate limit');
        console.log('   - Wait a few minutes and try again');
      } else if (error.statusCode >= 500) {
        console.log('\n🔴 ERROR: Mistral API server error (5xx)');
        console.log('   - Mistral service is experiencing issues');
        console.log('   - Try again in a few minutes');
        console.log('   - Check status at: https://status.mistral.ai/');
      }
    }

    if (error.body) {
      console.log('\nFull error body:');
      console.log(JSON.stringify(error.body, null, 2));
    }

    process.exit(1);
  }

  // Test 5: Embedding generation
  console.log('\n🧩 Test 5: Embedding Generation');
  console.log('─'.repeat(60));

  try {
    console.log('Generating test embedding...');
    const embeddingResponse = await mistralClient.embeddings.create({
      model: 'mistral-embed',
      inputs: 'This is a test for embedding generation',
    });

    const embedding = embeddingResponse.data?.[0]?.embedding;
    if (!embedding || embedding.length === 0) {
      console.log('⚠️  WARNING: Embedding response is empty');
    } else {
      console.log('✅ SUCCESS: Embedding generated');
      console.log(`Embedding dimensions: ${embedding.length}`);
      console.log(`First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}, ...]`);
    }
  } catch (error) {
    console.log('⚠️  WARNING: Cannot generate embeddings');
    console.log(`Error: ${error.message}`);
    if (error.statusCode) {
      console.log(`Status Code: ${error.statusCode}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 All critical tests passed!');
  console.log('\n✅ Mistral API is configured correctly and working.');
  console.log('   If you still see errors in your app, check:');
  console.log('   1. Backend is using the correct .env file');
  console.log('   2. Backend was restarted after .env changes');
  console.log('   3. ConfigService is loading MISTRAL_API_KEY correctly');
}

testMistralAPI().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
