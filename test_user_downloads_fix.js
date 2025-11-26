const axios = require('axios');

const BASE_URL = 'https://eventmarketersbackend.onrender.com';
const USER_ID = 'cmgexfzpg0000gjwd97azss8v';

async function testUserDownloads() {
  console.log('🧪 Testing GET /api/mobile/users/:id/downloads\n');
  console.log('='.repeat(70));

  try {
    const response = await axios.get(`${BASE_URL}/api/mobile/users/${USER_ID}/downloads`, {
      timeout: 30000
    });

    if (response.status === 200 && response.data.success) {
      const downloads = response.data.data.downloads || [];
      const pagination = response.data.data.pagination || {};

      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Total downloads: ${pagination.total || downloads.length}`);
      console.log(`📄 Page: ${pagination.page || 1}/${pagination.totalPages || 1}`);
      console.log(`\n📥 Downloads returned: ${downloads.length}\n`);

      let issues = 0;
      let validUrls = 0;
      let emptyUrls = 0;
      let fileUrls = 0;

      downloads.forEach((download, index) => {
        console.log(`${index + 1}. [${download.type}] ${download.resourceId}`);
        console.log(`   Title: ${download.title || 'N/A'}`);
        console.log(`   Download URL: ${download.downloadUrl ? (download.downloadUrl.length > 80 ? download.downloadUrl.substring(0, 80) + '...' : download.downloadUrl) : 'EMPTY'}`);
        console.log(`   Downloaded: ${new Date(download.downloadedAt).toLocaleString()}`);

        // Check URL
        if (!download.downloadUrl || download.downloadUrl === '') {
          console.log('   ⚠️  Empty URL - Resource not found or missing URL');
          emptyUrls++;
          issues++;
        } else if (download.downloadUrl.startsWith('file://')) {
          console.log('   ❌ ERROR: Still has file:// URL (local cache path)');
          fileUrls++;
          issues++;
        } else if (download.downloadUrl.startsWith('http://') || download.downloadUrl.startsWith('https://')) {
          console.log('   ✅ Valid HTTP/HTTPS URL');
          validUrls++;
        } else {
          console.log('   ⚠️  Unknown URL format');
          issues++;
        }

        // Check title
        if (download.title && download.title.startsWith('Resource ')) {
          console.log('   ⚠️  Generic title (should be actual resource title)');
          issues++;
        }

        console.log('');
      });

      // Summary
      console.log('='.repeat(70));
      console.log('📊 TEST SUMMARY');
      console.log('='.repeat(70));
      console.log(`✅ Valid URLs: ${validUrls}`);
      console.log(`⚠️  Empty URLs: ${emptyUrls}`);
      console.log(`❌ File URLs (invalid): ${fileUrls}`);
      console.log(`📋 Total Issues: ${issues}`);

      if (issues === 0) {
        console.log('\n✅ ✅ ✅ ALL DOWNLOADS HAVE VALID URLS AND TITLES!');
      } else if (fileUrls === 0) {
        console.log('\n✅ ✅ URLs are fixed (no file:// paths)!');
        console.log(`   Note: ${emptyUrls} empty URLs indicate resources not found in database`);
      } else {
        console.log('\n❌ ❌ ISSUE: Still returning file:// URLs');
      }

    } else {
      console.log(`❌ Failed: ${response.status}`);
      console.log(`Response:`, JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data, null, 2).substring(0, 300));
    }
  }
}

testUserDownloads().catch(console.error);

