// Test the new /api/mobile/business-categories/business endpoint locally
const http = require('http');

const LOCAL_URL = 'http://localhost:3001';
const ENDPOINT = '/api/mobile/business-categories/business';

function testEndpoint() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${LOCAL_URL}${ENDPOINT}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Business-Categories-Business-Test/1.0',
        'Accept': 'application/json'
      },
      timeout: 10000
    };
    
    console.log('🚀 Testing Local API Endpoint');
    console.log('='.repeat(60));
    console.log(`📍 URL: ${LOCAL_URL}${ENDPOINT}`);
    console.log(`🔧 Method: GET`);
    console.log('='.repeat(60));
    console.log('\n⏳ Sending request...\n');
    
    const req = http.request(options, (res) => {
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
        error: 'Request timeout after 10 seconds',
        success: false
      });
    });
    
    req.end();
  });
}

async function runTest() {
  try {
    // Wait a bit for server to be ready
    console.log('⏳ Waiting for server to be ready...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const result = await testEndpoint();
    
    console.log('✅ Response Received!\n');
    console.log('='.repeat(60));
    console.log('📊 RESPONSE DETAILS');
    console.log('='.repeat(60));
    console.log(`Status Code: ${result.status} ${result.statusText || ''}`);
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Content-Type: ${result.headers['content-type'] || 'N/A'}`);
    
    if (result.response.success !== undefined) {
      console.log(`✅ API Success: ${result.response.success}`);
    }
    
    if (result.response.message) {
      console.log(`ℹ️  Message: ${result.response.message}`);
    }
    
    // Check for categories
    let categories = null;
    if (result.response.data && result.response.data.categories) {
      categories = result.response.data.categories;
      console.log(`\n📦 Categories found in: response.data.categories`);
      console.log(`📊 Total Categories: ${categories.length}`);
      console.log(`📋 Main Category: ${result.response.data.mainCategory || 'N/A'}`);
    } else if (result.response.categories) {
      categories = result.response.categories;
      console.log(`\n📦 Categories found in: response.categories`);
      console.log(`📊 Total Categories: ${categories.length}`);
    }
    
    if (categories && categories.length > 0) {
      console.log('\n📋 BUSINESS Categories List:');
      console.log('-'.repeat(60));
      
      categories.slice(0, 10).forEach((cat, index) => {
        const name = cat.name || 'N/A';
        const icon = cat.icon || '';
        const id = cat.id || 'N/A';
        const desc = cat.description ? ` - ${cat.description.substring(0, 40)}...` : '';
        const mainCat = cat.mainCategory || 'N/A';
        
        console.log(`${(index + 1).toString().padStart(3)}. ${icon} ${name}${desc}`);
        console.log(`     ID: ${id.substring(0, 20)}...`);
        console.log(`     Main Category: ${mainCat}`);
        
        if (cat.posterCount !== undefined || cat.videoCount !== undefined) {
          console.log(`     Posters: ${cat.posterCount || 0}, Videos: ${cat.videoCount || 0}, Total: ${cat.totalContent || 0}`);
        }
        console.log('');
      });
      
      if (categories.length > 10) {
        console.log(`     ... and ${categories.length - 10} more categories\n`);
      }
      
      // Verify all are BUSINESS category
      const nonBusiness = categories.filter(cat => cat.mainCategory !== 'BUSINESS');
      if (nonBusiness.length > 0) {
        console.log(`\n⚠️  WARNING: Found ${nonBusiness.length} categories that are NOT BUSINESS:`);
        nonBusiness.forEach(cat => {
          console.log(`   - ${cat.name} (${cat.mainCategory})`);
        });
      } else {
        console.log(`\n✅ All ${categories.length} categories are under BUSINESS main category`);
      }
    } else {
      console.log('\n⚠️  No categories found in response');
      console.log('\nFull Response Structure:');
      console.log(JSON.stringify(result.response, null, 2).substring(0, 1000));
    }
    
    if (result.response.error) {
      console.log(`\n❌ Error: ${result.response.error}`);
      if (result.response.details) {
        console.log(`   Details: ${result.response.details}`);
      }
      if (result.response.path) {
        console.log(`   Path: ${result.response.path}`);
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
    console.log('\n💡 Make sure the server is running: npm start');
    console.log('   Or check if the server is listening on port 3001');
  }
}

// Run test
runTest();

