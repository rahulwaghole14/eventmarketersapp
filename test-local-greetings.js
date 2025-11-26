#!/usr/bin/env node

/**
 * Test Business Category Search on Local Server
 * Verify the implementation works locally before deployment
 */

const http = require('http');

const LOCAL_BASE_URL = 'http://localhost:3001';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    console.log(`🔗 Making request to: ${url}`);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'EventMarketers-LocalTest/1.0',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
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

async function testLocalGreetings() {
  console.log('🧪 Testing Business Category Search on Local Server...\n');
  console.log(`📍 Local URL: ${LOCAL_BASE_URL}\n`);
  console.log('=' * 80);
  
  // Wait a moment for server to start
  console.log('⏳ Waiting for local server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Test 1: Basic endpoint accessibility
    console.log('\n🧪 Test 1: Basic endpoint accessibility');
    console.log('=' * 50);
    
    const basicResponse = await makeRequest(`${LOCAL_BASE_URL}/api/mobile/greetings/templates`);
    
    if (basicResponse.status === 200) {
      console.log('✅ Local server is running and endpoint is accessible');
      console.log(`📊 Templates without search: ${basicResponse.data.data?.templates?.length || 0}`);
    } else {
      console.log(`❌ Local server issue - Status: ${basicResponse.status}`);
      console.log('Response:', basicResponse.data);
      return;
    }
    
    // Test 2: Business category search functionality
    console.log('\n🧪 Test 2: Business category search functionality');
    console.log('=' * 50);
    
    const searchTerms = ['motivational', 'Motivational', 'MOTIVATIONAL', 'motivation'];
    
    for (const term of searchTerms) {
      try {
        console.log(`\n🔍 Testing search term: "${term}"`);
        
        const response = await makeRequest(`${LOCAL_BASE_URL}/api/mobile/greetings/templates?search=${term}`);
        
        if (response.status === 200 && response.data.success) {
          const data = response.data.data;
          
          console.log(`   ✅ Status: 200`);
          console.log(`   📊 Greeting Templates: ${data.templates?.length || 0}`);
          console.log(`   📊 Business Category Images: ${data.businessCategoryImages?.length || 0}`);
          console.log(`   📊 Total Results: ${data.totalResults || 0}`);
          
          // Check if business category search is working
          if (data.businessCategoryImages !== undefined) {
            console.log(`   🎉 SUCCESS! Business category search logic is deployed locally`);
            
            if (data.businessCategoryImages.length > 0) {
              console.log(`   📸 Found ${data.businessCategoryImages.length} business category images`);
              console.log(`   📸 First image: ${data.businessCategoryImages[0].title}`);
              console.log(`   📸 Category: ${data.businessCategoryImages[0].business_categories?.name}`);
            } else {
              console.log(`   ⚠️  No business category images found (may be expected if no matching category)`);
            }
            
            // Show response structure
            console.log(`\n   📋 Response Structure:`);
            console.log(`   ${data.businessCategoryImages !== undefined ? '✅' : '❌'} businessCategoryImages`);
            console.log(`   ${data.businessCategoryPagination !== undefined ? '✅' : '❌'} businessCategoryPagination`);
            console.log(`   ${data.totalResults !== undefined ? '✅' : '❌'} totalResults`);
            
            return; // Success found, no need to continue testing other terms
            
          } else {
            console.log(`   ❌ Business category search logic is NOT working locally`);
            console.log(`   Response missing businessCategoryImages field`);
          }
          
        } else {
          console.log(`   ❌ Failed with status: ${response.status}`);
          console.log(`   Response:`, response.data);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n🎯 LOCAL TEST SUMMARY:');
    console.log('=' * 50);
    console.log('If business category search is working locally, the implementation is correct');
    console.log('and the issue is with Render deployment only.');
    console.log('If it\'s not working locally, there may be an issue with the code implementation.');
    
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
    console.log('Make sure the local server is running with: npm run dev');
  }
  
  console.log('\n🎉 Local server test complete!');
}

testLocalGreetings().catch(console.error);
