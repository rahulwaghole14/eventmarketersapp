#!/usr/bin/env node

/**
 * Check Business Categories in Database
 * See what business categories actually exist
 */

const https = require('https');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';

function makeRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': options.headers?.['Content-Type'] || 'application/json',
        'User-Agent': 'EventMarketers-CheckCategories/1.0',
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

    // Write body if provided
    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function checkBusinessCategories() {
  console.log('🔍 Checking Business Categories in Database...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  console.log('=' * 70);
  
  // First, get admin token
  console.log('🔐 Step 1: Getting admin authentication token...');
  let adminToken = null;
  
  try {
    const loginData = JSON.stringify({
      email: 'admin@eventmarketers.com',
      password: 'admin123'
    });
    
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, loginData);
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      adminToken = loginResponse.data.token;
      console.log('✅ Admin authentication successful');
    } else {
      console.log('❌ Admin authentication failed');
      console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }
  } catch (error) {
    console.log('❌ Admin authentication error:', error.message);
    return;
  }
  
  console.log('\n🔍 Step 2: Fetching all business categories...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/admin/business-categories`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      const categories = response.data.categories || [];
      
      console.log(`\n📋 Total Business Categories: ${categories.length}`);
      console.log('\n📝 All Business Categories:');
      
      categories.forEach((category, index) => {
        console.log(`\n${index + 1}. ${category.name}`);
        console.log(`   ID: ${category.id}`);
        console.log(`   Main Category: ${category.mainCategory}`);
        console.log(`   Is Active: ${category.isActive}`);
        console.log(`   Image Count: ${category._count?.images || 0}`);
        console.log(`   Video Count: ${category._count?.videos || 0}`);
      });
      
      // Look for motivational-related categories
      console.log('\n' + '=' * 50);
      console.log('🎯 Looking for motivational-related categories...');
      console.log('=' * 50);
      
      const motivationalCategories = categories.filter(cat => 
        cat.name.toLowerCase().includes('motivational') || 
        cat.name.toLowerCase().includes('motivation') ||
        cat.name.toLowerCase().includes('inspire') ||
        cat.name.toLowerCase().includes('motivate')
      );
      
      if (motivationalCategories.length > 0) {
        console.log(`\n✅ Found ${motivationalCategories.length} motivational-related categories:`);
        motivationalCategories.forEach((category, index) => {
          console.log(`\n${index + 1}. ${category.name}`);
          console.log(`   ID: ${category.id}`);
          console.log(`   Images: ${category._count?.images || 0}`);
          console.log(`   Videos: ${category._count?.videos || 0}`);
        });
      } else {
        console.log('\n❌ No motivational-related categories found');
        console.log('\n💡 Suggestion: Create a "Motivational" business category or check existing category names');
      }
      
    } else {
      console.log(`❌ FAILED to fetch business categories`);
      console.log(`Response:`, JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ EXCEPTION: ${error.message}`);
  }
  
  console.log('\n🎉 Business categories check complete!');
}

checkBusinessCategories().catch(console.error);
