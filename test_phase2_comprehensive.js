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

async function testPhase2Comprehensive() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🧪 TESTING PHASE 2: Templates & Greetings Management', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  const results = { passed: 0, failed: 0, skipped: 0 };

  try {
    // Setup: Register and login
    log('📝 Setup: Creating test user...', 'cyan');
    const registerRes = await axios.post(`${BASE_URL}/api/mobile/auth/register`, {
      deviceId: `test_${Date.now()}`,
      name: 'Phase2 Test User',
      email: `phase2_${Date.now()}@example.com`,
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

    // BATCH 1: TEMPLATE MANAGEMENT
    log('📋 BATCH 1: Template Management (4 endpoints)', 'yellow');
    log('='.repeat(50), 'yellow');

    // Test 1: GET /api/mobile/templates
    log('1️⃣  Testing: GET /api/mobile/templates', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/templates?language=hindi&page=1&limit=5`);
      if (res.data.success && res.data.data?.templates !== undefined) {
        log(`   ✅ PASSED - Got ${res.data.data.templates.length} templates`, 'green');
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

    // Test 2: GET /api/mobile/templates/:id
    log('\n2️⃣  Testing: GET /api/mobile/templates/:id', 'magenta');
    try {
      const listRes = await axios.get(`${BASE_URL}/api/mobile/templates?limit=1`);
      if (listRes.data.success && listRes.data.data.templates.length > 0) {
        const templateId = listRes.data.data.templates[0].id;
        const res = await axios.get(`${BASE_URL}/api/mobile/templates/${templateId}`);
        if (res.data.success && res.data.data?.id === templateId) {
          log('   ✅ PASSED - Got template by ID', 'green');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No templates available', 'yellow');
        results.skipped++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 3: POST /api/mobile/templates/:id/download
    log('\n3️⃣  Testing: POST /api/mobile/templates/:id/download', 'magenta');
    try {
      const listRes = await axios.get(`${BASE_URL}/api/mobile/templates?limit=1`);
      if (listRes.data.success && listRes.data.data.templates.length > 0) {
        const templateId = listRes.data.data.templates[0].id;
        const res = await axios.post(`${BASE_URL}/api/mobile/templates/${templateId}/download`, {}, authHeaders);
        if (res.data.success && res.data.data?.downloadId) {
          log('   ✅ PASSED - Template download initiated', 'green');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No templates available', 'yellow');
        results.skipped++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 4: POST /api/mobile/templates/:id/like
    log('\n4️⃣  Testing: POST /api/mobile/templates/:id/like', 'magenta');
    try {
      const listRes = await axios.get(`${BASE_URL}/api/mobile/templates?limit=1`);
      if (listRes.data.success && listRes.data.data.templates.length > 0) {
        const templateId = listRes.data.data.templates[0].id;
        const res = await axios.post(`${BASE_URL}/api/mobile/templates/${templateId}/like`, {}, authHeaders);
        if (res.data.success && res.data.data?.liked !== undefined) {
          log('   ✅ PASSED - Template like action successful', 'green');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No templates available', 'yellow');
        results.skipped++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // BATCH 2: GREETING MANAGEMENT
    log('\n\n📋 BATCH 2: Greeting Management (4 endpoints)', 'yellow');
    log('='.repeat(50), 'yellow');

    // Test 5: GET /api/mobile/greetings
    log('5️⃣  Testing: GET /api/mobile/greetings', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/greetings?language=hindi&page=1&limit=5`);
      if (res.data.success && res.data.data?.greetings !== undefined) {
        log(`   ✅ PASSED - Got ${res.data.data.greetings.length} greetings`, 'green');
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

    // Test 6: GET /api/mobile/greetings/:id
    log('\n6️⃣  Testing: GET /api/mobile/greetings/:id', 'magenta');
    try {
      const listRes = await axios.get(`${BASE_URL}/api/mobile/greetings?limit=1`);
      if (listRes.data.success && listRes.data.data.greetings.length > 0) {
        const greetingId = listRes.data.data.greetings[0].id;
        const res = await axios.get(`${BASE_URL}/api/mobile/greetings/${greetingId}`);
        if (res.data.success && res.data.data?.id === greetingId) {
          log('   ✅ PASSED - Got greeting by ID', 'green');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No greetings available', 'yellow');
        results.skipped++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 7: POST /api/mobile/greetings/:id/download
    log('\n7️⃣  Testing: POST /api/mobile/greetings/:id/download', 'magenta');
    try {
      const listRes = await axios.get(`${BASE_URL}/api/mobile/greetings?limit=1`);
      if (listRes.data.success && listRes.data.data.greetings.length > 0) {
        const greetingId = listRes.data.data.greetings[0].id;
        const res = await axios.post(`${BASE_URL}/api/mobile/greetings/${greetingId}/download`, {}, authHeaders);
        if (res.data.success && res.data.data?.downloadId) {
          log('   ✅ PASSED - Greeting download initiated', 'green');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No greetings available', 'yellow');
        results.skipped++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 8: POST /api/mobile/greetings/:id/like
    log('\n8️⃣  Testing: POST /api/mobile/greetings/:id/like', 'magenta');
    try {
      const listRes = await axios.get(`${BASE_URL}/api/mobile/greetings?limit=1`);
      if (listRes.data.success && listRes.data.data.greetings.length > 0) {
        const greetingId = listRes.data.data.greetings[0].id;
        const res = await axios.post(`${BASE_URL}/api/mobile/greetings/${greetingId}/like`, {}, authHeaders);
        if (res.data.success && res.data.data?.liked !== undefined) {
          log('   ✅ PASSED - Greeting like action successful', 'green');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No greetings available', 'yellow');
        results.skipped++;
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Summary
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 PHASE 2 COMPREHENSIVE TEST SUMMARY', 'cyan');
    log('='.repeat(70), 'cyan');
    log(`\n✅ Passed: ${results.passed}/8`, results.passed >= 6 ? 'green' : 'yellow');
    log(`❌ Failed: ${results.failed}/8`, results.failed === 0 ? 'green' : 'red');
    log(`⏭️  Skipped: ${results.skipped}/8`, results.skipped > 0 ? 'yellow' : 'green');
    
    if (results.passed >= 6) {
      log('\n🎉 PHASE 2 SUCCESS! Most endpoints working!', 'green');
      log('📊 Total endpoints now: 33 (55% of 60 total)', 'cyan');
      log('✅ Ready to proceed to Phase 3', 'green');
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
  testPhase2Comprehensive();
}, 3000);
