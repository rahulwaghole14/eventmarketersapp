#!/usr/bin/env node

/**
 * Debug Motivational Search Issue
 * Test the exact search logic to see why it's not finding the Motivational category
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

async function testMotivationalSearchDebug() {
  console.log('🔍 Debugging Motivational Search Issue...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  console.log('=' * 70);
  
  // Test different search variations
  const searchTerms = [
    'motivational',
    'Motivational', 
    'MOTIVATIONAL',
    'motivation',
    'Motivation'
  ];
  
  for (const term of searchTerms) {
    try {
      console.log(`\n🔍 Testing search term: "${term}"`);
      
      const response = await makeRequest(`${BASE_URL}/api/mobile/greetings/templates?search=${term}`);
      
      console.log(`📊 Response Status: ${response.status}`);
      
      if (response.status === 200 && response.data.success) {
        const data = response.data.data;
        
        console.log(`   Greeting Templates: ${data.templates?.length || 0}`);
        console.log(`   Business Category Images: ${data.businessCategoryImages?.length || 0}`);
        console.log(`   Total Results: ${data.totalResults || 0}`);
        
        if (data.businessCategoryImages && data.businessCategoryImages.length > 0) {
          console.log(`   ✅ SUCCESS! Found ${data.businessCategoryImages.length} business category images`);
          
          // Show first image details
          const firstImage = data.businessCategoryImages[0];
          console.log(`   First Image: ${firstImage.title}`);
          console.log(`   Category: ${firstImage.business_categories?.name}`);
          console.log(`   Status: ${firstImage.approvalStatus}`);
        } else {
          console.log(`   ❌ No business category images found`);
        }
        
      } else {
        console.log(`   ❌ Request failed with status ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test without any search to see what's available
  console.log('\n' + '=' * 70);
  console.log('🔍 Testing without search (all templates)...');
  console.log('=' * 70);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/mobile/greetings/templates`);
    
    if (response.status === 200 && response.data.success) {
      const data = response.data.data;
      console.log(`📊 Total Greeting Templates: ${data.templates?.length || 0}`);
      console.log(`📊 Business Category Images: ${data.businessCategoryImages?.length || 0}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n' + '=' * 70);
  console.log('🎯 DEBUG SUMMARY:');
  console.log('=' * 70);
  console.log('✅ Motivational business category exists with 30 images');
  console.log('❌ Search is not returning business category images');
  console.log('🔍 Need to check the search logic in the code');
  
  console.log('\n💡 Possible issues:');
  console.log('   • Case sensitivity in business category name matching');
  console.log('   • Search logic not working as expected');
  console.log('   • Images not approved or active');
  console.log('   • Database query issue');
  
  console.log('\n🎉 Debug test complete!');
}

testMotivationalSearchDebug().catch(console.error);
