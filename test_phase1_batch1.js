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

async function testPhase1Batch1() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🧪 TESTING PHASE 1 BATCH 1: Authentication Endpoints', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  const results = { passed: 0, failed: 0 };

  try {
    // Setup: Register and login
    log('📝 Setup: Creating test user...', 'cyan');
    const registerRes = await axios.post(`${BASE_URL}/api/mobile/auth/register`, {
      deviceId: `test_${Date.now()}`,
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      password: 'Test@123'
    });
    
    const token = registerRes.data.data?.token;
    const userId = registerRes.data.data?.user?.id;
    
    if (!token) {
      log('❌ Failed to get token from registration', 'red');
      return;
    }
    
    log(`✅ User created with ID: ${userId}\n`, 'green');

    const authHeaders = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    // Test 1: GET /api/mobile/auth/me
    log('1️⃣  Testing: GET /api/mobile/auth/me', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/auth/me`, authHeaders);
      if (res.data.success && res.data.data?.id === userId) {
        log('   ✅ PASSED - Got user profile', 'green');
        log(`      Email: ${res.data.data.email}`, 'cyan');
        log(`      Company: ${res.data.data.companyName}`, 'cyan');
        log(`      Downloads: ${res.data.data.downloadAttempts}`, 'cyan');
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

    // Test 2: PUT /api/mobile/auth/profile
    log('\n2️⃣  Testing: PUT /api/mobile/auth/profile', 'magenta');
    try {
      const res = await axios.put(`${BASE_URL}/api/mobile/auth/profile`, {
        companyName: 'Updated Test Company',
        phoneNumber: '9199999999',
        description: 'A test company description',
        category: 'Technology',
        address: '123 Test Street',
        website: 'https://test.com'
      }, authHeaders);
      
      if (res.data.success && res.data.data?.companyName === 'Updated Test Company') {
        log('   ✅ PASSED - Profile updated successfully', 'green');
        log(`      Updated Company: ${res.data.data.companyName}`, 'cyan');
        log(`      Category: ${res.data.data.category}`, 'cyan');
        log(`      Website: ${res.data.data.website}`, 'cyan');
        results.passed++;
      } else {
        log('   ❌ FAILED - Profile not updated', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      if (error.response?.data) {
        log(`      ${JSON.stringify(error.response.data)}`, 'yellow');
      }
      results.failed++;
    }

    // Test 3: POST /api/mobile/auth/logout
    log('\n3️⃣  Testing: POST /api/mobile/auth/logout', 'magenta');
    try {
      const res = await axios.post(`${BASE_URL}/api/mobile/auth/logout`, {}, authHeaders);
      if (res.data.success) {
        log('   ✅ PASSED - Logout successful', 'green');
        results.passed++;
      } else {
        log('   ❌ FAILED - Logout failed', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      if (error.response?.data) {
        log(`      ${JSON.stringify(error.response.data)}`, 'yellow');
      }
      results.failed++;
    }

    // Test 4: Verify logout - token should still work (JWT can't be invalidated)
    log('\n4️⃣  Verification: Token after logout (should still work)', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/auth/me`, authHeaders);
      if (res.data.success) {
        log('   ℹ️  INFO - Token still valid (JWT behavior is correct)', 'cyan');
        log('      Note: Client should delete token on logout', 'yellow');
      }
    } catch (error) {
      log(`   ℹ️  Token invalidated (unexpected but ok)`, 'cyan');
    }

    // Summary
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 BATCH 1 TEST SUMMARY', 'cyan');
    log('='.repeat(70), 'cyan');
    log(`\n✅ Passed: ${results.passed}/3`, results.passed === 3 ? 'green' : 'yellow');
    log(`❌ Failed: ${results.failed}/3`, results.failed === 0 ? 'green' : 'red');
    
    if (results.passed === 3) {
      log('\n🎉 BATCH 1 COMPLETE! All 3 endpoints working!', 'green');
      log('✅ Ready to proceed to Batch 2', 'green');
    } else {
      log(`\n⚠️  ${results.failed} endpoint(s) need fixing before continuing`, 'yellow');
    }
    
    log('\n' + '='.repeat(70) + '\n', 'cyan');

  } catch (error) {
    log('\n💥 Test setup failed:', 'red');
    log(error.message, 'red');
    if (error.response?.data) {
      log(JSON.stringify(error.response.data, null, 2), 'yellow');
    }
  }
}

// Wait for server to start
setTimeout(() => {
  testPhase1Batch1();
}, 5000);
