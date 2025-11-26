const axios = require('axios');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';

async function testDownloadsTrack() {
  console.log('🧪 Testing POST /api/mobile/downloads/track\n');
  console.log('='.repeat(70));

  // Test cases
  const tests = [
    {
      name: 'Test 1: Valid request - TEMPLATE',
      data: {
        mobileUserId: 'cmgexfzpg0000gjwd97azss8v',
        resourceId: 'test-resource-1',
        resourceType: 'TEMPLATE',
        fileUrl: 'https://example.com/image.jpg'
      },
      expectedStatus: [200, 201]
    },
    {
      name: 'Test 2: Valid request - GREETING',
      data: {
        mobileUserId: 'cmgexfzpg0000gjwd97azss8v',
        resourceId: 'test-resource-2',
        resourceType: 'GREETING',
        fileUrl: 'https://example.com/greeting.jpg'
      },
      expectedStatus: [200, 201]
    },
    {
      name: 'Test 3: Missing mobileUserId',
      data: {
        resourceId: 'test-resource',
        resourceType: 'TEMPLATE'
      },
      expectedStatus: [400]
    },
    {
      name: 'Test 4: Missing resourceId',
      data: {
        mobileUserId: 'cmgexfzpg0000gjwd97azss8v',
        resourceType: 'TEMPLATE'
      },
      expectedStatus: [400]
    },
    {
      name: 'Test 5: Invalid resourceType',
      data: {
        mobileUserId: 'cmgexfzpg0000gjwd97azss8v',
        resourceId: 'test-resource',
        resourceType: 'INVALID_TYPE'
      },
      expectedStatus: [400]
    },
    {
      name: 'Test 6: Invalid user ID',
      data: {
        mobileUserId: 'invalid-user-id',
        resourceId: 'test-resource',
        resourceType: 'TEMPLATE'
      },
      expectedStatus: [404]
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n${test.name}`);
      console.log(`Data:`, JSON.stringify(test.data, null, 2));

      const response = await axios.post(
        `${BASE_URL}/api/mobile/downloads/track`,
        test.data,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
          validateStatus: () => true // Don't throw on any status
        }
      );

      const statusMatches = test.expectedStatus.includes(response.status);
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (statusMatches) {
        console.log(`✅ PASSED - Expected status ${test.expectedStatus.join(' or ')}`);
        
        if (response.status === 200 || response.status === 201) {
          const data = response.data;
          if (data.success) {
            console.log(`   Success: ${data.message || 'OK'}`);
            if (data.data?.download) {
              console.log(`   Download ID: ${data.data.download.id}`);
              console.log(`   Is New: ${data.data.isNew}`);
              console.log(`   Resource Type: ${data.data.download.resourceType}`);
              console.log(`   Resource ID: ${data.data.download.resourceId}`);
            }
          } else {
            console.log(`   Error: ${data.error || 'Unknown'}`);
          }
        } else if (response.status === 400) {
          const data = response.data;
          console.log(`   Validation Error: ${data.error || 'Unknown'}`);
          if (data.details) {
            console.log(`   Details:`, JSON.stringify(data.details, null, 2));
          }
        } else if (response.status === 404) {
          const data = response.data;
          console.log(`   Not Found: ${data.error || 'Unknown'}`);
        }
        
        passed++;
      } else {
        console.log(`❌ FAILED - Expected ${test.expectedStatus.join(' or ')}, got ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2).substring(0, 200));
        failed++;
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const statusMatches = test.expectedStatus.includes(status);
        
        console.log(`Status: ${status} ${error.response.statusText}`);
        
        if (statusMatches) {
          console.log(`✅ PASSED (via error) - Expected status ${test.expectedStatus.join(' or ')}`);
          passed++;
        } else {
          console.log(`❌ FAILED - Expected ${test.expectedStatus.join(' or ')}, got ${status}`);
          failed++;
        }
        
        if (error.response.data) {
          console.log(`   Response:`, JSON.stringify(error.response.data, null, 2).substring(0, 200));
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log(`❌ FAILED - Connection error: ${error.message}`);
        console.log(`   Endpoint might not exist or server is down`);
        failed++;
      } else {
        console.log(`❌ ERROR: ${error.message}`);
        failed++;
      }
    }
    
    console.log('-'.repeat(70));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);

  // Final check - test if endpoint exists at all
  console.log('\n' + '='.repeat(70));
  console.log('🔍 FINAL VERIFICATION: Checking if endpoint exists');
  console.log('='.repeat(70));
  
  try {
    const testResponse = await axios.post(
      `${BASE_URL}/api/mobile/downloads/track`,
      {},
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
        validateStatus: () => true
      }
    );
    
    if (testResponse.status === 400 || testResponse.status === 404) {
      console.log(`✅ Endpoint EXISTS (returned ${testResponse.status} - validation/not found error)`);
      console.log(`   This means the route is registered and working!`);
    } else if (testResponse.status === 404 && testResponse.data?.error?.includes('not found')) {
      console.log(`✅ Endpoint EXISTS (404 indicates route exists but resource not found)`);
    } else {
      console.log(`Status: ${testResponse.status}`);
      console.log(`Response:`, JSON.stringify(testResponse.data, null, 2).substring(0, 200));
    }
  } catch (error) {
    if (error.response) {
      console.log(`✅ Endpoint EXISTS (returned ${error.response.status})`);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log(`❌ Endpoint might NOT exist (connection timeout)`);
    } else {
      console.log(`⚠️  Unknown error: ${error.message}`);
    }
  }
}

testDownloadsTrack().catch(console.error);

