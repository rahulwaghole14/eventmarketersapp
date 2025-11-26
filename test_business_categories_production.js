// Test the /api/mobile/business-categories endpoint on production
const https = require('https');

const PRODUCTION_URL = 'https://eventmarketersbackend.onrender.com';
const ENDPOINT = '/api/mobile/business-categories';

function testProductionEndpoint() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${PRODUCTION_URL}${ENDPOINT}`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Business-Categories-Test/1.0',
        'Accept': 'application/json'
      },
      timeout: 15000
    };
    
    console.log('🚀 Testing Production API');
    console.log('='.repeat(60));
    console.log(`📍 URL: ${PRODUCTION_URL}${ENDPOINT}`);
    console.log(`🔧 Method: GET`);
    console.log('='.repeat(60));
    console.log('\n⏳ Sending request...\n');
    
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = { raw: body };
        }
        
        const result = {
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          response: parsedBody,
          success: res.statusCode >= 200 && res.statusCode < 300
        };
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      reject({
        error: error.message,
        success: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout after 15 seconds',
        success: false
      });
    });
    
    req.end();
  });
}

async function runTest() {
  try {
    const result = await testProductionEndpoint();
    
    console.log('✅ Response Received!\n');
    console.log('='.repeat(60));
    console.log('📊 RESPONSE DETAILS');
    console.log('='.repeat(60));
    console.log(`Status Code: ${result.status} ${result.statusText || ''}`);
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Content-Type: ${result.headers['content-type'] || 'N/A'}`);
    console.log(`Response Size: ${JSON.stringify(result.response).length} bytes`);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESPONSE BODY');
    console.log('='.repeat(60));
    
    if (result.response.success !== undefined) {
      console.log(`✅ API Success: ${result.response.success}`);
    }
    
    if (result.response.message) {
      console.log(`ℹ️  Message: ${result.response.message}`);
    }
    
    // Check for categories in different possible locations
    let categories = null;
    if (result.response.categories) {
      categories = result.response.categories;
      console.log(`\n📦 Categories found in: response.categories`);
    } else if (result.response.data && result.response.data.categories) {
      categories = result.response.data.categories;
      console.log(`\n📦 Categories found in: response.data.categories`);
    }
    
    if (categories) {
      console.log(`\n📊 Total Categories: ${categories.length}`);
      console.log('\n📋 All Categories:');
      console.log('-'.repeat(60));
      
      categories.forEach((cat, index) => {
        const name = cat.name || 'N/A';
        const icon = cat.icon || '';
        const id = cat.id || 'N/A';
        const desc = cat.description ? ` - ${cat.description.substring(0, 50)}...` : '';
        const active = cat.isActive !== undefined ? (cat.isActive ? '✅' : '❌') : '';
        
        console.log(`${(index + 1).toString().padStart(3)}. ${icon} ${name}${desc}`);
        console.log(`     ID: ${id} ${active}`);
        
        if (cat.contentCount !== undefined) {
          console.log(`     Content Count: ${cat.contentCount}`);
        }
        if (cat.posterCount !== undefined || cat.videoCount !== undefined) {
          console.log(`     Posters: ${cat.posterCount || 0}, Videos: ${cat.videoCount || 0}`);
        }
        console.log('');
      });
    } else {
      console.log('\n⚠️  No categories array found in response');
      console.log('\nFull Response Structure:');
      console.log(JSON.stringify(result.response, null, 2));
    }
    
    if (result.response.error) {
      console.log(`\n❌ Error: ${result.response.error}`);
      if (result.response.details) {
        console.log(`   Details: ${result.response.details}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error('='.repeat(60));
    console.error(`Error: ${error.error || error.message || error}`);
    console.error('='.repeat(60));
  }
}

// Run test
runTest();

