#!/usr/bin/env node

/**
 * Fixed Search API Test
 * Tests search endpoints with proper authentication
 */

const https = require('https');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';
let authToken = null;

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EventMarketers-Search-Tester/1.0',
        ...options.headers
      }
    };

    if (options.body) {
      const bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      const bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(bodyString);
    }

    req.end();
  });
}

async function loginAdmin() {
  console.log('🔐 Logging in as admin...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      body: {
        email: 'admin@eventmarketers.com',
        password: 'admin123'
      }
    });
    
    if (response.status === 200 && response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log(`✅ Login successful!`);
      console.log(`   Token: ${authToken.substring(0, 30)}...`);
      return true;
    } else {
      console.log(`❌ Login failed:`, response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Login error:`, error.message);
    return false;
  }
}

async function testSearchAPI() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  console.log('🔍 Testing Search API with authentication...');
  
  const tests = [
    {
      name: 'Search All Content',
      url: `${BASE_URL}/api/search/content?q=test`,
      description: 'Search for content containing "test"'
    },
    {
      name: 'Search Images',
      url: `${BASE_URL}/api/search/images?q=business`,
      description: 'Search for images containing "business"'
    },
    {
      name: 'Search Videos',
      url: `${BASE_URL}/api/search/videos?q=festival`,
      description: 'Search for videos containing "festival"'
    },
    {
      name: 'Search by Category',
      url: `${BASE_URL}/api/search/content?category=BUSINESS`,
      description: 'Search content by business category'
    },
    {
      name: 'Search Suggestions',
      url: `${BASE_URL}/api/search/suggestions?q=test`,
      description: 'Get search suggestions for "test"'
    },
    {
      name: 'Search Statistics',
      url: `${BASE_URL}/api/search/stats`,
      description: 'Get search statistics'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n📋 ${test.name}`);
      console.log(`   ${test.description}`);
      
      const response = await makeRequest(test.url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.status === 200 && response.data.success) {
        console.log(`   ✅ SUCCESS - Status: ${response.status}`);
        
        // Show relevant data based on endpoint
        if (test.name.includes('Statistics')) {
          console.log(`   📊 Stats:`, response.data.stats);
        } else if (test.name.includes('Suggestions')) {
          console.log(`   💡 Suggestions: ${response.data.suggestions?.length || 0} found`);
        } else if (test.name.includes('Content')) {
          const content = response.data.data?.content || [];
          const pagination = response.data.data?.pagination || {};
          console.log(`   📄 Results: ${content.length} items`);
          console.log(`   📊 Total: ${pagination.totalCount || 0} items`);
        } else {
          const data = response.data.data || {};
          const items = data.images || data.videos || [];
          const pagination = data.pagination || {};
          console.log(`   📄 Results: ${items.length} items`);
          console.log(`   📊 Total: ${pagination.totalCount || 0} items`);
        }
      } else {
        console.log(`   ❌ FAILED - Status: ${response.status}`);
        console.log(`   Error:`, response.data.error || 'Unknown error');
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
}

async function testSearchWithoutAuth() {
  console.log('\n🔒 Testing Search API without authentication (should fail)...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/search/content?q=test`);
    
    if (response.status === 401) {
      console.log(`✅ Correctly rejected - Status: ${response.status}`);
      console.log(`   Error: ${response.data.error || 'Unauthorized'}`);
    } else {
      console.log(`❌ Unexpected - Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Testing EventMarketers Search API\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  // First login to get auth token
  const loginSuccess = await loginAdmin();
  
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Test search API with authentication
  await testSearchAPI();
  
  // Test search API without authentication (should fail)
  await testSearchWithoutAuth();
  
  console.log('\n🎉 Search API testing complete!');
}

// Run the tests
runTests().catch(console.error);
