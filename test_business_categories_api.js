// Test the /api/mobile/business-categories endpoint
const http = require('http');
const https = require('https');

const ENVIRONMENTS = {
  local: 'http://localhost:3001',
  production: process.env.PRODUCTION_URL || 'https://eventmarketersbackend.onrender.com'
};

function testEndpoint(baseUrl, envName) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/api/mobile/business-categories`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Business-Categories-Test/1.0'
      },
      timeout: 10000
    };
    
    console.log(`\n🔍 Testing ${envName.toUpperCase()} environment...`);
    console.log(`📍 URL: ${baseUrl}/api/mobile/business-categories`);
    
    const req = httpModule.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = body;
        }
        
        const result = {
          env: envName,
          url: `${baseUrl}/api/mobile/business-categories`,
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
        env: envName,
        url: `${baseUrl}/api/mobile/business-categories`,
        error: error.message,
        success: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        env: envName,
        url: `${baseUrl}/api/mobile/business-categories`,
        error: 'Request timeout',
        success: false
      });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Testing /api/mobile/business-categories endpoint');
  console.log('='.repeat(60));
  
  const results = [];
  
  // Test local environment
  try {
    const localResult = await testEndpoint(ENVIRONMENTS.local, 'local');
    results.push(localResult);
  } catch (error) {
    results.push(error);
  }
  
  // Test production environment
  try {
    const prodResult = await testEndpoint(ENVIRONMENTS.production, 'production');
    results.push(prodResult);
  } catch (error) {
    results.push(error);
  }
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.env.toUpperCase()} Environment`);
    console.log(`   URL: ${result.url}`);
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    } else {
      console.log(`   Status: ${result.status} ${result.statusText || ''}`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      
      if (result.response) {
        if (result.response.success !== undefined) {
          console.log(`   API Success: ${result.response.success ? '✅' : '❌'}`);
        }
        
        if (result.response.categories) {
          console.log(`   Categories Count: ${result.response.categories.length}`);
          if (result.response.categories.length > 0) {
            console.log(`   Sample Categories:`);
            result.response.categories.slice(0, 5).forEach((cat, i) => {
              console.log(`     ${i + 1}. ${cat.name || cat.id} ${cat.icon || ''} (ID: ${cat.id})`);
            });
            if (result.response.categories.length > 5) {
              console.log(`     ... and ${result.response.categories.length - 5} more`);
            }
          }
        } else if (result.response.data && result.response.data.categories) {
          console.log(`   Categories Count: ${result.response.data.categories.length}`);
          if (result.response.data.categories.length > 0) {
            console.log(`   Sample Categories:`);
            result.response.data.categories.slice(0, 5).forEach((cat, i) => {
              console.log(`     ${i + 1}. ${cat.name || cat.id} ${cat.icon || ''} (ID: ${cat.id})`);
            });
            if (result.response.data.categories.length > 5) {
              console.log(`     ... and ${result.response.data.categories.length - 5} more`);
            }
          }
        } else {
          console.log(`   Response:`, JSON.stringify(result.response, null, 2).substring(0, 500));
        }
        
        if (result.response.error) {
          console.log(`   ⚠️  Error Message: ${result.response.error}`);
        }
        if (result.response.message) {
          console.log(`   ℹ️  Message: ${result.response.message}`);
        }
      }
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success && !r.error);
  const failed = results.filter(r => !r.success || r.error);
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Working endpoints:');
    successful.forEach(r => {
      console.log(`   - ${r.env}: ${r.url}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed endpoints:');
    failed.forEach(r => {
      console.log(`   - ${r.env}: ${r.error || 'HTTP ' + r.status}`);
    });
  }
  
  console.log('\n');
}

// Run tests
runTests().catch(console.error);

