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

async function testPhase2Batch1() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🧪 TESTING PHASE 2 BATCH 1: Template Management', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');

  const results = { passed: 0, failed: 0 };

  try {
    // Setup: Register and login
    log('📝 Setup: Creating test user...', 'cyan');
    const registerRes = await axios.post(`${BASE_URL}/api/mobile/auth/register`, {
      deviceId: `test_${Date.now()}`,
      name: 'Template Test User',
      email: `templatetest_${Date.now()}@example.com`,
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

    // Test 1: GET /api/mobile/templates (List with filters)
    log('1️⃣  Testing: GET /api/mobile/templates', 'magenta');
    try {
      const res = await axios.get(`${BASE_URL}/api/mobile/templates?language=hindi&page=1&limit=5`);
      if (res.data.success && res.data.data?.templates) {
        log(`   ✅ PASSED - Got ${res.data.data.templates.length} templates`, 'green');
        log(`      Total: ${res.data.data.pagination.total}`, 'cyan');
        log(`      Page: ${res.data.data.pagination.page}/${res.data.data.pagination.totalPages}`, 'cyan');
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

    // Test 2: GET /api/mobile/templates/:id (Get by ID)
    log('\n2️⃣  Testing: GET /api/mobile/templates/:id', 'magenta');
    try {
      // First get a template ID from the list
      const listRes = await axios.get(`${BASE_URL}/api/mobile/templates?limit=1`);
      if (listRes.data.success && listRes.data.data.templates.length > 0) {
        const templateId = listRes.data.data.templates[0].id;
        
        const res = await axios.get(`${BASE_URL}/api/mobile/templates/${templateId}`);
        if (res.data.success && res.data.data?.id === templateId) {
          log('   ✅ PASSED - Got template by ID', 'green');
          log(`      Title: ${res.data.data.title}`, 'cyan');
          log(`      Category: ${res.data.data.category}`, 'cyan');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No templates available', 'yellow');
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      results.failed++;
    }

    // Test 3: POST /api/mobile/templates/:id/download (Download)
    log('\n3️⃣  Testing: POST /api/mobile/templates/:id/download', 'magenta');
    try {
      // Get a template ID
      const listRes = await axios.get(`${BASE_URL}/api/mobile/templates?limit=1`);
      if (listRes.data.success && listRes.data.data.templates.length > 0) {
        const templateId = listRes.data.data.templates[0].id;
        
        const res = await axios.post(`${BASE_URL}/api/mobile/templates/${templateId}/download`, {}, authHeaders);
        if (res.data.success && res.data.data?.downloadId) {
          log('   ✅ PASSED - Template download initiated', 'green');
          log(`      Download ID: ${res.data.data.downloadId}`, 'cyan');
          log(`      File Size: ${res.data.data.fileSize}`, 'cyan');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No templates available', 'yellow');
      }
    } catch (error) {
      log(`   ❌ FAILED - ${error.response?.status || error.message}`, 'red');
      if (error.response?.data) {
        log(`      ${JSON.stringify(error.response.data)}`, 'yellow');
      }
      results.failed++;
    }

    // Test 4: POST /api/mobile/templates/:id/like (Like/Unlike)
    log('\n4️⃣  Testing: POST /api/mobile/templates/:id/like', 'magenta');
    try {
      // Get a template ID
      const listRes = await axios.get(`${BASE_URL}/api/mobile/templates?limit=1`);
      if (listRes.data.success && listRes.data.data.templates.length > 0) {
        const templateId = listRes.data.data.templates[0].id;
        
        const res = await axios.post(`${BASE_URL}/api/mobile/templates/${templateId}/like`, {}, authHeaders);
        if (res.data.success && res.data.data?.liked !== undefined) {
          log('   ✅ PASSED - Template like action successful', 'green');
          log(`      Liked: ${res.data.data.liked}`, 'cyan');
          log(`      Like Count: ${res.data.data.likeCount}`, 'cyan');
          results.passed++;
        } else {
          log('   ❌ FAILED - Invalid response', 'red');
          results.failed++;
        }
      } else {
        log('   ⏭️  SKIPPED - No templates available', 'yellow');
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
    log('📊 BATCH 1 TEST SUMMARY', 'cyan');
    log('='.repeat(70), 'cyan');
    log(`\n✅ Passed: ${results.passed}/4`, results.passed === 4 ? 'green' : 'yellow');
    log(`❌ Failed: ${results.failed}/4`, results.failed === 0 ? 'green' : 'red');
    
    if (results.passed === 4) {
      log('\n🎉 BATCH 1 COMPLETE! All 4 template endpoints working!', 'green');
      log('✅ Ready to proceed to Batch 2', 'green');
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
  testPhase2Batch1();
}, 3000);
