#!/usr/bin/env node

/**
 * Detailed Debug Test for Greetings Business Category Search
 * Test the exact search logic step by step
 */

const https = require('https');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    console.log(`🔗 Making request to: ${url}`);
    
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

async function testGreetingsDebugDetailed() {
  console.log('🔍 Detailed Debug Test for Greetings Business Category Search...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  console.log('=' * 80);
  
  // Test 1: Check if the endpoint accepts search parameter
  console.log('🧪 Test 1: Basic endpoint functionality');
  console.log('=' * 50);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/mobile/greetings/templates`);
    
    if (response.status === 200) {
      console.log('✅ Endpoint is accessible');
      console.log(`📊 Templates without search: ${response.data.data?.templates?.length || 0}`);
    } else {
      console.log(`❌ Endpoint failed with status: ${response.status}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return;
  }
  
  // Test 2: Test with search parameter
  console.log('\n🧪 Test 2: Search parameter functionality');
  console.log('=' * 50);
  
  const searchTerms = ['motivational', 'Motivational', 'MOTIVATIONAL', 'motivation'];
  
  for (const term of searchTerms) {
    try {
      console.log(`\n🔍 Testing search term: "${term}"`);
      
      const response = await makeRequest(`${BASE_URL}/api/mobile/greetings/templates?search=${term}`);
      
      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        
        console.log(`   ✅ Status: 200`);
        console.log(`   📊 Greeting Templates: ${data.templates?.length || 0}`);
        console.log(`   📊 Business Category Images: ${data.businessCategoryImages?.length || 0}`);
        console.log(`   📊 Total Results: ${data.totalResults || 0}`);
        
        if (data.businessCategoryImages && data.businessCategoryImages.length > 0) {
          console.log(`   🎉 SUCCESS! Found business category images`);
          console.log(`   📸 First image: ${data.businessCategoryImages[0].title}`);
          console.log(`   📸 Category: ${data.businessCategoryImages[0].business_categories?.name}`);
          return; // Success found, no need to continue
        }
        
      } else {
        console.log(`   ❌ Failed with status: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test 3: Check if the issue is with the search logic
  console.log('\n🧪 Test 3: Analyzing the search logic issue');
  console.log('=' * 50);
  
  console.log('🔍 Based on our previous findings:');
  console.log('   ✅ Motivational business category exists with ID: cmgaov9ey000drzz7antmhjde');
  console.log('   ✅ Business category has 30 images');
  console.log('   ✅ Endpoint is accessible and returns greeting templates');
  console.log('   ❌ Business category images are not being returned');
  
  console.log('\n💡 Possible issues:');
  console.log('   1. The search logic is not executing (debug logs not appearing)');
  console.log('   2. The business category name matching is not working');
  console.log('   3. The images are not approved or active');
  console.log('   4. There is a deployment issue with the updated code');
  
  console.log('\n🔧 Next steps:');
  console.log('   1. Check if the debug logs are appearing in the server logs');
  console.log('   2. Verify the business category search logic is deployed');
  console.log('   3. Check if images in the Motivational category are approved');
  
  console.log('\n🎯 CONCLUSION:');
  console.log('The greetings endpoint is working for greeting templates but not returning');
  console.log('business category images. The fix may not be deployed or there may be');
  console.log('an issue with the search logic implementation.');
  
  console.log('\n🎉 Detailed debug test complete!');
}

testGreetingsDebugDetailed().catch(console.error);
