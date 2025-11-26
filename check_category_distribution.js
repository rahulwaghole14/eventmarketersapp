const axios = require('axios');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';

async function checkDistribution() {
  console.log('🔍 Checking Business Category Distribution\n');
  
  // Get all business categories
  const catsResponse = await axios.get(`${BASE_URL}/api/mobile/business-categories`, { timeout: 30000 });
  const categories = catsResponse.data?.data?.categories || [];
  const withContent = categories.filter(c => c.totalContent > 0);
  
  console.log(`Total categories: ${categories.length}`);
  console.log(`Categories with content: ${withContent.length}\n`);
  console.log('Top 10 categories by content:');
  withContent.sort((a, b) => b.totalContent - a.totalContent).slice(0, 10).forEach(c => {
    console.log(`  ${c.name}: ${c.totalContent} items (${c.posterCount} posters)`);
  });
  
  console.log('\n📊 Checking what API returns...\n');
  
  // Check what the API returns
  const apiResponse = await axios.get(`${BASE_URL}/api/mobile/greetings/templates?limit=50`, { timeout: 30000 });
  const images = apiResponse.data?.data?.businessCategoryImages || [];
  
  const categoryCounts = {};
  images.forEach(img => {
    const catName = img.business_categories?.name || 'Unknown';
    categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
  });
  
  console.log(`Total images returned: ${images.length}`);
  console.log('Distribution:');
  Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
    console.log(`  ${name}: ${count} images`);
  });
  
  const uniqueCats = Object.keys(categoryCounts).length;
  console.log(`\nUnique categories in response: ${uniqueCats}`);
  
  if (uniqueCats === 1) {
    console.log('⚠️  ISSUE: Only one category is being returned!');
    console.log('💡 Solution: Need to modify query to return diverse mix from different categories');
  }
}

checkDistribution().catch(console.error);

