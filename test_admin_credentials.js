const axios = require('axios');

const LIVE_SERVER = 'https://eventmarketersbackend.onrender.com';

// List of possible admin credentials to test
const credentialsList = [
  {
    name: 'Primary Admin (from ADMIN_USER_CREDENTIALS.md)',
    email: 'admin@eventmarketers.com',
    password: 'EventMarketers2024!'
  },
  {
    name: 'Seed Admin (from prisma/seed.ts)',
    email: 'admin@eventmarketers.com',
    password: 'admin123'
  },
  {
    name: 'Alternative Admin',
    email: 'admin@example.com',
    password: 'adminpassword'
  },
  {
    name: 'Simple Admin',
    email: 'admin@eventmarketers.com',
    password: 'Admin@123'
  }
];

async function testAdminLogin(email, password) {
  try {
    const response = await axios.post(`${LIVE_SERVER}/api/auth/admin/login`, {
      email,
      password
    }, {
      timeout: 10000,
      validateStatus: null // Don't throw on any status code
    });

    return {
      success: response.status === 200,
      status: response.status,
      data: response.data,
      token: response.data?.token || null
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 'ERROR',
      error: error.message,
      data: error.response?.data || null
    };
  }
}

async function testAllCredentials() {
  console.log('🔐 Testing Admin Credentials on Live Server');
  console.log('='.repeat(80));
  console.log(`📍 Server: ${LIVE_SERVER}`);
  console.log(`⏰ Starting at: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80));
  console.log();

  let successfulCredentials = [];

  for (let i = 0; i < credentialsList.length; i++) {
    const creds = credentialsList[i];
    console.log(`🧪 Test ${i + 1}/${credentialsList.length}: ${creds.name}`);
    console.log(`   📧 Email: ${creds.email}`);
    console.log(`   🔑 Password: ${creds.password}`);
    console.log('   Testing...');

    const result = await testAdminLogin(creds.email, creds.password);

    if (result.success) {
      console.log(`   ✅ SUCCESS! Login works!`);
      console.log(`   📊 Status: ${result.status}`);
      console.log(`   🎫 Token received: ${result.token ? 'Yes' : 'No'}`);
      if (result.token) {
        console.log(`   🔑 Token (first 50 chars): ${result.token.substring(0, 50)}...`);
      }
      console.log(`   👤 User: ${result.data?.user?.name || 'N/A'}`);
      console.log(`   🆔 User ID: ${result.data?.user?.id || 'N/A'}`);
      
      successfulCredentials.push({
        ...creds,
        token: result.token,
        userId: result.data?.user?.id,
        userName: result.data?.user?.name
      });
    } else {
      console.log(`   ❌ FAILED`);
      console.log(`   📊 Status: ${result.status}`);
      console.log(`   📋 Error: ${result.data?.error || result.error || 'Unknown error'}`);
    }
    
    console.log('-'.repeat(80));
    console.log();
  }

  // Summary
  console.log('='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Successful logins: ${successfulCredentials.length}/${credentialsList.length}`);
  console.log(`❌ Failed logins: ${credentialsList.length - successfulCredentials.length}/${credentialsList.length}`);
  console.log('='.repeat(80));
  console.log();

  if (successfulCredentials.length > 0) {
    console.log('🎉 WORKING CREDENTIALS FOUND!');
    console.log('='.repeat(80));
    
    successfulCredentials.forEach((creds, index) => {
      console.log(`\n${index + 1}. ${creds.name}`);
      console.log('   ✅ Status: WORKING');
      console.log(`   📧 Email: ${creds.email}`);
      console.log(`   🔑 Password: ${creds.password}`);
      console.log(`   👤 Name: ${creds.userName}`);
      console.log(`   🆔 User ID: ${creds.userId}`);
      console.log(`   🎫 Token: ${creds.token ? 'Available' : 'Not available'}`);
      
      if (creds.token) {
        console.log('\n   📝 COPY THIS FOR TESTING:');
        console.log('   ━'.repeat(40));
        console.log(`   Email:    ${creds.email}`);
        console.log(`   Password: ${creds.password}`);
        console.log(`   Token:    ${creds.token}`);
        console.log('   ━'.repeat(40));
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('💾 SAVE THESE CREDENTIALS - THEY ARE VERIFIED WORKING!');
    console.log('='.repeat(80));
    
  } else {
    console.log('⚠️  NO WORKING CREDENTIALS FOUND');
    console.log('='.repeat(80));
    console.log('\n📋 Possible reasons:');
    console.log('1. Admin user not created in production database');
    console.log('2. Password is different from test credentials');
    console.log('3. Admin account is inactive');
    console.log('4. Database seeding not run on production');
    console.log('\n🔧 Next steps:');
    console.log('1. Run database seed on production');
    console.log('2. Create admin user manually using create_admin_user.js');
    console.log('3. Check production database for admin users');
    console.log('='.repeat(80));
  }
}

// Run the tests
testAllCredentials().catch(console.error);






