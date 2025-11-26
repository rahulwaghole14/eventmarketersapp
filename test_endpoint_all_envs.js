// Test the logo upload endpoint in different environments
const http = require('http');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const ENVIRONMENTS = {
  local: 'http://localhost:3001',
  production: process.env.PRODUCTION_URL || 'https://your-production-url.onrender.com'
};

const USER_ID = 'cmgexfzpg0000gjwd97azss8v';
const TOKEN = process.env.TEST_TOKEN || 'test-token';

// Create test image
const createTestImage = () => {
  const testImagePath = path.join(__dirname, 'test-logo.png');
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  fs.writeFileSync(testImagePath, Buffer.from(pngBase64, 'base64'));
  return testImagePath;
};

function testEndpoint(baseUrl, envName) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/api/mobile/users/${USER_ID}/upload-logo`);
    
    // First test: Simple GET to check if route exists (will fail but show route status)
    const testOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Endpoint-Test/1.0'
      }
    };
    
    if (url.protocol === 'https:') {
      testOptions.port = 443;
    }
    
    const req = http.request(testOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          env: envName,
          url: baseUrl,
          method: 'GET',
          status: res.statusCode,
          message: res.statusCode === 404 ? 'Route not found (404)' : 
                   res.statusCode === 405 ? 'Route exists but method not allowed (405 - expected for GET)' :
                   `Status: ${res.statusCode}`
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        env: envName,
        url: baseUrl,
        error: error.message,
        code: error.code
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        env: envName,
        url: baseUrl,
        error: 'Connection timeout'
      });
    });
    
    req.end();
  });
}

async function testAllEnvironments() {
  console.log('🧪 Testing Logo Upload Endpoint in All Environments');
  console.log('====================================================\n');
  
  const results = [];
  
  for (const [name, url] of Object.entries(ENVIRONMENTS)) {
    console.log(`Testing ${name} environment: ${url}...`);
    const result = await testEndpoint(url, name);
    results.push(result);
    console.log(`  Status: ${result.status || result.error || 'Unknown'}`);
    console.log(`  Message: ${result.message || result.error || 'OK'}\n`);
  }
  
  console.log('\n📊 Summary:');
  console.log('===========\n');
  
  results.forEach(result => {
    console.log(`${result.env}:`);
    console.log(`  URL: ${result.url}`);
    if (result.status) {
      if (result.status === 404) {
        console.log(`  ❌ Route NOT FOUND (404) - Route is not registered`);
      } else if (result.status === 405) {
        console.log(`  ✅ Route EXISTS (405 Method Not Allowed) - Route is registered but GET not allowed`);
        console.log(`     This is GOOD - means POST will work!`);
      } else {
        console.log(`  ⚠️  Unexpected status: ${result.status}`);
      }
    } else if (result.error) {
      if (result.code === 'ECONNREFUSED') {
        console.log(`  ⚠️  Server not running or not accessible`);
      } else if (result.code === 'ENOTFOUND') {
        console.log(`  ⚠️  Domain not found - check your PRODUCTION_URL`);
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
    }
    console.log('');
  });
  
  console.log('\n💡 Next Steps:');
  console.log('==============');
  console.log('1. If local shows 405: ✅ Route exists locally - this is GOOD!');
  console.log('2. If production shows 404: ❌ Route not deployed - push changes to Git');
  console.log('3. If production shows 405: ✅ Route exists - test with POST request');
  console.log('4. To test production URL, set: PRODUCTION_URL=https://your-app.onrender.com');
}

testAllEnvironments().catch(console.error);







