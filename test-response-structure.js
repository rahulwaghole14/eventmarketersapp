#!/usr/bin/env node

/**
 * Test Response Structure to Verify Deployment
 * Check if the business category search logic is deployed
 */

const https = require('https');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'EventMarketers-Debug/1.0',
        ...options.headers
      }
    };

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

    req.end();
  });
}

async function testResponseStructure() {
  console.log('🔍 Testing Response Structure to Verify Deployment...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  console.log('=' * 80);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/mobile/greetings/templates?search=motivational`);
    
    if (response.status === 200 && response.data.success) {
      const data = response.data.data;
      
      console.log('📋 RESPONSE STRUCTURE ANALYSIS:');
      console.log('=' * 50);
      
      console.log('\n🔍 Available fields in response.data:');
      Object.keys(data).forEach(key => {
        console.log(`   ✅ ${key}: ${typeof data[key]} (${Array.isArray(data[key]) ? data[key].length : 'not array'})`);
      });
      
      console.log('\n🔍 Expected fields for business category search:');
      console.log(`   ${data.businessCategoryImages !== undefined ? '✅' : '❌'} businessCategoryImages`);
      console.log(`   ${data.businessCategoryPagination !== undefined ? '✅' : '❌'} businessCategoryPagination`);
      console.log(`   ${data.totalResults !== undefined ? '✅' : '❌'} totalResults`);
      
      console.log('\n🔍 Current response structure:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n🎯 DEPLOYMENT ANALYSIS:');
      console.log('=' * 50);
      
      if (data.businessCategoryImages !== undefined) {
        console.log('✅ Business category search logic IS deployed');
        console.log(`   Found ${data.businessCategoryImages.length} business category images`);
      } else {
        console.log('❌ Business category search logic is NOT deployed');
        console.log('   The response does not include businessCategoryImages field');
        console.log('   This indicates the updated code is not live on the server');
      }
      
      if (data.businessCategoryPagination !== undefined) {
        console.log('✅ Business category pagination IS deployed');
      } else {
        console.log('❌ Business category pagination is NOT deployed');
      }
      
      console.log('\n💡 CONCLUSION:');
      if (data.businessCategoryImages === undefined) {
        console.log('The business category search fix is NOT deployed on the server.');
        console.log('The current response structure matches the old version without the fix.');
        console.log('We need to wait for the deployment to complete or check deployment status.');
      } else {
        console.log('The business category search fix IS deployed on the server.');
        console.log('The issue might be with the search logic itself or data conditions.');
      }
      
    } else {
      console.log(`❌ Request failed with status: ${response.status}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n🎉 Response structure test complete!');
}

testResponseStructure().catch(console.error);
