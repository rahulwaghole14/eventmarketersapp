// Debug 404 issue - test with exact same request
const http = require('http');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const USER_ID = 'cmgexfzpg0000gjwd97azss8v';
const BASE_URL = 'http://localhost:3001';

console.log('🔍 Debugging 404 Issue');
console.log('======================\n');
console.log(`Testing URL: ${BASE_URL}/api/mobile/users/${USER_ID}/upload-logo\n`);

// Test 1: Check if route exists with OPTIONS (preflight)
console.log('Test 1: OPTIONS request (CORS preflight)...');
const optionsReq = http.request({
  hostname: 'localhost',
  port: 3001,
  path: `/api/mobile/users/${USER_ID}/upload-logo`,
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type'
  }
}, (res) => {
  console.log(`  Status: ${res.statusCode}`);
  console.log(`  Headers:`, JSON.stringify(res.headers, null, 2));
  console.log('');
  
  // Test 2: POST without file (should fail but show route exists)
  console.log('Test 2: POST without file (should show route exists)...');
  const postReq = http.request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/mobile/users/${USER_ID}/upload-logo`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    }
  }, (res2) => {
    let body = '';
    res2.on('data', chunk => body += chunk);
    res2.on('end', () => {
      console.log(`  Status: ${res2.statusCode}`);
      try {
        const parsed = JSON.parse(body);
        console.log(`  Response:`, JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log(`  Response: ${body}`);
      }
      
      if (res2.statusCode === 404) {
        console.log('\n❌ PROBLEM FOUND: Route returns 404!');
        console.log('\nPossible causes:');
        console.log('  1. Server not restarted with new code');
        console.log('  2. Wrong server/port being called');
        console.log('  3. Route pattern mismatch');
        console.log('  4. Middleware blocking the request');
      } else if (res2.statusCode === 400) {
        console.log('\n✅ Route EXISTS! (400 = Bad Request, expected without file)');
      } else if (res2.statusCode === 401) {
        console.log('\n✅ Route EXISTS! (401 = Unauthorized, route is working)');
      }
      
      console.log('\n' + '='.repeat(50));
      console.log('\n💡 Next Steps:');
      console.log('  1. Check server console for debug logs');
      console.log('  2. Verify you\'re calling the correct URL');
      console.log('  3. Make sure server process is actually restarted');
      console.log('  4. Check if there are multiple server instances running');
      console.log('\n   Try: netstat -ano | findstr :3001');
    });
  });
  
  postReq.on('error', (err) => {
    console.log(`  ❌ Error: ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running! Start it with: npm start');
    }
  });
  
  postReq.write(JSON.stringify({}));
  postReq.end();
});

optionsReq.on('error', (err) => {
  console.log(`  ❌ Error: ${err.message}\n`);
});

optionsReq.end();







