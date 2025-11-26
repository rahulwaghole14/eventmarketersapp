const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testMobileAPIs() {
  console.log('🚀 Testing Mobile APIs...\n');
  
  const tests = [
    {
      name: 'Health Check',
      url: `${BASE_URL}/health`,
      method: 'GET'
    },
    {
      name: 'Mobile Home Stats',
      url: `${BASE_URL}/api/mobile/home/stats`,
      method: 'GET'
    },
    {
      name: 'Mobile Templates',
      url: `${BASE_URL}/api/mobile/templates`,
      method: 'GET'
    },
    {
      name: 'Mobile Greetings',
      url: `${BASE_URL}/api/mobile/greetings`,
      method: 'GET'
    },
    {
      name: 'Mobile Posters',
      url: `${BASE_URL}/api/mobile/posters`,
      method: 'GET'
    },
    {
      name: 'Mobile Posters Categories',
      url: `${BASE_URL}/api/mobile/posters/categories`,
      method: 'GET'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      const response = await axios({
        method: test.method,
        url: test.url,
        timeout: 5000
      });
      
      console.log(`✅ ${test.name}: ${response.status} - ${response.data?.success ? 'Success' : 'Response received'}`);
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${test.name}: Server not running`);
      } else if (error.response) {
        console.log(`⚠️  ${test.name}: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
      } else {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
  }
  
  console.log('\n📊 Test Summary:');
  console.log('If server is running, you should see API responses above.');
  console.log('If server is not running, start it with: npm run dev');
}

testMobileAPIs().catch(console.error);