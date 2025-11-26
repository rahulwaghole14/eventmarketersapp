const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Use built-in fetch for Node 18+ or node-fetch
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  fetch = require('node-fetch');
}

// Test configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const USER_ID = 'cmgexfzpg0000gjwd97azss8v'; // Your user ID
const TOKEN = process.env.TEST_TOKEN || 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

// Create a test image file (1x1 pixel PNG)
const createTestImage = () => {
  const testImagePath = path.join(__dirname, 'test-logo.png');
  
  // Simple 1x1 pixel PNG in base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(pngBase64, 'base64');
  fs.writeFileSync(testImagePath, buffer);
  
  return testImagePath;
};

async function testLogoUpload() {
  console.log('🧪 Testing Logo Upload Endpoint');
  console.log('================================\n');
  
  // Create test image
  console.log('📝 Creating test image...');
  const testImagePath = createTestImage();
  console.log(`✅ Test image created at: ${testImagePath}\n`);
  
  // Test 1: Test route (simple test)
  console.log('🧪 Test 1: Testing simple test route...');
  try {
    const testResponse = await fetch(`${BASE_URL}/api/mobile/users/upload-logo-test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const testData = await testResponse.json();
    console.log(`Status: ${testResponse.status}`);
    console.log('Response:', JSON.stringify(testData, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('');
  }
  
  // Test 2: Test route with userId parameter
  console.log('🧪 Test 2: Testing route with userId parameter...');
  try {
    const test2Response = await fetch(`${BASE_URL}/api/mobile/users/${USER_ID}/upload-logo/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const test2Data = await test2Response.json();
    console.log(`Status: ${test2Response.status}`);
    console.log('Response:', JSON.stringify(test2Data, null, 2));
    console.log('');
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('');
  }
  
  // Test 3: Actual logo upload
  console.log('🧪 Test 3: Testing actual logo upload...');
  try {
    const formData = new FormData();
    formData.append('logo', fs.createReadStream(testImagePath), {
      filename: 'test-logo.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch(`${BASE_URL}/api/mobile/users/${USER_ID}/upload-logo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    const uploadData = await uploadResponse.json();
    console.log(`Status: ${uploadResponse.status}`);
    console.log('Response:', JSON.stringify(uploadData, null, 2));
    
    if (uploadResponse.ok) {
      console.log('\n✅ Logo upload successful!');
    } else {
      console.log('\n❌ Logo upload failed!');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.stack) {
      console.log('Stack:', error.stack);
    }
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test image...');
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
    console.log('✅ Test image deleted');
  }
  
  console.log('\n✅ Testing complete!');
}

// Run the test
if (require.main === module) {
  if (TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('⚠️  WARNING: Please set TEST_TOKEN environment variable or update TOKEN in the script');
    console.log('   Example: TEST_TOKEN=your_token_here node test_logo_upload.js\n');
  }
  
  testLogoUpload().catch(console.error);
}

module.exports = { testLogoUpload };

