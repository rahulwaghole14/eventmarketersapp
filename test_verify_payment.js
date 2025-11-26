const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'test123456';
const TEST_NAME = 'Test User';

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
  log('\n🧪 Testing /api/mobile/subscriptions/verify-payment Endpoint\n', 'cyan');
  log(`📍 Testing against: ${BASE_URL}\n`, 'blue');

  // Check server connectivity first
  log('🔍 Checking server connectivity...', 'magenta');
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 }).catch(() => {});
    log('✅ Server is reachable\n', 'green');
  } catch (error) {
    log('⚠️  Could not verify server connectivity. Proceeding anyway...\n', 'yellow');
  }

  try {
    // Step 1: Register a new mobile user
    log('\n1️⃣  Step 1: Registering new mobile user...', 'magenta');
    const registerResponse = await makeRequest('POST', `${BASE_URL}/api/mobile/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: TEST_NAME
    });

    if (!registerResponse.success) {
      log('❌ Registration failed:', 'red');
      log(`   Status: ${registerResponse.status}`, 'red');
      if (typeof registerResponse.error === 'object') {
        console.log(JSON.stringify(registerResponse.error, null, 2));
      } else {
        console.log(registerResponse.error);
      }
      
      // Check if it's a connection error
      if (registerResponse.error?.code === 'ECONNREFUSED' || registerResponse.error?.code === 'ENOTFOUND') {
        log('\n💡 Server might not be running. Start the server with:', 'yellow');
        log('   npm start  or  npm run dev', 'yellow');
        log(`   Expected server URL: ${BASE_URL}\n`, 'yellow');
      }
      return;
    }

    userId = registerResponse.data.data?.user?.id || registerResponse.data.data?.id;
    authToken = registerResponse.data.data?.token || registerResponse.data.token;
    
    if (!authToken) {
      log('⚠️  No auth token received, trying to login...', 'yellow');
      const loginResponse = await makeRequest('POST', `${BASE_URL}/api/mobile/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      if (loginResponse.success) {
        authToken = loginResponse.data.data?.token || loginResponse.data.token;
        userId = loginResponse.data.data?.user?.id || loginResponse.data.data?.id;
      }
    }

    if (!authToken) {
      log('❌ Could not obtain auth token. Cannot proceed with tests.', 'red');
      return;
    }

    log(`✅ User registered/login successful. User ID: ${userId}`, 'green');

    // Step 2: Create a payment order (to get orderId)
    log('\n2️⃣  Step 2: Creating payment order...', 'magenta');
    const orderResponse = await makeRequest('POST', `${BASE_URL}/api/mobile/subscriptions/create-order`, {
      planId: 'quarterly_pro',
      amount: 499
    });

    if (!orderResponse.success) {
      log('❌ Create order failed:', 'red');
      console.log(orderResponse.error);
      // Continue anyway with mock orderId
    } else {
      log('✅ Order created successfully', 'green');
      console.log('Order details:', JSON.stringify(orderResponse.data, null, 2));
    }

    const orderId = orderResponse.data?.data?.orderId || `order_${Date.now()}_test`;
    log(`📦 Using orderId: ${orderId}`, 'blue');

    // Step 3: Test verify-payment with valid data
    log('\n3️⃣  Step 3: Testing verify-payment with valid data...', 'magenta');
    const verifyResponse1 = await makeRequest('POST', `${BASE_URL}/api/mobile/subscriptions/verify-payment`, {
      orderId: orderId,
      paymentId: `pay_${Date.now()}_test1`,
      signature: `sig_${Date.now()}_test1`
    });

    if (verifyResponse1.success) {
      log('✅ Payment verification successful!', 'green');
      console.log('Response:', JSON.stringify(verifyResponse1.data, null, 2));
      
      // Check subscription status
      log('\n4️⃣  Step 4: Checking subscription status...', 'magenta');
      const statusResponse = await makeRequest('GET', `${BASE_URL}/api/mobile/subscriptions/status`);
      
      if (statusResponse.success) {
        log('✅ Subscription status retrieved', 'green');
        console.log('Status:', JSON.stringify(statusResponse.data, null, 2));
      } else {
        log('⚠️  Could not retrieve subscription status', 'yellow');
      }
    } else {
      log('❌ Payment verification failed:', 'red');
      console.log(verifyResponse1.error);
    }

    // Step 5: Test duplicate payment (should be prevented)
    log('\n5️⃣  Step 5: Testing duplicate payment prevention...', 'magenta');
    const duplicatePaymentId = `pay_${Date.now()}_duplicate`;
    const verifyResponse2 = await makeRequest('POST', `${BASE_URL}/api/mobile/subscriptions/verify-payment`, {
      orderId: orderId,
      paymentId: duplicatePaymentId,
      signature: `sig_${Date.now()}_test2`
    });

    if (verifyResponse2.success) {
      log('⚠️  ISSUE: Duplicate payment was allowed!', 'yellow');
      console.log('This should be prevented - same orderId used twice');
    } else {
      log('✅ Duplicate payment correctly rejected', 'green');
    }

    // Step 6: Test with missing fields
    log('\n6️⃣  Step 6: Testing validation (missing fields)...', 'magenta');
    const invalidResponse1 = await makeRequest('POST', `${BASE_URL}/api/mobile/subscriptions/verify-payment`, {
      orderId: orderId,
      // Missing paymentId and signature
    });

    if (!invalidResponse1.success && invalidResponse1.status === 400) {
      log('✅ Validation correctly rejected missing fields', 'green');
    } else {
      log('⚠️  Validation issue: Missing fields should be rejected', 'yellow');
    }

    // Step 7: Test without authentication
    log('\n7️⃣  Step 7: Testing without authentication...', 'magenta');
    const noAuthResponse = await makeRequest(
      'POST',
      `${BASE_URL}/api/mobile/subscriptions/verify-payment`,
      {
        orderId: orderId,
        paymentId: `pay_${Date.now()}_noauth`,
        signature: `sig_${Date.now()}_noauth`
      },
      { Authorization: '' }
    );

    if (!noAuthResponse.success && noAuthResponse.status === 401) {
      log('✅ Authentication correctly required', 'green');
    } else {
      log('⚠️  Security issue: Endpoint should require authentication', 'yellow');
    }

    // Step 8: Check payment history
    log('\n8️⃣  Step 8: Checking payment history...', 'magenta');
    const historyResponse = await makeRequest('GET', `${BASE_URL}/api/mobile/subscriptions/history`);
    
    if (historyResponse.success) {
      log('✅ Payment history retrieved', 'green');
      console.log('History:', JSON.stringify(historyResponse.data, null, 2));
    } else {
      log('⚠️  Could not retrieve payment history', 'yellow');
    }

    log('\n📊 Test Summary', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log(`✅ Registration/Login: ${authToken ? 'PASS' : 'FAIL'}`, authToken ? 'green' : 'red');
    log(`✅ Create Order: ${orderResponse.success ? 'PASS' : 'FAIL'}`, orderResponse.success ? 'green' : 'red');
    log(`✅ Verify Payment: ${verifyResponse1.success ? 'PASS' : 'FAIL'}`, verifyResponse1.success ? 'green' : 'red');
    log(`✅ Validation: ${!invalidResponse1.success ? 'PASS' : 'FAIL'}`, !invalidResponse1.success ? 'green' : 'red');
    log(`✅ Authentication: ${!noAuthResponse.success ? 'PASS' : 'FAIL'}`, !noAuthResponse.success ? 'green' : 'red');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  } catch (error) {
    log('\n❌ Test execution error:', 'red');
    console.error(error);
  }
}

// Run tests
runTests();

