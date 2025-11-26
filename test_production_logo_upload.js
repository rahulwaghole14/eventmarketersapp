// Test logo upload endpoint on production
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const PRODUCTION_URL = 'https://eventmarketersbackend.onrender.com';
const USER_ID = 'cmgexfzpg0000gjwd97azss8v';
const TOKEN = process.env.TEST_TOKEN || process.argv[2] || 'YOUR_TOKEN_HERE';

// Create test image
const createTestImage = () => {
  const testImagePath = path.join(__dirname, 'test-logo.png');
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  fs.writeFileSync(testImagePath, Buffer.from(pngBase64, 'base64'));
  return testImagePath;
};

function uploadFile(filePath, userId, token, baseUrl) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('logo', fs.createReadStream(filePath), {
      filename: 'test-logo.png',
      contentType: 'image/png'
    });
    
    const url = new URL(`${baseUrl}/api/mobile/users/${userId}/upload-logo`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    };
    
    const req = httpModule.request(options, (res) => {
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

async function testProductionEndpoint() {
  console.log('🧪 Testing Logo Upload Endpoint on Production');
  console.log('==============================================\n');
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`User ID: ${USER_ID}`);
  console.log(`Token: ${TOKEN.substring(0, 20)}...\n`);
  
  if (TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('⚠️  WARNING: Please provide a valid JWT token');
    console.log('   Usage: node test_production_logo_upload.js YOUR_TOKEN');
    console.log('   Or: $env:TEST_TOKEN="YOUR_TOKEN"; node test_production_logo_upload.js\n');
  }
  
  const testImagePath = createTestImage();
  console.log(`✅ Test image created: ${testImagePath}\n`);
  
  try {
    console.log('📤 Uploading logo to production...');
    console.log(`   URL: ${PRODUCTION_URL}/api/mobile/users/${USER_ID}/upload-logo\n`);
    
    const result = await uploadFile(testImagePath, USER_ID, TOKEN, PRODUCTION_URL);
    
    console.log(`\n📊 Response Status: ${result.status}`);
    console.log(`📊 Response Body:`, JSON.stringify(result.body, null, 2));
    console.log('');
    
    if (result.status === 404) {
      console.log('❌ ERROR: Route not found (404)');
      console.log('   The route is not deployed yet or deployment failed.');
      console.log('   Check Render logs for deployment status.');
    } else if (result.status === 401) {
      console.log('✅ Route EXISTS! (401 = Authentication required)');
      console.log('   The route is deployed but token is invalid/expired.');
      console.log('   Provide a valid JWT token to test the full upload.');
    } else if (result.status === 403) {
      console.log('✅ Route EXISTS! (403 = Forbidden)');
      console.log('   The route is deployed but user ID mismatch.');
      console.log('   Make sure the token user ID matches the URL user ID.');
    } else if (result.status === 200 || result.status === 201) {
      console.log('✅ SUCCESS! Logo uploaded successfully to production!');
      console.log(`   Logo URL: ${result.body.data?.logo || 'N/A'}`);
      console.log(`   Thumbnail URL: ${result.body.data?.thumbnail || 'N/A'}`);
    } else if (result.status === 400) {
      console.log('✅ Route EXISTS! (400 = Bad Request)');
      console.log('   This might be a validation error or missing file.');
      console.log('   Check the response message for details.');
    } else {
      console.log(`⚠️  Unexpected status: ${result.status}`);
      console.log('   Check the response body for details.');
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   Server is not accessible.');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   Domain not found. Check the production URL.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      console.log('   Connection timeout. Production server might be spinning up.');
      console.log('   Free tier Render services spin down after inactivity.');
    } else {
      console.log('   Error details:', error);
    }
  } finally {
    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('\n🧹 Test image cleaned up');
    }
  }
  
  console.log('\n✅ Test complete!');
}

testProductionEndpoint().catch(console.error);







