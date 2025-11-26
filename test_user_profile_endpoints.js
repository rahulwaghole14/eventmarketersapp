const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_EMAIL = `test_profile_${Date.now()}@example.com`;
const TEST_PASSWORD = 'test123456';
const TEST_NAME = 'Test User Profile';

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
const makeRequest = async (method, url, data = null, customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
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
      error: error.response?.data || { 
        message: error.message, 
        code: error.code,
        details: error.toString()
      },
      status: error.response?.status || 500
    };
  }
};

async function runTests() {
  log('\n🧪 Testing User Profile Endpoints (GET & PUT /api/mobile/users/:id)\n', 'cyan');
  log(`📍 Testing against: ${BASE_URL}\n`, 'blue');

  try {
    // Step 1: Register a new mobile user
    log('\n1️⃣  Step 1: Registering new mobile user...', 'magenta');
    const registerResponse = await makeRequest('POST', `${BASE_URL}/api/mobile/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: TEST_NAME,
      website: 'https://initial-website.com',
      address: '123 Initial Street'
    });

    if (!registerResponse.success) {
      log('❌ Registration failed:', 'red');
      log(`   Status: ${registerResponse.status}`, 'red');
      console.log(JSON.stringify(registerResponse.error, null, 2));
      return;
    }

    userId = registerResponse.data.data?.user?.id || registerResponse.data.data?.id;
    authToken = registerResponse.data.data?.token || registerResponse.data.token;
    
    if (!authToken || !userId) {
      log('❌ Could not obtain auth token or user ID. Cannot proceed.', 'red');
      return;
    }

    log(`✅ User registered successfully. User ID: ${userId}`, 'green');

    // Step 2: Test GET endpoint - Initial state
    log('\n2️⃣  Step 2: Testing GET /api/mobile/users/:id (initial state)...', 'magenta');
    const getResponse1 = await makeRequest('GET', `${BASE_URL}/api/mobile/users/${userId}`);

    if (getResponse1.success) {
      log('✅ GET request successful!', 'green');
      const user = getResponse1.data.data?.user;
      console.log('Response:', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        website: user.website,
        address: user.address,
        hasWebsite: user.website !== null && user.website !== undefined,
        hasAddress: user.address !== null && user.address !== undefined
      }, null, 2));

      if (user.website === null || user.website === undefined) {
        log('⚠️  Website field is missing or null', 'yellow');
      } else {
        log(`✅ Website field present: ${user.website}`, 'green');
      }

      if (user.address === null || user.address === undefined) {
        log('⚠️  Address field is missing or null', 'yellow');
      } else {
        log(`✅ Address field present: ${user.address}`, 'green');
      }
    } else {
      log('❌ GET request failed:', 'red');
      console.log(getResponse1.error);
      return;
    }

    // Step 3: Test PUT endpoint - Update with website and address
    log('\n3️⃣  Step 3: Testing PUT /api/mobile/users/:id (update with website & address)...', 'magenta');
    const updateData = {
      name: 'Updated Test User',
      phone: '9876543210',
      website: 'https://updated-website.com',
      address: '456 Updated Avenue, New City'
    };

    const putResponse = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, updateData);

    if (putResponse.success) {
      log('✅ PUT request successful!', 'green');
      const updatedUser = putResponse.data.data?.user;
      console.log('Response:', JSON.stringify({
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        website: updatedUser.website,
        address: updatedUser.address,
        hasWebsite: updatedUser.website !== null && updatedUser.website !== undefined,
        hasAddress: updatedUser.address !== null && updatedUser.address !== undefined
      }, null, 2));

      // Verify fields
      if (updatedUser.website === updateData.website) {
        log(`✅ Website updated correctly: ${updatedUser.website}`, 'green');
      } else {
        log(`❌ Website mismatch! Expected: ${updateData.website}, Got: ${updatedUser.website}`, 'red');
      }

      if (updatedUser.address === updateData.address) {
        log(`✅ Address updated correctly: ${updatedUser.address}`, 'green');
      } else {
        log(`❌ Address mismatch! Expected: ${updateData.address}, Got: ${updatedUser.address}`, 'red');
      }

      // Verify response structure
      const requiredFields = ['id', 'name', 'email', 'phone', 'website', 'address', 'stats'];
      const missingFields = requiredFields.filter(field => !(field in updatedUser));
      
      if (missingFields.length === 0) {
        log('✅ All required fields present in response', 'green');
      } else {
        log(`⚠️  Missing fields in response: ${missingFields.join(', ')}`, 'yellow');
      }
    } else {
      log('❌ PUT request failed:', 'red');
      console.log(putResponse.error);
      return;
    }

    // Step 4: Test GET endpoint again - Verify updated values
    log('\n4️⃣  Step 4: Testing GET /api/mobile/users/:id (after update)...', 'magenta');
    const getResponse2 = await makeRequest('GET', `${BASE_URL}/api/mobile/users/${userId}`);

    if (getResponse2.success) {
      log('✅ GET request successful after update!', 'green');
      const user = getResponse2.data.data?.user;
      
      console.log('Response:', JSON.stringify({
        id: user.id,
        name: user.name,
        website: user.website,
        address: user.address
      }, null, 2));

      // Verify persisted values
      if (user.website === updateData.website) {
        log(`✅ Website persisted correctly: ${user.website}`, 'green');
      } else {
        log(`❌ Website not persisted! Expected: ${updateData.website}, Got: ${user.website}`, 'red');
      }

      if (user.address === updateData.address) {
        log(`✅ Address persisted correctly: ${user.address}`, 'green');
      } else {
        log(`❌ Address not persisted! Expected: ${updateData.address}, Got: ${user.address}`, 'red');
      }
    } else {
      log('❌ GET request failed after update:', 'red');
      console.log(getResponse2.error);
    }

    // Step 5: Test partial update (only website)
    log('\n5️⃣  Step 5: Testing PUT /api/mobile/users/:id (partial update - only website)...', 'magenta');
    const partialUpdate = {
      website: 'https://partial-update.com'
    };

    const partialPutResponse = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, partialUpdate);

    if (partialPutResponse.success) {
      log('✅ Partial update successful!', 'green');
      const user = partialPutResponse.data.data?.user;
      
      if (user.website === partialUpdate.website) {
        log(`✅ Website updated: ${user.website}`, 'green');
      }
      
      // Address should still be there from previous update
      if (user.address === updateData.address) {
        log(`✅ Address preserved: ${user.address}`, 'green');
      } else {
        log(`⚠️  Address changed: ${user.address}`, 'yellow');
      }
    } else {
      log('❌ Partial update failed:', 'red');
      console.log(partialPutResponse.error);
    }

    // Summary
    log('\n📊 Test Summary', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log(`✅ User Registration: ${userId ? 'PASS' : 'FAIL'}`, userId ? 'green' : 'red');
    log(`✅ GET Endpoint (initial): ${getResponse1.success ? 'PASS' : 'FAIL'}`, getResponse1.success ? 'green' : 'red');
    log(`✅ PUT Endpoint (full update): ${putResponse.success ? 'PASS' : 'FAIL'}`, putResponse.success ? 'green' : 'red');
    log(`✅ GET Endpoint (after update): ${getResponse2.success ? 'PASS' : 'FAIL'}`, getResponse2.success ? 'green' : 'red');
    log(`✅ Partial Update: ${partialPutResponse.success ? 'PASS' : 'FAIL'}`, partialPutResponse.success ? 'green' : 'red');
    
    // Field verification
    const finalUser = getResponse2.success ? getResponse2.data.data.user : null;
    if (finalUser) {
      log(`✅ Website Field: ${finalUser.website !== null && finalUser.website !== undefined ? 'PRESENT' : 'MISSING'}`, 
          finalUser.website !== null && finalUser.website !== undefined ? 'green' : 'red');
      log(`✅ Address Field: ${finalUser.address !== null && finalUser.address !== undefined ? 'PRESENT' : 'MISSING'}`, 
          finalUser.address !== null && finalUser.address !== undefined ? 'green' : 'red');
    }
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  } catch (error) {
    log('\n❌ Test execution error:', 'red');
    console.error(error);
  }
}

// Run tests
runTests();


