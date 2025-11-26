#!/usr/bin/env node

/**
 * Debug Search API Errors
 * Tests search endpoints with detailed error logging
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
        'User-Agent': 'EventMarketers-Debug-Tester/1.0',
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
            data: jsonData,
            rawData: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            rawData: data
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

async function testSimpleSearch() {
  if (!authToken) {
    console.log('❌ No auth token available');
    return;
  }

  console.log('\n🔍 Testing Simple Search Queries...');
  
  const tests = [
    {
      name: 'Empty Search (no query)',
      url: `${BASE_URL}/api/search/content`,
      description: 'Search without any query parameters'
    },
    {
      name: 'Empty Query String',
      url: `${BASE_URL}/api/search/content?q=`,
      description: 'Search with empty query string'
    },
    {
      name: 'Simple Single Word',
      url: `${BASE_URL}/api/search/content?q=test`,
      description: 'Search with simple word "test"'
    },
    {
      name: 'Single Letter',
      url: `${BASE_URL}/api/search/content?q=a`,
      description: 'Search with single letter "a"'
    },
    {
      name: 'Category Only',
      url: `${BASE_URL}/api/search/content?category=BUSINESS`,
      description: 'Search by category only'
    },
    {
      name: 'Category with Empty Query',
      url: `${BASE_URL}/api/search/content?category=BUSINESS&q=`,
      description: 'Search by category with empty query'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n📋 ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await makeRequest(test.url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200 && response.data.success) {
        console.log(`   ✅ SUCCESS`);
        const data = response.data.data || {};
        const content = data.content || [];
        const pagination = data.pagination || {};
        console.log(`   📄 Results: ${content.length} items`);
        console.log(`   📊 Total: ${pagination.totalCount || 0} items`);
      } else if (response.status === 500) {
        console.log(`   ❌ SERVER ERROR`);
        console.log(`   Error:`, response.data.error || 'No error message');
        console.log(`   Raw Response:`, response.rawData.substring(0, 200) + '...');
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`   Error:`, response.data.error || 'Unknown error');
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.log(`   ❌ EXCEPTION: ${error.message}`);
    }
  }
}

async function testIndividualEndpoints() {
  console.log('\n🔍 Testing Individual Search Endpoints...');
  
  const endpoints = [
    {
      name: 'Images Search',
      url: `${BASE_URL}/api/search/images?q=test`,
      description: 'Search images with query'
    },
    {
      name: 'Videos Search', 
      url: `${BASE_URL}/api/search/videos?q=test`,
      description: 'Search videos with query'
    },
    {
      name: 'Images No Query',
      url: `${BASE_URL}/api/search/images`,
      description: 'Search images without query'
    },
    {
      name: 'Videos No Query',
      url: `${BASE_URL}/api/search/videos`,
      description: 'Search videos without query'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📋 ${endpoint.name}`);
      console.log(`   ${endpoint.description}`);
      
      const response = await makeRequest(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200 && response.data.success) {
        console.log(`   ✅ SUCCESS`);
        const data = response.data.data || {};
        const items = data.images || data.videos || [];
        const pagination = data.pagination || {};
        console.log(`   📄 Results: ${items.length} items`);
        console.log(`   📊 Total: ${pagination.totalCount || 0} items`);
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`   Error:`, response.data.error || 'Unknown error');
        if (response.status === 500) {
          console.log(`   Raw Response:`, response.rawData.substring(0, 300) + '...');
        }
      }
    } catch (error) {
      console.log(`   ❌ EXCEPTION: ${error.message}`);
    }
  }
}

async function runDebugTests() {
  console.log('🐛 Debugging EventMarketers Search API Errors\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  // First login to get auth token
  const loginSuccess = await loginAdmin();
  
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Test simple search queries
  await testSimpleSearch();
  
  // Test individual endpoints
  await testIndividualEndpoints();
  
  console.log('\n🔍 Debug testing complete!');
}

// Run the tests
runDebugTests().catch(console.error);
