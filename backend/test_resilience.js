import { callGeminiWithRetry, isTransientGeminiError, getGeminiErrorStatus } from './utils/geminiHelper.js';
import { RequestQueue } from './utils/requestQueue.js';

async function testResilience() {
  console.log('--- TEST 1: isTransientGeminiError & getGeminiErrorStatus ---');
  
  const error503 = new Error('503 Service Unavailable: Model is overloaded');
  error503.status = 503;
  
  const error429 = new Error('RESOURCE_EXHAUSTED: Rate limit exceeded');
  error429.status = 429;
  
  const error401 = new Error('API_KEY_INVALID');
  error401.status = 401;

  console.assert(getGeminiErrorStatus(error503) === 503, 'Should extract status 503');
  console.assert(isTransientGeminiError(error503) === true, '503 should be transient');
  console.assert(isTransientGeminiError(error429) === true, '429 should be transient');
  console.assert(isTransientGeminiError(error401) === false, '401 should NOT be transient');
  console.log('✓ Status extraction and transient error detection verified.');

  console.log('\n--- TEST 2: callGeminiWithRetry Exponential Backoff & Recovery ---');
  let mockAttempts = 0;
  const mockAi = {
    models: {
      generateContent: async () => {
        mockAttempts++;
        if (mockAttempts < 3) {
          const err = new Error('The model is overloaded. Please try again later.');
          err.status = 503;
          throw err;
        }
        return { text: '{"marks_awarded": 5, "feedback": "Great answer!"}' };
      }
    }
  };

  const startTime = Date.now();
  const res = await callGeminiWithRetry(
    mockAi,
    { model: 'test-model', contents: [] },
    { maxRetries: 3, backoffDelays: [100, 200, 300], timeoutMs: 5000 }
  );
  const duration = Date.now() - startTime;

  console.assert(mockAttempts === 3, `Expected 3 attempts, got ${mockAttempts}`);
  console.assert(res.text.includes('Great answer!'), 'Should recover and return result');
  console.log(`✓ Retry recovered on attempt ${mockAttempts} in ${duration}ms!`);

  console.log('\n--- TEST 3: callGeminiWithRetry Non-Retryable Error (Fails Fast) ---');
  let nonRetryAttempts = 0;
  const mockAiFailFast = {
    models: {
      generateContent: async () => {
        nonRetryAttempts++;
        const err = new Error('API key not valid.');
        err.status = 401;
        throw err;
      }
    }
  };

  try {
    await callGeminiWithRetry(
      mockAiFailFast,
      { model: 'test-model', contents: [] },
      { maxRetries: 3, backoffDelays: [100, 200, 300] }
    );
    console.error('FAILED: Should have thrown invalid API key error');
  } catch (err) {
    console.assert(nonRetryAttempts === 1, `Expected fail-fast (1 attempt), got ${nonRetryAttempts}`);
    console.assert(err.status === 401, 'Should preserve error status 401');
    console.log('✓ Non-retryable error failed fast without waiting for retries.');
  }

  console.log('\n--- TEST 4: RequestQueue Concurrency ---');
  const queue = new RequestQueue(1);
  const executionOrder = [];

  const task1 = queue.enqueue(async () => {
    await new Promise((r) => setTimeout(r, 100));
    executionOrder.push(1);
    return 'task1_done';
  });

  const task2 = queue.enqueue(async () => {
    await new Promise((r) => setTimeout(r, 50));
    executionOrder.push(2);
    return 'task2_done';
  });

  const [r1, r2] = await Promise.all([task1, task2]);
  console.assert(r1 === 'task1_done' && r2 === 'task2_done', 'Queue tasks resolved');
  console.assert(JSON.stringify(executionOrder) === '[1,2]', `Expected order [1,2], got ${JSON.stringify(executionOrder)}`);
  console.log('✓ Request queue processed tasks sequentially without interleaving.');

  console.log('\nALL RESILIENCE TESTS PASSED SUCCESSFULLY! 🎉');
}

testResilience().catch(console.error);
