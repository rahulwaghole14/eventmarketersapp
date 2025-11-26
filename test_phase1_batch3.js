const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testPhase1Batch3() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🧪 TESTING PHASE 1 BATCH 3: Subscription Actions', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  const results = { passed: 0, failed: 0 };

  try {
    // Setup: Register and login
    log('📝 Setup: Creating test user...', 'cyan');
    const registerRes = await axios.post(`${BASE_URL}/api/mobile/auth/register`, {
      deviceId: `test_${Date.now()}`,
      name: 'Subscription Test User',
      email: `subtest_${Date.now()}@example.com`,
      phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      password: 'Test@123'
    });
    
    const token = registerRes.data.data?.token;
    const userId = registerRes.data.data?.user?.id;
    
    if (!token) {
      log('❌ Failed to get token', 'red');
      return;
    }
    
    log(`✅ User created with ID: ${userId}\n`, 'green');

    const authHeaders = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    // Test 1: POST /api/mobile/subscriptions/subscribe
    log('1️⃣  Testing: POST /api/mobile/subscriptions/subscribe', 'magenta');
    try {
      const res = await axios.post(`${BASE_URL}/api/mobile/subscriptions/subscribe`, {
        planId: 'monthly_pro',
        paymentMethod: 'razorpay',
        autoRenew: true
      }, authHeaders);
      
      if (res.data.success && res.data.data?.subscriptionId) {
        log('   ✅ PASSED - Subscription created', 'green');
        log(`      Plan: ${res.data.data.planName}`, 'cyan');
        log(`      Status: ${res.data.data.status}`, 'cyan');
        log(`      End Date: ${res.data.data.endDate}`, 'cyan');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      if (error.response?.data) {
        log(`      ${JSON.stringify(error.response.data)}`, 'yellow');
      }
      results.failed++;
    }

    // Test 2: POST /api/mobile/subscriptions/renew
    log('\n2️⃣  Testing: POST /api/mobile/subscriptions/renew', 'magenta');
    try {
      const res = await axios.post(`${BASE_URL}/api/mobile/subscriptions/renew`, {}, authHeaders);
      
      if (res.data.success && res.data.data?.endDate) {
        log('   ✅ PASSED - Subscription renewed', 'green');
        log(`      New End Date: ${res.data.data.endDate}`, 'cyan');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      if (error.response?.data) {
        log(`      ${JSON.stringify(error.response.data)}`, 'yellow');
      }
      results.failed++;
    }

    // Test 3: POST /api/mobile/subscriptions/cancel
    log('\n3️⃣  Testing: POST /api/mobile/subscriptions/cancel', 'magenta');
    try {
      const res = await axios.post(`${BASE_URL}/api/mobile/subscriptions/cancel`, {}, authHeaders);
      
      if (res.data.success) {
        log('   ✅ PASSED - Subscription cancelled', 'green');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      if (error.response?.data) {
        log(`      ${JSON.stringify(error.response.data)}`, 'yellow');
      }
      results.failed++;
    }

    // Summary
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 BATCH 3 TEST SUMMARY', 'cyan');
    log('='.repeat(70), 'cyan');
    log(`\n✅ Passed: ${results.passed}/3`, results.passed === 3 ? 'green' : 'yellow');
    log(`❌ Failed: ${results.failed}/3`, results.failed === 0 ? 'green' : 'red');
    
    if (results.passed === 3) {
      log('\n🎉 BATCH 3 COMPLETE! All 3 endpoints working!', 'green');
      log('✅ Phase 1 is now complete!', 'green');
      log('📊 Total endpoints: 25 (42% of 60 total)', 'cyan');
    } else {
      log(`\n⚠️  ${results.failed} endpoint(s) need fixing`, 'yellow');
    }
    
    log('\n' + '='.repeat(70) + '\n', 'cyan');

  } catch (error) {
    log('\n💥 Test setup failed:', 'red');
    log(error.message, 'red');
  }
}

// Wait for server to start
setTimeout(() => {
  testPhase1Batch3();
}, 3000);
