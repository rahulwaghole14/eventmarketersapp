const axios = require('axios');

const LIVE_SERVER = 'https://eventmarketersbackend.onrender.com';
const LOCAL_SERVER = 'http://localhost:3001';

async function testRegisterLoginFlow(serverUrl, serverName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing Register → Login Flow on ${serverName}`);
  console.log(`${'='.repeat(80)}`);
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Step 1: Register
    console.log('\n📝 Step 1: Registering new user...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
    const registerResponse = await axios.post(`${serverUrl}/api/mobile/auth/register`, {
      email: testEmail,
      password: testPassword,
      companyName: 'Test Company',
      phone: '1234567890',
      displayName: 'Test User'
    }, { timeout: 30000 });
    
    console.log(`   ✅ Registration successful! Status: ${registerResponse.status}`);
    console.log(`   👤 User ID: ${registerResponse.data.user?.id}`);
    console.log(`   📧 Email saved: ${registerResponse.data.user?.email}`);
    
    // Step 2: Login with same credentials
    console.log('\n🔐 Step 2: Logging in with same credentials...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
    const loginResponse = await axios.post(`${serverUrl}/api/mobile/auth/login`, {
      email: testEmail,
      password: testPassword
    }, { timeout: 30000 });
    
    console.log(`   ✅ Login successful! Status: ${loginResponse.status}`);
    console.log(`   🎫 Token received: ${loginResponse.data.token ? 'Yes' : 'No'}`);
    console.log(`   👤 User ID: ${loginResponse.data.user?.id}`);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ ${serverName}: REGISTER → LOGIN FLOW WORKS PERFECTLY!`);
    console.log(`${'='.repeat(80)}`);
    
    return true;
    
  } catch (error) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`❌ ${serverName}: TEST FAILED!`);
    console.log(`${'='.repeat(80)}`);
    
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📋 Error: ${error.response.data?.error || error.response.data?.message}`);
      console.log(`📄 Full response:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`📋 Error: ${error.message}`);
    }
    
    return false;
  }
}

async function runTests() {
  console.log('\n🔍 REGISTER → LOGIN FLOW DIAGNOSTIC TEST');
  console.log('='.repeat(80));
  
  // Test local server first
  console.log('\n📍 Testing LOCAL server...');
  const localResult = await testRegisterLoginFlow(LOCAL_SERVER, 'LOCAL SERVER');
  
  // Test live server
  console.log('\n\n📍 Testing LIVE server...');
  const liveResult = await testRegisterLoginFlow(LIVE_SERVER, 'LIVE SERVER');
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(80));
  console.log(`Local Server:  ${localResult ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Live Server:   ${liveResult ? '✅ WORKING' : '❌ FAILED'}`);
  console.log('='.repeat(80));
}

runTests();






