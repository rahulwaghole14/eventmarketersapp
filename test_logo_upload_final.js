const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = 'http://localhost:3001';
const USER_ID = 'cmgexfzpg0000gjwd97azss8v';
const TOKEN = process.env.TEST_TOKEN || 'test-token-placeholder';

// Create a test image file
const createTestImage = () => {
  const testImagePath = path.join(__dirname, 'test-logo.png');
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  fs.writeFileSync(testImagePath, buffer);
  return testImagePath;
};

function uploadFile(filePath, userId, token) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('logo', fs.createReadStream(filePath), {
      filename: 'test-logo.png',
      contentType: 'image/png'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/mobile/users/${userId}/upload-logo`,
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : { raw: body };
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: body });
        }
      });
    });
    
    req.on('error', reject);
    formData.pipe(req);
  });
}

async function testLogoUpload() {
  console.log('🧪 Testing Logo Upload Endpoint');
  console.log('================================\n');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Token: ${TOKEN.substring(0, 20)}...\n`);
  
  const testImagePath = createTestImage();
  console.log(`✅ Test image created: ${testImagePath}\n`);
  
  try {
    console.log('📤 Uploading logo...');
    const result = await uploadFile(testImagePath, USER_ID, TOKEN);
    
    console.log(`\n📊 Response Status: ${result.status}`);
    console.log(`📊 Response Body:`, JSON.stringify(result.body, null, 2));
    
    if (result.status === 404) {
      console.log('\n❌ ERROR: Route not found (404)');
      console.log('   The route /api/mobile/users/:userId/upload-logo is not registered.');
    } else if (result.status === 401) {
      console.log('\n✅ Route exists! (401 = Authentication required)');
      console.log('   Please provide a valid JWT token using TEST_TOKEN environment variable.');
    } else if (result.status === 403) {
      console.log('\n✅ Route exists! (403 = Forbidden)');
      console.log('   The token is valid but the user ID does not match.');
    } else if (result.status === 200 || result.status === 201) {
      console.log('\n✅ SUCCESS! Logo uploaded successfully!');
    } else if (result.status === 400) {
      console.log('\n✅ Route exists! (400 = Bad Request)');
      console.log('   This might be a validation error or missing file.');
    } else {
      console.log(`\n⚠️  Unexpected status: ${result.status}`);
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running! Start it with: npm start');
    }
  } finally {
    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('\n🧹 Test image cleaned up');
    }
  }
  
  console.log('\n✅ Test complete!');
  console.log('\n💡 Tips:');
  console.log('   - If you get 401, set TEST_TOKEN environment variable with a valid JWT token');
  console.log('   - Check server console logs for detailed debug information');
}

testLogoUpload().catch(console.error);


