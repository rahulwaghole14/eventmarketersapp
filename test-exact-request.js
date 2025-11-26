#!/usr/bin/env node

/**
 * Test Exact Request to Debug Search Issue
 * Make the exact same request and see what's happening
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

async function testExactRequest() {
  console.log('🔍 Testing Exact Request to Debug Search Issue...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  console.log('=' * 70);
  
  try {
    const searchTerm = 'motivational';
    const url = `${BASE_URL}/api/mobile/greetings/templates?search=${searchTerm}`;
    
    console.log(`🔗 Request URL: ${url}`);
    console.log(`🔍 Search Term: "${searchTerm}"`);
    console.log(`📝 Query Parameters: search=${searchTerm}`);
    
    const response = await makeRequest(url);
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, JSON.stringify(response.headers, null, 2));
    
    if (response.status === 200 && response.data.success) {
      const data = response.data.data;
      
      console.log(`\n📋 Response Data:`);
      console.log(`   • Greeting Templates: ${data.templates?.length || 0}`);
      console.log(`   • Business Category Images: ${data.businessCategoryImages?.length || 0}`);
      console.log(`   • Total Results: ${data.totalResults || 0}`);
      
      if (data.templates && data.templates.length > 0) {
        console.log(`\n📝 Greeting Templates Found:`);
        data.templates.forEach((template, index) => {
          console.log(`   ${index + 1}. ${template.title} (${template.category})`);
        });
      }
      
      if (data.businessCategoryImages && data.businessCategoryImages.length > 0) {
        console.log(`\n📸 Business Category Images Found:`);
        data.businessCategoryImages.forEach((image, index) => {
          console.log(`   ${index + 1}. ${image.title} (${image.business_categories?.name})`);
        });
      }
      
      console.log(`\n🔍 Full Response Data:`, JSON.stringify(data, null, 2));
      
    } else {
      console.log(`\n❌ Request failed`);
      console.log(`Response:`, JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`\n❌ EXCEPTION: ${error.message}`);
  }
  
  console.log('\n🎉 Exact request test complete!');
}

testExactRequest().catch(console.error);
