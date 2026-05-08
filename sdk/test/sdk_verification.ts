import { AnyWaysClient } from '../index.ts';
import { createClient } from '@supabase/supabase-js';

/**
 * anyWays SDK Test Suite (Node.js/TSX Compatible)
 * ──────────────────────────────────────────────
 */

const API_KEY = process.env.ANYWAYS_API_KEY || 'your_test_key';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zqkwjitdydbsorovhazw.supabase.co';
const BASE_URL = `${SUPABASE_URL}/functions/v1/`;
const PLACE_ID = process.env.TEST_PLACE_ID || '6b20366c-f176-44d4-91f0-1155f8b9ca56';

// Initialize a minimal supabase client for realtime testing
const supabase = createClient(SUPABASE_URL, 'placeholder-anon-key');

const client = new AnyWaysClient(API_KEY, { baseUrl: BASE_URL });

async function runTests() {
  console.log('🚀 Starting anyWays SDK Verification Suite...');

  // --- 1. Signal Ingestion Success ---
  try {
    console.log('\n[Test 1] Testing Signal Ingestion...');
    const result = await client.signals.sendSignal({
      place_id: PLACE_ID,
      signal_type: 'FOOT_TRAFFIC',
      signal_value: { count: 42, method: 'sensor_v1' }
    });
    console.log('✅ Success! New Score:', result.newScore);
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
  }

  // --- 2. SDK Retry Logic ---
  try {
    console.log('\n[Test 2] Testing SDK Retry Logic (Timeout simulation)...');
    // We pass an impossibly short timeout to trigger a retryable AbortError
    await client.signals.sendSignal({
      place_id: PLACE_ID,
      signal_type: 'HOURS_VERIFIED',
      signal_value: 'checked'
    }, { timeoutMs: 1 }); // 1ms will almost certainly timeout
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('✅ Success! SDK correctly aborted after 1ms.');
    } else {
      console.log('ℹ️ SDK might have succeeded before timeout, or failed with:', err.message);
    }
  }

  // --- 3. Rate Limit Exceeded ---
  try {
    console.log('\n[Test 3] Testing Rate Limit Exceeded (Hammering API)...');
    console.log('   (Sending 10 rapid requests to trigger 429)');
    const requests = Array.from({ length: 10 }).map(() => 
      client.signals.sendSignal({
        place_id: PLACE_ID,
        signal_type: 'SOCIAL_SENTIMENT',
        signal_value: 'neutral'
      })
    );
    
    await Promise.all(requests);
    console.log('ℹ️ No rate limit hit (check your bucket capacity settings).');
  } catch (err) {
    if (err.status === 429) {
      console.log('✅ Success! Caught 429 RateLimitError.');
      console.log('   Retry-After:', err.retryAfter);
    } else {
      console.error('❌ Test 3 unexpected error:', err.message);
    }
  }

  // --- 4. Realtime Event Received ---
  console.log('\n[Test 4] Testing Realtime Subscription...');
  const realtime = client.getRealtime(supabase as any, 'your-user-id');
  
  let signalReceived = false;
  realtime.subscribe((signal) => {
    console.log('✅ Success! Realtime signal received:', signal.signal_type);
    signalReceived = true;
  });

  console.log('   (Waiting 5s for an event. Send a signal via another client to trigger...)');
  
  setTimeout(() => {
    if (!signalReceived) {
      console.log('ℹ️ No realtime event received in 5s window.');
    }
    realtime.unsubscribe();
    console.log('\n🏁 Test Suite Finished.');
    process.exit(0);
  }, 5000);
}

runTests();
