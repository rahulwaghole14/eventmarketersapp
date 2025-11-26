// Verify route is actually registered in deployment_server.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Route Registration\n');
console.log('================================\n');

const serverFile = path.join(__dirname, 'deployment_server.js');
const content = fs.readFileSync(serverFile, 'utf8');

// Check for route definitions
const patterns = [
  { name: 'Upload logo route', pattern: /app\.post\(['"]\/api\/mobile\/users\/:userId\/upload-logo['"]/ },
  { name: 'Test route', pattern: /app\.post\(['"]\/api\/mobile\/users\/:userId\/upload-logo\/test['"]/ },
  { name: 'Simple test route', pattern: /app\.post\(['"]\/api\/mobile\/users\/upload-logo-test['"]/ },
  { name: 'Logo upload middleware', pattern: /logoUpload\.single\(['"]logo['"]/ },
  { name: 'Cloudinary logoStorage', pattern: /logoStorage.*=.*new CloudinaryStorage/ }
];

console.log('Checking route registration...\n');

let allFound = true;
patterns.forEach(({ name, pattern }) => {
  const found = pattern.test(content);
  const status = found ? '✅' : '❌';
  console.log(`${status} ${name}: ${found ? 'FOUND' : 'NOT FOUND'}`);
  if (!found) allFound = false;
});

console.log('\n' + '='.repeat(50));
console.log(`\nOverall Status: ${allFound ? '✅ ALL ROUTES REGISTERED' : '❌ SOME ROUTES MISSING'}\n`);

// Count occurrences
const routeCount = (content.match(/app\.post\(['"]\/api\/mobile\/users.*upload-logo/g) || []).length;
console.log(`Found ${routeCount} upload-logo route(s)\n`);

// Check route order - upload route should come before /:id routes
const uploadRouteIndex = content.indexOf('app.post(\'/api/mobile/users/:userId/upload-logo\'');
const idRouteIndex = content.indexOf('app.get(\'/api/mobile/users/:id\'');
const putRouteIndex = content.indexOf('app.put(\'/api/mobile/users/:id\'');

if (uploadRouteIndex !== -1 && idRouteIndex !== -1) {
  if (uploadRouteIndex < idRouteIndex) {
    console.log('✅ Route order is correct (upload route before /:id routes)');
  } else {
    console.log('❌ Route order is WRONG (upload route should come before /:id routes)');
  }
}

if (uploadRouteIndex !== -1 && putRouteIndex !== -1) {
  if (uploadRouteIndex < putRouteIndex) {
    console.log('✅ Route order is correct (upload route before PUT /:id route)');
  } else {
    console.log('❌ Route order is WRONG (upload route should come before PUT /:id route)');
  }
}

// Show line numbers
if (uploadRouteIndex !== -1) {
  const lineNumber = content.substring(0, uploadRouteIndex).split('\n').length;
  console.log(`\n📝 Upload route is at line: ${lineNumber}`);
}

console.log('\n💡 If routes are found but still getting 404:');
console.log('   1. Make sure server is restarted');
console.log('   2. Check if you\'re testing the correct server (local vs production)');
console.log('   3. Verify the exact URL you\'re calling');
console.log('   4. Check server logs for route matching errors');







