const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testNewEndpoints() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🧪 TESTING 5 NEW ENDPOINTS', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  let token = null;
  let userId = null;

  // First, register and login to get a token for authenticated endpoints
  try {
    log('📝 Setting up authentication...', 'cyan');
    const registerRes = await axios.post(`${BASE_URL}/api/mobile/auth/register`, {
      deviceId: `test_${Date.now()}`,
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      password: 'Test@123'
    });
    
    token = registerRes.data.data?.token;
    userId = registerRes.data.data?.user?.id;
    log(`✅ Got token and user ID: ${userId}\n`, 'green');
  } catch (error) {
    log(`⚠️  Using without auth: ${error.message}\n`, 'yellow');
  }

  const results = { passed: 0, failed: 0 };

  // Test 1: Home Featured Content
  log('1️⃣  Testing: GET /api/mobile/home/featured', 'cyan');
  try {
    const res = await axios.get(`${BASE_URL}/api/mobile/home/featured`);
    if (res.data.success && res.data.data.featured) {
      log(`   ✅ PASSED - Got ${res.data.data.featured.length} featured items`, 'green');
      results.passed++;
    } else {
      log('   ❌ FAILED - Invalid response format', 'red');
      results.failed++;
    }
  } catch (error) {
    log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
    results.failed++;
  }

  // Test 2: Greetings Categories
  log('\n2️⃣  Testing: GET /api/mobile/greetings/categories', 'cyan');
  try {
    const res = await axios.get(`${BASE_URL}/api/mobile/greetings/categories`);
    if (res.data.success && res.data.data.categories) {
      log(`   ✅ PASSED - Got ${res.data.data.categories.length} categories`, 'green');
      results.passed++;
    } else {
      log('   ❌ FAILED - Invalid response format', 'red');
      results.failed++;
    }
  } catch (error) {
    log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
    results.failed++;
  }

  // Test 3: Templates Categories
  log('\n3️⃣  Testing: GET /api/mobile/templates/categories', 'cyan');
  try {
    const res = await axios.get(`${BASE_URL}/api/mobile/templates/categories`);
    if (res.data.success && res.data.data.categories) {
      log(`   ✅ PASSED - Got ${res.data.data.categories.length} categories`, 'green');
      results.passed++;
    } else {
      log('   ❌ FAILED - Invalid response format', 'red');
      results.failed++;
    }
  } catch (error) {
    log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
    results.failed++;
  }

  // Test 4: Subscription History (requires auth)
  log('\n4️⃣  Testing: GET /api/mobile/subscriptions/history', 'cyan');
  if (token) {
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/subscriptions/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.data.success && res.data.data.payments !== undefined) {
        log(`   ✅ PASSED - Got ${res.data.data.payments.length} payment records`, 'green');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response format', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }
  } else {
    log('   ⏭️  SKIPPED - No auth token', 'yellow');
  }

  // Test 5: User Profile by ID
  log('\n5️⃣  Testing: GET /api/mobile/users/:id', 'cyan');
  if (userId) {
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/users/${userId}`);
      if (res.data.success && res.data.data.user) {
        log(`   ✅ PASSED - Got user profile for ${res.data.data.user.name}`, 'green');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response format', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }
  } else {
    log('   ⏭️  SKIPPED - No user ID', 'yellow');
  }

  // Summary
  log('\n' + '='.repeat(70), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('='.repeat(70), 'cyan');
  log(`\n✅ Passed: ${results.passed}/5`, results.passed === 5 ? 'green' : 'yellow');
  log(`❌ Failed: ${results.failed}/5`, results.failed === 0 ? 'green' : 'red');
  
  if (results.passed === 5) {
    log('\n🎉 ALL 5 NEW ENDPOINTS WORKING PERFECTLY!', 'green');
  } else if (results.passed >= 3) {
    log(`\n✅ ${results.passed} endpoints working, ${results.failed} need attention`, 'yellow');
  } else {
    log('\n❌ Multiple endpoints failing', 'red');
  }
  
  log('\n' + '='.repeat(70) + '\n', 'cyan');
}

// Wait for server to start then run tests
setTimeout(() => {
  testNewEndpoints().catch(error => {
    log('\n💥 Test failed:', 'red');
    log(error.message, 'red');
  });
}, 5000);
