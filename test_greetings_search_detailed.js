// Detailed test for greetings search with different encodings
const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

function testSearch(baseUrl, searchQuery, description) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/api/mobile/greetings/templates?search=${encodeURIComponent(searchQuery)}`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET'
    };
    
    const req = httpModule.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed, description });
        } catch (e) {
          resolve({ status: res.statusCode, body: body, description, parseError: true });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

async function testAllVariations() {
  console.log('🧪 Testing Greetings Search with Different Encodings');
  console.log('====================================================\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const tests = [
    { query: 'good%2520morning', desc: 'Double-encoded (good%2520morning)' },
    { query: 'good%20morning', desc: 'Single-encoded (good%20morning)' },
    { query: 'good morning', desc: 'Plain text (good morning)' },
    { query: 'good', desc: 'Single word (good)' },
    { query: 'morning', desc: 'Single word (morning)' }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n📤 Test: ${test.desc}`);
      console.log(`   Query: ${test.query}`);
      
      const result = await testSearch(BASE_URL, test.query, test.desc);
      
      console.log(`   Status: ${result.status}`);
      if (result.status === 200) {
        const count = result.body.data?.templates?.length || result.body.data?.totalResults || 0;
        console.log(`   Results: ${count}`);
        if (count > 0 && result.body.data.templates) {
          console.log(`   First result title: ${result.body.data.templates[0].title || 'N/A'}`);
        }
      } else {
        console.log(`   Error: ${result.body.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test the exact URL from the user
  console.log('\n\n📤 Testing Exact URL from User:');
  console.log('   GET /api/mobile/greetings/templates?search=good%2520morning\n');
  
  try {
    const url = new URL(`${BASE_URL}/api/mobile/greetings/templates?search=good%2520morning`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET'
    };
    
    const req = httpModule.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Results: ${parsed.data?.templates?.length || parsed.data?.totalResults || 0}`);
          console.log(`   Search query received by server: ${parsed.searchQuery || 'Not logged'}`);
          console.log('\n   Full Response:');
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${body}`);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}`);
    });
    
    req.end();
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n✅ All tests complete!');
}

testAllVariations().catch(console.error);







