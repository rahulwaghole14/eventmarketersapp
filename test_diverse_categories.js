const axios = require('axios');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';

async function testDiverseCategories() {
  console.log('🧪 Testing Diverse Business Category Images\n');
  console.log('='.repeat(70));

  const tests = [
    {
      name: 'Test 1: Basic request - Should have multiple categories',
      url: `${BASE_URL}/api/mobile/greetings/templates?limit=20`,
    },
    {
      name: 'Test 2: Pagination page 1',
      url: `${BASE_URL}/api/mobile/greetings/templates?page=1&limit=10`,
    },
    {
      name: 'Test 3: Pagination page 2',
      url: `${BASE_URL}/api/mobile/greetings/templates?page=2&limit=10`,
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n${test.name}`);
      console.log(`URL: ${test.url}`);
      
      const response = await axios.get(test.url, { timeout: 30000 });
      
      if (response.status === 200 && response.data.success) {
        const images = response.data.data.businessCategoryImages || [];
        const categoryCounts = {};
        
        images.forEach(img => {
          const catName = img.business_categories?.name || 'Unknown';
          categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
        });
        
        const uniqueCategories = Object.keys(categoryCounts).length;
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`   Total images: ${images.length}`);
        console.log(`   Unique categories: ${uniqueCategories}`);
        console.log(`   Distribution:`);
        Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([name, count]) => {
            console.log(`      ${name}: ${count} images`);
          });
        
        if (uniqueCategories > 1) {
          console.log(`   ✅ SUCCESS: Multiple categories returned!`);
        } else {
          console.log(`   ❌ ISSUE: Only one category returned`);
        }
        
        // Show sample images from different categories
        if (images.length > 0) {
          const sampleCategories = new Set();
          const samples = [];
          for (const img of images) {
            const catName = img.business_categories?.name;
            if (catName && !sampleCategories.has(catName) && sampleCategories.size < 3) {
              sampleCategories.add(catName);
              samples.push({
                category: catName,
                title: img.title || 'N/A',
                id: img.id
              });
            }
          }
          
          if (samples.length > 0) {
            console.log(`   Sample images from different categories:`);
            samples.forEach(s => {
              console.log(`      [${s.category}] ${s.title.substring(0, 40)}`);
            });
          }
        }
      } else {
        console.log(`❌ Failed: ${response.status} - ${response.data?.error || 'Unknown'}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('-'.repeat(70));
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('🔍 FINAL VERIFICATION');
  console.log('='.repeat(70));
  
  try {
    const finalResponse = await axios.get(`${BASE_URL}/api/mobile/greetings/templates?limit=50`, { timeout: 30000 });
    const finalImages = finalResponse.data.data.businessCategoryImages || [];
    const finalCategoryCounts = {};
    
    finalImages.forEach(img => {
      const catName = img.business_categories?.name || 'Unknown';
      finalCategoryCounts[catName] = (finalCategoryCounts[catName] || 0) + 1;
    });
    
    const finalUnique = Object.keys(finalCategoryCounts).length;
    
    console.log(`Total images returned: ${finalImages.length}`);
    console.log(`Unique categories: ${finalUnique}`);
    console.log(`\nCategory Distribution:`);
    Object.entries(finalCategoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        const percentage = ((count / finalImages.length) * 100).toFixed(1);
        console.log(`  ${name}: ${count} images (${percentage}%)`);
      });
    
    if (finalUnique >= 5) {
      console.log(`\n✅ ✅ ✅ EXCELLENT: API returns diverse mix from ${finalUnique} categories!`);
    } else if (finalUnique >= 2) {
      console.log(`\n✅ ✅ GOOD: API returns images from ${finalUnique} categories`);
    } else {
      console.log(`\n❌ ISSUE: Only ${finalUnique} category returned`);
    }
  } catch (error) {
    console.log(`❌ Error during final verification: ${error.message}`);
  }
}

testDiverseCategories().catch(console.error);

