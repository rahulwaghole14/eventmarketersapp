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

async function testPhase3Batch1() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🧪 TESTING PHASE 3 BATCH 1: User Analytics', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  const results = { passed: 0, failed: 0 };

  try {
    // Setup: Register and login
    log('📝 Setup: Creating test user...', 'cyan');
    const registerRes = await axios.post(`${BASE_URL}/api/mobile/auth/register`, {
      deviceId: `test_${Date.now()}`,
      name: 'Analytics Test User',
      email: `analytics_${Date.now()}@example.com`,
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

    // Test 1: GET /api/mobile/users/:id/downloads
    log('1️⃣  Testing: GET /api/mobile/users/:id/downloads', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/users/${userId}/downloads?page=1&limit=10`);
      if (res.data.success && res.data.data?.downloads !== undefined) {
        log(`   ✅ PASSED - Got ${res.data.data.downloads.length} downloads`, 'green');
        log(`      Total: ${res.data.data.pagination.total}`, 'cyan');
        log(`      Pages: ${res.data.data.pagination.totalPages}`, 'cyan');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 2: GET /api/mobile/users/:id/likes
    log('\n2️⃣  Testing: GET /api/mobile/users/:id/likes', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/users/${userId}/likes?page=1&limit=10`);
      if (res.data.success && res.data.data?.likes !== undefined) {
        log(`   ✅ PASSED - Got ${res.data.data.likes.length} likes`, 'green');
        log(`      Total: ${res.data.data.pagination.total}`, 'cyan');
        log(`      Pages: ${res.data.data.pagination.totalPages}`, 'cyan');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 3: GET /api/mobile/users/:id/activity
    log('\n3️⃣  Testing: GET /api/mobile/users/:id/activity', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/users/${userId}/activity?page=1&limit=10`);
      if (res.data.success && res.data.data?.activities !== undefined) {
        log(`   ✅ PASSED - Got ${res.data.data.activities.length} activities`, 'green');
        log(`      Total: ${res.data.data.pagination.total}`, 'cyan');
        log(`      Pages: ${res.data.data.pagination.totalPages}`, 'cyan');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 4: GET /api/mobile/users/:id/stats
    log('\n4️⃣  Testing: GET /api/mobile/users/:id/stats', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/users/${userId}/stats`);
      if (res.data.success && res.data.data?.stats && res.data.data?.user) {
        log('   ✅ PASSED - Got user statistics', 'green');
        log(`      User: ${res.data.data.user.name}`, 'cyan');
        log(`      Downloads: ${res.data.data.stats.totalDownloads}`, 'cyan');
        log(`      Likes: ${res.data.data.stats.totalLikes}`, 'cyan');
        log(`      Subscriptions: ${res.data.data.stats.totalSubscriptions}`, 'cyan');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Summary
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 BATCH 1 TEST SUMMARY', 'cyan');
    log('='.repeat(70), 'cyan');
    log(`\n✅ Passed: ${results.passed}/4`, results.passed === 4 ? 'green' : 'yellow');
    log(`❌ Failed: ${results.failed}/4`, results.failed === 0 ? 'green' : 'red');
    
    if (results.passed === 4) {
      log('\n🎉 BATCH 1 COMPLETE! All 4 user analytics endpoints working!', 'green');
      log('✅ Ready to proceed to Batch 2', 'green');
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
  testPhase3Batch1();
}, 3000);
