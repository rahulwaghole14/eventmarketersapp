const axios = require('axios');

const LIVE_SERVER = 'https://eventmarketersbackend.onrender.com';
const SETUP_SECRET = 'EventMarketers_Setup_2024_Secret_Key';

async function createAdminViaAPI() {
  console.log('🔐 Creating Admin User via API Endpoint');
  console.log('='.repeat(80));
  console.log(`📍 Server: ${LIVE_SERVER}`);
  console.log(`⏰ Starting at: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80));
  console.log();

  try {
    console.log('📡 Calling setup endpoint...');
    
    const response = await axios.post(`${LIVE_SERVER}/api/setup/create-admin-user`, {
      secret: SETUP_SECRET
    }, {
      timeout: 30000
    });

    console.log('✅ SUCCESS!');
    console.log('='.repeat(80));
    console.log('📋 RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(response.data, null, 2));
    console.log('='.repeat(80));
    console.log();

    if (response.data.success) {
      console.log('🎉 ADMIN USER CREATED SUCCESSFULLY!');
      console.log('='.repeat(80));
      console.log();
      console.log('🔐 LOGIN CREDENTIALS:');
      console.log('━'.repeat(80));
      console.log(`📧 Email:    ${response.data.credentials?.email || 'admin@eventmarketers.com'}`);
      console.log(`🔑 Password: ${response.data.credentials?.password || 'EventMarketers2024!'}`);
      console.log('━'.repeat(80));
      console.log();
      console.log('👤 ADMIN DETAILS:');
      console.log('━'.repeat(80));
      console.log(`🆔 ID:   ${response.data.admin?.id}`);
      console.log(`📧 Email: ${response.data.admin?.email}`);
      console.log(`👤 Name:  ${response.data.admin?.name}`);
      console.log(`🎭 Role:  ${response.data.admin?.role}`);
      console.log('━'.repeat(80));
      console.log();
      console.log('🧪 TESTING LOGIN...');
      console.log('='.repeat(80));

      // Test login
      const loginResponse = await axios.post(`${LIVE_SERVER}/api/auth/admin/login`, {
        email: response.data.credentials?.email || 'admin@eventmarketers.com',
        password: response.data.credentials?.password || 'EventMarketers2024!'
      });

      if (loginResponse.status === 200) {
        console.log('✅ LOGIN TEST SUCCESSFUL!');
        console.log();
        console.log('🎫 TOKEN RECEIVED:');
        console.log(loginResponse.data.token);
        console.log();
        console.log('='.repeat(80));
        console.log('🎉 EVERYTHING WORKING PERFECTLY!');
        console.log('='.repeat(80));
        console.log();
        console.log('⚠️  IMPORTANT: Now remove the setup endpoint from deployment_server.js');
        console.log('    and redeploy for security!');
        console.log('='.repeat(80));
      }
    }

  } catch (error) {
    console.error('❌ ERROR!');
    console.log('='.repeat(80));
    
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📋 Response:`, JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log();
        console.log('⚠️  Invalid setup secret. Make sure the secret in the script');
        console.log('    matches the one in deployment_server.js');
      } else if (error.response.status === 404) {
        console.log();
        console.log('⚠️  Setup endpoint not found. Make sure you:');
        console.log('    1. Added the endpoint to deployment_server.js');
        console.log('    2. Committed and pushed the changes');
        console.log('    3. Waited for Render deployment to complete');
      }
    } else {
      console.log('📋 Error:', error.message);
    }
    
    console.log('='.repeat(80));
  }
}

// Run the setup
createAdminViaAPI();






