const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const LIVE_SERVER = 'https://eventmarketersbackend.onrender.com';
const prisma = new PrismaClient();

async function diagnosePasswordIssue() {
  console.log('🔍 DIAGNOSING PASSWORD REGISTRATION/LOGIN ISSUE');
  console.log('='.repeat(80));
  
  const testEmail = `diagnostic_${Date.now()}@example.com`;
  const testPassword = 'MySecurePassword123!';
  
  try {
    // Step 1: Register on live server
    console.log('\n📝 Step 1: Registering on LIVE server...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Password length: ${testPassword.length} characters`);
    
    const registerResponse = await axios.post(`${LIVE_SERVER}/api/mobile/auth/register`, {
      email: testEmail,
      password: testPassword,
      companyName: 'Diagnostic Test Company',
      phone: '9876543210',
      displayName: 'Diagnostic User'
    }, { 
      timeout: 30000,
      validateStatus: () => true // Accept any status
    });
    
    console.log(`   📊 Registration status: ${registerResponse.status}`);
    console.log(`   📋 Response:`, JSON.stringify(registerResponse.data, null, 2));
    
    if (registerResponse.status !== 201) {
      console.log(`\n❌ Registration failed!`);
      return;
    }
    
    const registeredUserId = registerResponse.data.data?.user?.id;
    console.log(`   ✅ Registration successful!`);
    console.log(`   🆔 User ID: ${registeredUserId}`);
    
    // Step 2: Try to login immediately
    console.log('\n🔐 Step 2: Attempting login with SAME credentials...');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Password length: ${testPassword.length} characters`);
    
    const loginResponse = await axios.post(`${LIVE_SERVER}/api/mobile/auth/login`, {
      email: testEmail,
      password: testPassword
    }, { 
      timeout: 30000,
      validateStatus: () => true
    });
    
    console.log(`   📊 Login status: ${loginResponse.status}`);
    console.log(`   📋 Response:`, JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.status === 200) {
      console.log(`\n✅ LOGIN SUCCESSFUL!`);
      console.log(`   🎫 Token received: ${loginResponse.data.data?.token ? 'Yes' : 'No'}`);
      console.log(`\n${'='.repeat(80)}`);
      console.log(`✅ NO ISSUE DETECTED - Register → Login works perfectly!`);
      console.log(`${'='.repeat(80)}`);
    } else {
      console.log(`\n❌ LOGIN FAILED!`);
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔴 ISSUE CONFIRMED!`);
      console.log(`${'='.repeat(80)}`);
      console.log(`\n📋 Diagnosis:`);
      console.log(`   1. Registration: ✅ Success (Status: ${registerResponse.status})`);
      console.log(`   2. Login: ❌ Failed (Status: ${loginResponse.status})`);
      console.log(`   3. Same credentials used in both`);
      console.log(`\n🔍 Possible causes:`);
      console.log(`   - Password not being saved correctly during registration`);
      console.log(`   - Password comparison logic issue in login`);
      console.log(`   - Password being modified/hashed inconsistently`);
      console.log(`   - Database constraint or trigger modifying password`);
      console.log(`\n💡 Recommendation:`);
      console.log(`   Check server logs for password storage and comparison`);
      console.log(`${'='.repeat(80)}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    if (error.code === 'ECONNABORTED') {
      console.log('\n⏱️  Request timed out - server might be overloaded or restarting');
    }
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePasswordIssue();

