const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:3001';
const USER_ID = 'cmgexfzpg0000gjwd97azss8v';

// Create a test image file (1x1 pixel PNG)
const createTestImage = () => {
  const testImagePath = path.join(__dirname, 'test-logo.png');
  // Simple 1x1 pixel PNG in base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  fs.writeFileSync(testImagePath, buffer);
  return testImagePath;
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testRoutes() {
  console.log('🧪 Testing Logo Upload Routes');
  console.log('==============================\n');
  
  // Test 1: Simple test route (no auth needed)
  console.log('Test 1: Simple test route...');
  try {
    const result = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/mobile/users/upload-logo-test',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.body, null, 2));
    console.log('');
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
  
  // Test 2: Test route with userId
  console.log('Test 2: Test route with userId parameter...');
  try {
    const result = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/mobile/users/${USER_ID}/upload-logo/test`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`✅ Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.body, null, 2));
    console.log('');
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
  
  // Test 3: Actual upload endpoint (will fail auth but should show route exists)
  console.log('Test 3: Actual upload endpoint (testing route exists)...');
  const testImagePath = createTestImage();
  try {
    const formData = new FormData();
    formData.append('logo', fs.createReadStream(testImagePath), {
      filename: 'test-logo.png',
      contentType: 'image/png'
    });
    
    const result = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/mobile/users/${USER_ID}/upload-logo`,
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer test-token'
      }
    }, formData.getBuffer());
    
    console.log(`✅ Status: ${result.status}`);
    console.log(`Response:`, JSON.stringify(result.body, null, 2));
    
    if (result.status === 404) {
      console.log('\n❌ Route not found - 404 error!');
      console.log('   This means the route is not registered.');
    } else if (result.status === 401) {
      console.log('\n✅ Route exists! (401 = authentication required, which is expected)');
    } else if (result.status === 400) {
      console.log('\n✅ Route exists! (400 = bad request, but route was matched)');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running! Start it with: npm start');
    }
  } finally {
    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  }
  
  console.log('\n✅ Testing complete!');
  console.log('\n💡 Check the server console logs for debug information.');
}

// Wait a bit for server to start, then test
setTimeout(() => {
  testRoutes().catch(console.error);
}, 3000);


