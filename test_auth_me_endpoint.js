const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_EMAIL = `test_me_${Date.now()}@example.com`;
const TEST_PASSWORD = 'test123456';

let authToken = null;
let userId = null;

// Color logging
const log = (message, color = 'reset') => {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const config = {
      method,
      url,
      headers,
      ...(data && { data }),
      timeout: 30000
    };

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || { message: error.message },
      status: error.response?.status || 500
    };
  }
};

async function runTests() {
  log('\n🧪 Testing /api/mobile/auth/me and /api/mobile/users/:id Consistency\n', 'cyan');
  log(`📍 Testing against: ${BASE_URL}\n`, 'blue');

  try {
    // Step 1: Register a new user
    log('\n1️⃣  Step 1: Registering new user...', 'magenta');
    const registerResponse = await makeRequest('POST', `${BASE_URL}/api/mobile/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: 'Test User',
      website: 'https://initial-website.com',
      address: 'Initial Address'
    });

    if (!registerResponse.success) {
      log('❌ Registration failed:', 'red');
      console.log(registerResponse.error);
      return;
    }

    userId = registerResponse.data.data?.user?.id;
    authToken = registerResponse.data.data?.token;
    
    if (!authToken || !userId) {
      log('❌ Could not obtain auth token or user ID.', 'red');
      return;
    }

    log(`✅ User registered. User ID: ${userId}`, 'green');

    // Step 2: Check initial state via /me
    log('\n2️⃣  Step 2: GET /api/mobile/auth/me (initial state)...', 'magenta');
    const meResponse1 = await makeRequest('GET', `${BASE_URL}/api/mobile/auth/me`);
    
    if (meResponse1.success) {
      const data = meResponse1.data.data;
      log('✅ /me endpoint works', 'green');
      console.log('Initial /me response:', JSON.stringify({
        address: data.address,
        website: data.website
      }, null, 2));
    }

    // Step 3: Update via PUT /api/mobile/users/:id with new values
    log('\n3️⃣  Step 3: PUT /api/mobile/users/:id (update with new values)...', 'magenta');
    const updateResponse1 = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
      website: 'https://updated-website.com',
      address: 'Updated Address Street'
    });

    if (updateResponse1.success) {
      log('✅ Update successful', 'green');
      const user = updateResponse1.data.data.user;
      console.log('Update response:', JSON.stringify({
        website: user.website,
        address: user.address
      }, null, 2));
    }

    // Step 4: Immediately check /me endpoint
    log('\n4️⃣  Step 4: GET /api/mobile/auth/me (after update)...', 'magenta');
    const meResponse2 = await makeRequest('GET', `${BASE_URL}/api/mobile/auth/me`);
    
    if (meResponse2.success) {
      const data = meResponse2.data.data;
      log('✅ /me endpoint works', 'green');
      console.log('After update /me response:', JSON.stringify({
        address: data.address,
        website: data.website
      }, null, 2));

      // Verify consistency
      const updateUser = updateResponse1.data.data.user;
      if (data.address === updateUser.address && data.website === updateUser.website) {
        log('✅ VALUES MATCH between PUT and /me endpoints!', 'green');
      } else {
        log('❌ VALUES MISMATCH between PUT and /me endpoints!', 'red');
        log(`   PUT returned: address=${updateUser.address}, website=${updateUser.website}`, 'red');
        log(`   /me returned: address=${data.address}, website=${data.website}`, 'red');
      }
    }

    // Step 5: Test setting to null
    log('\n5️⃣  Step 5: PUT /api/mobile/users/:id (set address to null)...', 'magenta');
    const updateResponse2 = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
      address: null
    });

    if (updateResponse2.success) {
      log('✅ Update with null successful', 'green');
      const user = updateResponse2.data.data.user;
      console.log('Update response (null):', JSON.stringify({
        website: user.website,
        address: user.address
      }, null, 2));

      if (user.address === null) {
        log('✅ Address correctly set to null in PUT response', 'green');
      } else {
        log(`❌ Address should be null but got: ${user.address}`, 'red');
      }
    }

    // Step 6: Check /me endpoint after null update
    log('\n6️⃣  Step 6: GET /api/mobile/auth/me (after null update)...', 'magenta');
    const meResponse3 = await makeRequest('GET', `${BASE_URL}/api/mobile/auth/me`);
    
    if (meResponse3.success) {
      const data = meResponse3.data.data;
      log('✅ /me endpoint works', 'green');
      console.log('After null update /me response:', JSON.stringify({
        address: data.address,
        website: data.website
      }, null, 2));

      // Verify null is persisted
      const updateUser = updateResponse2.data.data.user;
      if (data.address === updateUser.address) {
        log('✅ NULL VALUE MATCHES between PUT and /me endpoints!', 'green');
      } else {
        log('❌ NULL VALUE MISMATCH between PUT and /me endpoints!', 'red');
        log(`   PUT returned: address=${updateUser.address}`, 'red');
        log(`   /me returned: address=${data.address}`, 'red');
      }
    }

    // Summary
    log('\n📊 Test Summary', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log(`✅ Registration: PASS`, 'green');
    log(`✅ /me endpoint (initial): ${meResponse1.success ? 'PASS' : 'FAIL'}`, meResponse1.success ? 'green' : 'red');
    log(`✅ PUT endpoint (update): ${updateResponse1.success ? 'PASS' : 'FAIL'}`, updateResponse1.success ? 'green' : 'red');
    log(`✅ /me endpoint (after update): ${meResponse2.success ? 'PASS' : 'FAIL'}`, meResponse2.success ? 'green' : 'red');
    log(`✅ PUT endpoint (null update): ${updateResponse2.success ? 'PASS' : 'FAIL'}`, updateResponse2.success ? 'green' : 'red');
    log(`✅ /me endpoint (after null): ${meResponse3.success ? 'PASS' : 'FAIL'}`, meResponse3.success ? 'green' : 'red');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  } catch (error) {
    log('\n❌ Test execution error:', 'red');
    console.error(error);
  }
}

// Run tests
runTests();


