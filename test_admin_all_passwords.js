const axios = require('axios');

const LIVE_SERVER = 'https://eventmarketersbackend.onrender.com';

const passwords = [
  'EventMarketers2024!',
  'admin123',
  'Admin@123',
  'password123',
  'admin',
  'Admin123',
  'eventmarketers',
  'EventMarketers123'
];

async function testAllPasswords() {
  console.log('🔐 Testing All Possible Admin Passwords');
  console.log('='.repeat(80));
  console.log('📧 Email: admin@eventmarketers.com');
  console.log(`🔑 Testing ${passwords.length} different passwords...`);
  console.log('='.repeat(80));
  console.log();

  for (let i = 0; i < passwords.length; i++) {
    const password = passwords[i];
    console.log(`${i + 1}. Testing password: "${password}"`);
    
    try {
      const response = await axios.post(`${LIVE_SERVER}/api/auth/admin/login`, {
        email: 'admin@eventmarketers.com',
        password: password
      }, { 
        timeout: 15000,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        console.log(`   ✅ SUCCESS! This password works!`);
        console.log('   ='.repeat(40));
        console.log(`   📧 Email: admin@eventmarketers.com`);
        console.log(`   🔑 Password: ${password}`);
        console.log(`   🎫 Token: ${response.data.data?.token?.substring(0, 50)}...`);
        console.log(`   👤 Name: ${response.data.data?.user?.name}`);
        console.log(`   🎭 Role: ${response.data.data?.user?.role}`);
        console.log('   ='.repeat(40));
        console.log();
        console.log('🎉 WORKING ADMIN CREDENTIALS FOUND!');
        console.log('='.repeat(80));
        return true;
      } else {
        console.log(`   ❌ Failed (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ Failed`);
    }
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log('❌ NO WORKING PASSWORD FOUND');
  console.log('='.repeat(80));
  console.log();
  console.log('📋 Next steps:');
  console.log('   1. Admin user exists but password is unknown');
  console.log('   2. We need to reset/update the admin password');
  console.log('   3. Use setup endpoint to update admin password');
  console.log('='.repeat(80));
  
  return false;
}

testAllPasswords();






