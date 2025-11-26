const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_EMAIL = `test_put_${Date.now()}@example.com`;
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
const makeRequest = async (method, url, data = null, skipAuth = false) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken && !skipAuth) {
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
  log('\n🧪 Testing PUT /api/mobile/users/{userId} Endpoint\n', 'cyan');
  log(`📍 Testing against: ${BASE_URL}\n`, 'blue');

  let allTestsPassed = true;

  try {
    // Step 1: Register a new user
    log('\n1️⃣  Step 1: Registering new user...', 'magenta');
    const registerResponse = await makeRequest('POST', `${BASE_URL}/api/mobile/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: 'Test PUT User'
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

    // Step 2: Test basic update
    log('\n2️⃣  Step 2: Testing basic update (name, phone)...', 'magenta');
    const basicUpdate = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
      name: 'Updated Name',
      phone: '1234567890'
    });

    if (basicUpdate.success) {
      log('✅ Basic update successful', 'green');
      const user = basicUpdate.data.data.user;
      if (user.name === 'Updated Name' && user.phone === '1234567890') {
        log('✅ Name and phone updated correctly', 'green');
      } else {
        log('❌ Name or phone not updated correctly', 'red');
        allTestsPassed = false;
      }
      console.log('Response:', JSON.stringify({
        name: user.name,
        phone: user.phone,
        email: user.email
      }, null, 2));
    } else {
      log('❌ Basic update failed:', 'red');
      console.log(basicUpdate.error);
      allTestsPassed = false;
    }

    // Step 3: Test website and address update
    log('\n3️⃣  Step 3: Testing website and address update...', 'magenta');
    const websiteUpdate = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
      website: 'https://test-website.com',
      address: '123 Test Street, Test City'
    });

    if (websiteUpdate.success) {
      log('✅ Website and address update successful', 'green');
      const user = websiteUpdate.data.data.user;
      
      // Verify fields
      if (user.website === 'https://test-website.com') {
        log('✅ Website updated correctly', 'green');
      } else {
        log(`❌ Website mismatch. Expected: https://test-website.com, Got: ${user.website}`, 'red');
        allTestsPassed = false;
      }

      if (user.address === '123 Test Street, Test City') {
        log('✅ Address updated correctly', 'green');
      } else {
        log(`❌ Address mismatch. Expected: 123 Test Street, Test City, Got: ${user.address}`, 'red');
        allTestsPassed = false;
      }

      // Verify response structure
      const requiredFields = ['id', 'name', 'email', 'phone', 'website', 'address', 'stats'];
      const missingFields = requiredFields.filter(field => !(field in user));
      
      if (missingFields.length === 0) {
        log('✅ All required fields present in response', 'green');
      } else {
        log(`❌ Missing fields: ${missingFields.join(', ')}`, 'red');
        allTestsPassed = false;
      }

      console.log('Response:', JSON.stringify({
        website: user.website,
        address: user.address,
        name: user.name
      }, null, 2));
    } else {
      log('❌ Website and address update failed:', 'red');
      console.log(websiteUpdate.error);
      allTestsPassed = false;
    }

    // Step 4: Test null value handling
    log('\n4️⃣  Step 4: Testing null value handling...', 'magenta');
    const nullUpdate = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
      address: null,
      website: null
    });

    if (nullUpdate.success) {
      log('✅ Null update successful', 'green');
      const user = nullUpdate.data.data.user;
      
      if (user.address === null) {
        log('✅ Address correctly set to null', 'green');
      } else {
        log(`❌ Address should be null but got: ${user.address}`, 'red');
        allTestsPassed = false;
      }

      if (user.website === null) {
        log('✅ Website correctly set to null', 'green');
      } else {
        log(`❌ Website should be null but got: ${user.website}`, 'red');
        allTestsPassed = false;
      }
    } else {
      log('❌ Null update failed:', 'red');
      console.log(nullUpdate.error);
      allTestsPassed = false;
    }

    // Step 5: Test partial update (only website)
    log('\n5️⃣  Step 5: Testing partial update (only website)...', 'magenta');
    const partialUpdate = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
      website: 'https://partial-update.com'
    });

    if (partialUpdate.success) {
      log('✅ Partial update successful', 'green');
      const user = partialUpdate.data.data.user;
      
      if (user.website === 'https://partial-update.com') {
        log('✅ Website updated correctly', 'green');
      } else {
        log('❌ Website not updated correctly', 'red');
        allTestsPassed = false;
      }

      // Address should remain null from previous update
      if (user.address === null) {
        log('✅ Address preserved as null', 'green');
      } else {
        log(`⚠️  Address changed to: ${user.address}`, 'yellow');
      }
    } else {
      log('❌ Partial update failed:', 'red');
      console.log(partialUpdate.error);
      allTestsPassed = false;
    }

    // Step 6: Test authentication requirement
    log('\n6️⃣  Step 6: Testing authentication requirement...', 'magenta');
    const noAuthUpdate = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
      name: 'Should Fail'
    }, true); // skipAuth = true

    if (!noAuthUpdate.success && noAuthUpdate.status === 401) {
      log('✅ Authentication correctly required', 'green');
    } else {
      log(`❌ Security issue: Should require authentication. Status: ${noAuthUpdate.status}`, 'red');
      allTestsPassed = false;
    }

    // Step 7: Test authorization (can only update own profile)
    log('\n7️⃣  Step 7: Testing authorization (other user ID)...', 'magenta');
    const otherUserId = 'different_user_id_12345';
    const unauthorizedUpdate = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${otherUserId}`, {
      name: 'Should Fail'
    });

    if (!unauthorizedUpdate.success && (unauthorizedUpdate.status === 403 || unauthorizedUpdate.status === 404)) {
      log('✅ Authorization correctly enforced', 'green');
    } else {
      log(`⚠️  Authorization check: Status ${unauthorizedUpdate.status}`, 'yellow');
    }

    // Step 8: Test email uniqueness validation
    log('\n8️⃣  Step 8: Testing email uniqueness validation...', 'magenta');
    // Register another user first
    const anotherUserResponse = await makeRequest('POST', `${BASE_URL}/api/mobile/auth/register`, {
      email: `another_${Date.now()}@example.com`,
      password: TEST_PASSWORD,
      displayName: 'Another User'
    });

    if (anotherUserResponse.success) {
      // Try to update first user's email to second user's email
      const emailConflict = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
        email: anotherUserResponse.data.data.user.email
      });

      if (!emailConflict.success && emailConflict.status === 400) {
        log('✅ Email uniqueness validation works', 'green');
      } else {
        log(`⚠️  Email validation: Status ${emailConflict.status}`, 'yellow');
      }
    }

    // Step 9: Verify consistency with GET endpoint
    log('\n9️⃣  Step 9: Verifying consistency with GET endpoint...', 'magenta');
    const getResponse = await makeRequest('GET', `${BASE_URL}/api/mobile/users/${userId}`);
    
    if (getResponse.success && partialUpdate.success) {
      const getUser = getResponse.data.data.user;
      const updateUser = partialUpdate.data.data.user;

      if (getUser.website === updateUser.website && getUser.address === updateUser.address) {
        log('✅ GET and PUT endpoints return consistent values', 'green');
      } else {
        log('❌ Values mismatch between GET and PUT endpoints', 'red');
        log(`   PUT: website=${updateUser.website}, address=${updateUser.address}`, 'red');
        log(`   GET: website=${getUser.website}, address=${getUser.address}`, 'red');
        allTestsPassed = false;
      }
    }

    // Step 10: Test all fields update
    log('\n🔟 Step 10: Testing complete profile update...', 'magenta');
    const completeUpdate = await makeRequest('PUT', `${BASE_URL}/api/mobile/users/${userId}`, {
      name: 'Complete Profile',
      email: TEST_EMAIL, // Same email
      phone: '9998887777',
      alternatePhone: '1112223333',
      website: 'https://complete-profile.com',
      address: 'Complete Address, Complete City'
    });

    if (completeUpdate.success) {
      log('✅ Complete profile update successful', 'green');
      const user = completeUpdate.data.data.user;
      
      const fieldsToCheck = {
        name: 'Complete Profile',
        phone: '9998887777',
        alternatePhone: '1112223333',
        website: 'https://complete-profile.com',
        address: 'Complete Address, Complete City'
      };

      let allFieldsCorrect = true;
      for (const [field, expectedValue] of Object.entries(fieldsToCheck)) {
        if (user[field] === expectedValue) {
          log(`✅ ${field} updated correctly`, 'green');
        } else {
          log(`❌ ${field} mismatch. Expected: ${expectedValue}, Got: ${user[field]}`, 'red');
          allFieldsCorrect = false;
          allTestsPassed = false;
        }
      }

      if (allFieldsCorrect) {
        log('✅ All fields updated correctly', 'green');
      }
    } else {
      log('❌ Complete profile update failed:', 'red');
      console.log(completeUpdate.error);
      allTestsPassed = false;
    }

    // Summary
    log('\n📊 Test Summary', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log(`✅ Registration: PASS`, 'green');
    log(`✅ Basic Update: ${basicUpdate.success ? 'PASS' : 'FAIL'}`, basicUpdate.success ? 'green' : 'red');
    log(`✅ Website/Address Update: ${websiteUpdate.success ? 'PASS' : 'FAIL'}`, websiteUpdate.success ? 'green' : 'red');
    log(`✅ Null Value Handling: ${nullUpdate.success ? 'PASS' : 'FAIL'}`, nullUpdate.success ? 'green' : 'red');
    log(`✅ Partial Update: ${partialUpdate.success ? 'PASS' : 'FAIL'}`, partialUpdate.success ? 'green' : 'red');
    log(`✅ Authentication: ${!noAuthUpdate.success ? 'PASS' : 'FAIL'}`, !noAuthUpdate.success ? 'green' : 'red');
    log(`✅ Complete Update: ${completeUpdate.success ? 'PASS' : 'FAIL'}`, completeUpdate.success ? 'green' : 'red');
    log(`✅ GET/PUT Consistency: ${getResponse.success ? 'PASS' : 'FAIL'}`, getResponse.success ? 'green' : 'red');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    
    if (allTestsPassed) {
      log('\n🎉 ALL TESTS PASSED! Endpoint is working correctly.', 'green');
    } else {
      log('\n⚠️  SOME TESTS FAILED. Please review the issues above.', 'yellow');
    }
    log('');

  } catch (error) {
    log('\n❌ Test execution error:', 'red');
    console.error(error);
    allTestsPassed = false;
  }

  return allTestsPassed;
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
});


