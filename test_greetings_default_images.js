const axios = require('axios');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';

async function testGreetingsDefaultImages() {
  console.log('🧪 Testing GET /api/mobile/greetings/templates - Default Business Category Images\n');
  console.log('='.repeat(70));

  const tests = [
    {
      name: 'Test 1: Basic request (no search) - Should return BC images',
      url: `${BASE_URL}/api/mobile/greetings/templates`,
      description: 'Should return top business category images by default'
    },
    {
      name: 'Test 2: With pagination (page 1, limit 10)',
      url: `${BASE_URL}/api/mobile/greetings/templates?page=1&limit=10`,
      description: 'Should return 10 business category images per page'
    },
    {
      name: 'Test 3: With pagination (page 2, limit 5)',
      url: `${BASE_URL}/api/mobile/greetings/templates?page=2&limit=5`,
      description: 'Should return second page with 5 images'
    },
    {
      name: 'Test 4: Search still works - "Good Morning"',
      url: `${BASE_URL}/api/mobile/greetings/templates?search=Good%20Morning`,
      description: 'Should return images from Good Morning category via search'
    },
    {
      name: 'Test 5: Category filter + no search',
      url: `${BASE_URL}/api/mobile/greetings/templates?category=general`,
      description: 'Should return BC images even with category filter'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n${test.name}`);
      console.log(`URL: ${test.url}`);
      console.log(`Description: ${test.description}`);
      
      const startTime = Date.now();
      const response = await axios.get(test.url, {
        timeout: 30000,
        validateStatus: () => true
      });
      const duration = Date.now() - startTime;

      console.log(`Status: ${response.status} ${response.statusText} (${duration}ms)`);

      if (response.status === 200) {
        const data = response.data;
        
        if (data.success) {
          const responseData = data.data || {};
          
          // Check for business category images
          const bcImages = responseData.businessCategoryImages || [];
          const templates = responseData.templates || [];
          const bcPagination = responseData.businessCategoryPagination || {};
          const pagination = responseData.pagination || {};
          
          console.log(`✅ PASSED`);
          console.log(`   📋 Templates: ${templates.length} (total: ${pagination.total || 0})`);
          console.log(`   🏢 Business Category Images: ${bcImages.length} (total: ${bcPagination.total || 0})`);
          
          if (bcImages.length > 0) {
            const first = bcImages[0];
            console.log(`   📝 Sample BC Image:`);
            console.log(`      - ID: ${first.id}`);
            console.log(`      - Title: ${first.title || 'N/A'}`);
            console.log(`      - Category: ${first.category || 'N/A'}`);
            if (first.business_categories) {
              console.log(`      - Business Category: ${first.business_categories.name || 'N/A'}`);
            }
            console.log(`      - Downloads: ${first.downloads || 0}`);
            console.log(`      - Views: ${first.views || 0}`);
            
            // Verify it has business category
            if (!first.businessCategoryId) {
              console.log(`   ⚠️  WARNING: Image missing businessCategoryId`);
            } else {
              console.log(`      - Business Category ID: ${first.businessCategoryId}`);
            }
          } else {
            // Check if this is expected (e.g., search test might not have BC images)
            if (test.url.includes('search')) {
              console.log(`   ℹ️  No BC images (may be expected for search without category match)`);
            } else {
              console.log(`   ❌ FAILED - No business category images returned when expected!`);
              failed++;
              continue;
            }
          }
          
          // Check pagination
          if (bcPagination.total !== undefined) {
            console.log(`   📄 BC Pagination: Page ${bcPagination.page}/${bcPagination.totalPages}, Total: ${bcPagination.total}`);
          }
          
          // Check total results
          if (responseData.totalResults !== undefined) {
            console.log(`   📊 Total Results: ${responseData.totalResults}`);
          }
          
          passed++;
        } else {
          console.log(`❌ FAILED - Success: false`);
          console.log(`   Error: ${data.error || 'Unknown error'}`);
          failed++;
        }
      } else {
        console.log(`❌ FAILED - HTTP ${response.status}`);
        if (response.data) {
          console.log(`   Response:`, JSON.stringify(response.data, null, 2).substring(0, 200));
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data:`, JSON.stringify(error.response.data, null, 2).substring(0, 200));
      }
      failed++;
    }
    
    console.log('-'.repeat(70));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
  
  // Final verification
  console.log('\n' + '='.repeat(70));
  console.log('🔍 FINAL VERIFICATION: Testing basic endpoint');
  console.log('='.repeat(70));
  try {
    const finalTest = await axios.get(`${BASE_URL}/api/mobile/greetings/templates?limit=5`, {
      timeout: 30000
    });
    
    if (finalTest.data?.success && finalTest.data?.data?.businessCategoryImages?.length > 0) {
      console.log(`✅ ✅ ✅ SUCCESS: Default endpoint returns ${finalTest.data.data.businessCategoryImages.length} business category images!`);
      console.log(`   Total available: ${finalTest.data.data.businessCategoryPagination?.total || 0}`);
    } else {
      console.log(`❌ ❌ ❌ FAILED: Default endpoint does NOT return business category images`);
      console.log(`   Response:`, JSON.stringify(finalTest.data, null, 2).substring(0, 300));
    }
  } catch (error) {
    console.log(`❌ ❌ ❌ ERROR during final verification: ${error.message}`);
  }
}

// Run tests
testGreetingsDefaultImages().catch(console.error);

