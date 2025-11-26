// Test greetings templates search endpoint
const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const SEARCH_QUERY = 'good%2520morning'; // Double-encoded: good%20morning -> good morning

function testEndpoint(baseUrl, searchQuery) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/api/mobile/greetings/templates?search=${searchQuery}`);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Greetings-Search-Test/1.0'
      }
    };
    
    const req = httpModule.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            rawBody: body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            parseError: e.message
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testGreetingsSearch() {
  console.log('🧪 Testing Greetings Templates Search Endpoint');
  console.log('==============================================\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Search Query: ${SEARCH_QUERY}`);
  console.log(`Decoded once: ${decodeURIComponent(SEARCH_QUERY)}`);
  console.log(`Decoded twice: ${decodeURIComponent(decodeURIComponent(SEARCH_QUERY))}`);
  console.log(`Full URL: ${BASE_URL}/api/mobile/greetings/templates?search=${SEARCH_QUERY}\n`);
  
  try {
    console.log('📤 Sending request...\n');
    const result = await testEndpoint(BASE_URL, SEARCH_QUERY);
    
    console.log(`📊 Response Status: ${result.status}`);
    console.log(`📊 Content-Type: ${result.headers['content-type'] || 'N/A'}\n`);
    
    if (result.status === 200) {
      console.log('✅ SUCCESS! Endpoint is working.\n');
      
      if (result.body && typeof result.body === 'object') {
        console.log('📋 Response Structure:');
        console.log(`   Success: ${result.body.success || 'N/A'}`);
        console.log(`   Message: ${result.body.message || 'N/A'}`);
        
        if (result.body.data) {
          if (Array.isArray(result.body.data)) {
            console.log(`   Results Count: ${result.body.data.length}`);
            if (result.body.data.length > 0) {
              console.log(`   First Result:`, JSON.stringify(result.body.data[0], null, 2));
            }
          } else if (result.body.data.templates) {
            console.log(`   Templates Count: ${result.body.data.templates.length || 0}`);
            if (result.body.data.templates && result.body.data.templates.length > 0) {
              console.log(`   First Template:`, JSON.stringify(result.body.data.templates[0], null, 2));
            }
          } else {
            console.log(`   Data:`, JSON.stringify(result.body.data, null, 2));
          }
        }
        
        console.log('\n📄 Full Response:');
        console.log(JSON.stringify(result.body, null, 2));
      } else {
        console.log('📄 Response Body:');
        console.log(result.body);
      }
    } else if (result.status === 404) {
      console.log('❌ ERROR: Endpoint not found (404)');
      console.log('   The route /api/mobile/greetings/templates might not be registered.');
    } else if (result.status === 500) {
      console.log('❌ ERROR: Server error (500)');
      console.log('   There might be an issue with the search functionality.');
      if (result.body && result.body.error) {
        console.log(`   Error: ${result.body.error}`);
      }
    } else {
      console.log(`⚠️  Unexpected status: ${result.status}`);
      console.log('\n📄 Response:');
      console.log(JSON.stringify(result.body, null, 2));
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('   Server is not running or not accessible.');
      console.log('   Start server with: npm start');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   Domain not found. Check the BASE_URL.');
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.log('   Request timeout. Server might be slow or unresponsive.');
    }
  }
  
  console.log('\n✅ Test complete!');
}

// Test both local and production if BASE_URL is local
if (BASE_URL.includes('localhost')) {
  console.log('Testing local server...\n');
  testGreetingsSearch().catch(console.error);
} else {
  testGreetingsSearch().catch(console.error);
}







