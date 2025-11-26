#!/usr/bin/env node

/**
 * EventMarketers API Testing Script
 * Tests all major API endpoints to ensure they're working correctly
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';
let authToken = null;

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EventMarketers-API-Tester/1.0',
        ...options.headers
      }
    };

    if (options.body) {
      const bodyString = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = client.request(requestOptions, (res) => {
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

// Test result tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name} - PASSED`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name} - FAILED`);
  }
  
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.details.push({ name, passed, details });
  console.log('');
}

async function testHealthCheck() {
  console.log('🔍 Testing Health Check...');
  try {
    const response = await makeRequest(`${BASE_URL}/health`);
    const passed = response.status === 200 && response.data.success === true;
    logTest('Health Check', passed, `Status: ${response.status}, Healthy: ${response.data.success}`);
    return passed;
  } catch (error) {
    logTest('Health Check', false, `Error: ${error.message}`);
    return false;
  }
}

async function testAdminLogin() {
  console.log('🔐 Testing Admin Login...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      body: {
        email: 'admin@eventmarketers.com',
        password: 'admin123'
      }
    });
    
    const passed = response.status === 200 && response.data.success === true && response.data.token;
    
    if (passed) {
      authToken = response.data.token;
      console.log(`✅ Admin Login - PASSED`);
      console.log(`   Token received: ${authToken.substring(0, 20)}...`);
      console.log(`   Admin: ${response.data.data?.name || 'Unknown'}`);
    } else {
      console.log(`❌ Admin Login - FAILED`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
    }
    
    testResults.total++;
    if (passed) testResults.passed++; else testResults.failed++;
    testResults.details.push({ name: 'Admin Login', passed, details: `Status: ${response.status}` });
    console.log('');
    
    return passed;
  } catch (error) {
    logTest('Admin Login', false, `Error: ${error.message}`);
    return false;
  }
}

async function testGetImages() {
  console.log('🖼️ Testing Get Images...');
  if (!authToken) {
    logTest('Get Images', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/content/images`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Get Images', passed, `Status: ${response.status}, Images: ${response.data.images?.length || 0}`);
    return passed;
  } catch (error) {
    logTest('Get Images', false, `Error: ${error.message}`);
    return false;
  }
}

async function testGetVideos() {
  console.log('🎥 Testing Get Videos...');
  if (!authToken) {
    logTest('Get Videos', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/content/videos`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Get Videos', passed, `Status: ${response.status}, Videos: ${response.data.videos?.length || 0}`);
    return passed;
  } catch (error) {
    logTest('Get Videos', false, `Error: ${error.message}`);
    return false;
  }
}

async function testBusinessCategories() {
  console.log('📂 Testing Business Categories...');
  if (!authToken) {
    logTest('Business Categories', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/admin/business-categories`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Business Categories', passed, `Status: ${response.status}, Categories: ${response.data.categories?.length || 0}`);
    return passed;
  } catch (error) {
    logTest('Business Categories', false, `Error: ${error.message}`);
    return false;
  }
}

async function testSubadmins() {
  console.log('👥 Testing Get Subadmins...');
  if (!authToken) {
    logTest('Get Subadmins', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/admin/subadmins`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Get Subadmins', passed, `Status: ${response.status}, Subadmins: ${response.data.subadmins?.length || 0}`);
    return passed;
  } catch (error) {
    logTest('Get Subadmins', false, `Error: ${error.message}`);
    return false;
  }
}

async function testCustomers() {
  console.log('👤 Testing Get Customers...');
  if (!authToken) {
    logTest('Get Customers', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/admin/customers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Get Customers', passed, `Status: ${response.status}, Customers: ${response.data.data?.customers?.length || 0}`);
    return passed;
  } catch (error) {
    logTest('Get Customers', false, `Error: ${error.message}`);
    return false;
  }
}

async function testSubscriptions() {
  console.log('💳 Testing Get Subscriptions...');
  if (!authToken) {
    logTest('Get Subscriptions', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/admin/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Get Subscriptions', passed, `Status: ${response.status}, Subscriptions: ${response.data.data?.subscriptions?.length || 0}`);
    return passed;
  } catch (error) {
    logTest('Get Subscriptions', false, `Error: ${error.message}`);
    return false;
  }
}

async function testFileManagement() {
  console.log('📁 Testing File Management...');
  if (!authToken) {
    logTest('File Management', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/file-management/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('File Management', passed, `Status: ${response.status}, Upload Dir: ${response.data.data?.uploadsDirectory?.exists || false}`);
    return passed;
  } catch (error) {
    logTest('File Management', false, `Error: ${error.message}`);
    return false;
  }
}

async function testSearchAPI() {
  console.log('🔍 Testing Search API...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/search/content?q=test`);
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Search API', passed, `Status: ${response.status}, Results: ${response.data.data?.totalResults || 0}`);
    return passed;
  } catch (error) {
    logTest('Search API', false, `Error: ${error.message}`);
    return false;
  }
}

async function testAnalytics() {
  console.log('📊 Testing Analytics...');
  if (!authToken) {
    logTest('Analytics', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/analytics/dashboard`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Analytics', passed, `Status: ${response.status}, Data available: ${!!response.data.data}`);
    return passed;
  } catch (error) {
    logTest('Analytics', false, `Error: ${error.message}`);
    return false;
  }
}

async function testContentSync() {
  console.log('🔄 Testing Content Sync...');
  if (!authToken) {
    logTest('Content Sync', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/content-sync/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const passed = response.status === 200 && response.data.success === true;
    logTest('Content Sync', passed, `Status: ${response.status}, Sync available: ${!!response.data.data}`);
    return passed;
  } catch (error) {
    logTest('Content Sync', false, `Error: ${error.message}`);
    return false;
  }
}

async function testMobileAPIs() {
  console.log('📱 Testing Mobile APIs...');
  
  // Test mobile business categories (public endpoint)
  try {
    const response = await makeRequest(`${BASE_URL}/api/mobile/business-categories`);
    const passed = response.status === 200 && response.data.success === true;
    logTest('Mobile Business Categories', passed, `Status: ${response.status}, Categories: ${response.data.categories?.length || 0}`);
  } catch (error) {
    logTest('Mobile Business Categories', false, `Error: ${error.message}`);
  }
  
  // Test mobile home endpoint (if available)
  try {
    const response = await makeRequest(`${BASE_URL}/api/mobile/home`);
    const passed = response.status === 200;
    logTest('Mobile Home', passed, `Status: ${response.status}`);
  } catch (error) {
    logTest('Mobile Home', false, `Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🚀 Starting EventMarketers API Tests...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  console.log('=' * 60);
  
  // Run tests in sequence
  await testHealthCheck();
  await testAdminLogin();
  await testGetImages();
  await testGetVideos();
  await testBusinessCategories();
  await testSubadmins();
  await testCustomers();
  await testSubscriptions();
  await testFileManagement();
  await testSearchAPI();
  await testAnalytics();
  await testContentSync();
  await testMobileAPIs();
  
  // Print summary
  console.log('=' * 60);
  console.log('📊 TEST SUMMARY');
  console.log('=' * 60);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total:  ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  console.log('\n📋 DETAILED RESULTS:');
  testResults.details.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
    if (test.details) {
      console.log(`   ${test.details}`);
    }
  });
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Your API is working perfectly! 🎉');
  } else {
    console.log(`\n⚠️  ${testResults.failed} tests failed. Check the details above.`);
  }
}

// Run the tests
runAllTests().catch(console.error);
