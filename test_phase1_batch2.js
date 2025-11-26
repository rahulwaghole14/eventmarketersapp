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

async function testPhase1Batch2() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🧪 TESTING PHASE 1 BATCH 2: Business Profile Endpoints', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  const results = { passed: 0, failed: 0 };

  try {
    // Setup: Register and login
    log('📝 Setup: Creating test user...', 'cyan');
    const registerRes = await axios.post(`${BASE_URL}/api/mobile/auth/register`, {
      deviceId: `test_${Date.now()}`,
      name: 'Profile Test User',
      email: `profile_${Date.now()}@example.com`,
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

    let profileId = null;

    // Test 1: POST /api/mobile/business-profile (Create)
    log('1️⃣  Testing: POST /api/mobile/business-profile', 'magenta');
    try {
      const res = await axios.post(`${BASE_URL}/api/mobile/business-profile`, {
        businessName: 'Test Business Inc.',
        ownerName: 'John Doe',
        email: 'business@test.com',
        phone: '9198765432',
        address: '123 Business St',
        category: 'Technology',
        description: 'A test business',
        website: 'https://testbusiness.com',
        logo: 'https://logo.com/test.png'
      }, authHeaders);
      
      if (res.data.success && res.data.data?.id) {
        profileId = res.data.data.id;
        log('   ✅ PASSED - Business profile created', 'green');
        log(`      Profile ID: ${profileId}`, 'cyan');
        log(`      Business: ${res.data.data.businessName}`, 'cyan');
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

    // Test 2: GET /api/mobile/business-profile (Get All)
    log('\n2️⃣  Testing: GET /api/mobile/business-profile', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/business-profile`);
      if (res.data.success && res.data.data?.profiles) {
        log(`   ✅ PASSED - Got ${res.data.data.profiles.length} business profiles`, 'green');
        log(`      Total: ${res.data.data.pagination.total}`, 'cyan');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 3: GET /api/mobile/business-profile/:userId (User's Profiles)
    log('\n3️⃣  Testing: GET /api/mobile/business-profile/:userId', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/business-profile/${userId}`);
      if (res.data.success && res.data.data?.profiles) {
        log(`   ✅ PASSED - Got ${res.data.data.profiles.length} user profiles`, 'green');
        results.passed++;
      } else {
        log('   ❌ FAILED - Invalid response', 'red');
        results.failed++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 4: PUT /api/mobile/business-profile/:id (Update)
    log('\n4️⃣  Testing: PUT /api/mobile/business-profile/:id', 'magenta');
    if (profileId) {
      try {
        const res = await axios.put(`${BASE_URL}/api/mobile/business-profile/${profileId}`, {
          businessName: 'Updated Business Name',
          description: 'Updated description',
          category: 'E-commerce'
        }, authHeaders);
        
        if (res.data.success && res.data.data?.businessName === 'Updated Business Name') {
          log('   ✅ PASSED - Business profile updated', 'green');
          log(`      Updated Name: ${res.data.data.businessName}`, 'cyan');
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
    } else {
      log('   ⏭️  SKIPPED - No profile ID from previous test', 'yellow');
    }

    // Summary
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 BATCH 2 TEST SUMMARY', 'cyan');
    log('='.repeat(70), 'cyan');
    log(`\n✅ Passed: ${results.passed}/4`, results.passed === 4 ? 'green' : 'yellow');
    log(`❌ Failed: ${results.failed}/4`, results.failed === 0 ? 'green' : 'red');
    
    if (results.passed === 4) {
      log('\n🎉 BATCH 2 COMPLETE! All 4 endpoints working!', 'green');
      log('✅ Ready to proceed to Batch 3', 'green');
    } else if (results.passed >= 3) {
      log(`\n✅ ${results.passed} endpoints working, ${results.failed} need attention`, 'yellow');
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
  testPhase1Batch2();
}, 3000);
