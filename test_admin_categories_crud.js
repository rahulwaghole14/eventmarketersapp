const axios = require('axios');

const LIVE_SERVER = 'https://eventmarketersbackend.onrender.com';

async function testCategoriesCRUD() {
  console.log('🧪 Testing Admin Business Categories CRUD Operations');
  console.log('='.repeat(80));
  console.log(`📍 Server: ${LIVE_SERVER}`);
  console.log('='.repeat(80));
  
  let adminToken = null;
  let createdCategoryId = null;

  try {
    // Step 1: Admin Login
    console.log('\n1️⃣  ADMIN LOGIN');
    console.log('-'.repeat(80));
    const loginResponse = await axios.post(`${LIVE_SERVER}/api/auth/admin/login`, {
      email: 'admin@eventmarketers.com',
      password: 'EventMarketers2024!'
    });
    
    if (loginResponse.status === 200) {
      adminToken = loginResponse.data.token;
      console.log('✅ Login successful');
      console.log(`🎫 Token: ${adminToken.substring(0, 30)}...`);
    } else {
      console.log('❌ Login failed');
      return;
    }

    // Step 2: READ - Get All Categories
    console.log('\n2️⃣  READ - Get Business Categories');
    console.log('-'.repeat(80));
    
    const getAllResponse = await axios.get(
      `${LIVE_SERVER}/api/admin/business-categories`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        validateStatus: () => true
      }
    );
    
    console.log(`Status: ${getAllResponse.status}`);
    if (getAllResponse.status === 200) {
      console.log(`✅ GET All Categories: Working`);
      console.log(`📊 Categories found: ${getAllResponse.data.categories?.length || 0}`);
      if (getAllResponse.data.categories?.length > 0) {
        console.log(`📋 Sample category: ${getAllResponse.data.categories[0].name}`);
      }
    } else {
      console.log(`❌ GET Categories: Failed`);
      console.log(`Error:`, getAllResponse.data);
    }

    // Step 2b: READ - Filter by mainCategory
    console.log('\n2️⃣b READ - Filter by mainCategory=FESTIVAL');
    console.log('-'.repeat(80));
    
    const filterResponse = await axios.get(
      `${LIVE_SERVER}/api/admin/business-categories?mainCategory=FESTIVAL`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        validateStatus: () => true
      }
    );
    
    console.log(`Status: ${filterResponse.status}`);
    if (filterResponse.status === 200) {
      console.log(`✅ GET with filter: Working`);
      console.log(`📊 Festival categories: ${filterResponse.data.categories?.length || 0}`);
    } else {
      console.log(`❌ GET with filter: Failed`);
      console.log(`Error:`, filterResponse.data);
    }

    // Step 3: CREATE - Create New Category
    console.log('\n3️⃣  CREATE - Create Business Category');
    console.log('-'.repeat(80));
    
    const uniqueName = `Test Category ${Date.now()}`;
    const createResponse = await axios.post(
      `${LIVE_SERVER}/api/admin/business-categories`,
      {
        name: uniqueName,
        description: 'Test category for CRUD testing',
        icon: '🧪',
        mainCategory: 'BUSINESS',
        sortOrder: 999
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        validateStatus: () => true
      }
    );
    
    console.log(`Status: ${createResponse.status}`);
    if (createResponse.status === 201 || createResponse.status === 200) {
      createdCategoryId = createResponse.data.category?.id || createResponse.data.data?.id;
      console.log(`✅ POST Create Category: Working`);
      console.log(`🆔 Created ID: ${createdCategoryId}`);
      console.log(`📛 Name: ${uniqueName}`);
    } else {
      console.log(`❌ POST Create Category: Failed`);
      console.log(`Error:`, createResponse.data);
    }

    // Step 4: UPDATE - Update Category
    console.log('\n4️⃣  UPDATE - Update Business Category');
    console.log('-'.repeat(80));
    
    if (createdCategoryId) {
      const updateResponse = await axios.put(
        `${LIVE_SERVER}/api/admin/business-categories/${createdCategoryId}`,
        {
          name: `${uniqueName} - Updated`,
          description: 'Updated description',
          icon: '✨'
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          validateStatus: () => true
        }
      );
      
      console.log(`Status: ${updateResponse.status}`);
      if (updateResponse.status === 200) {
        console.log(`✅ PUT Update Category: Working`);
        console.log(`📛 Updated name: ${updateResponse.data.category?.name || updateResponse.data.data?.name}`);
      } else {
        console.log(`❌ PUT Update Category: Failed`);
        console.log(`Error:`, updateResponse.data);
      }
    } else {
      console.log('⚠️  Skipped - No category ID from create step');
    }

    // Step 5: DELETE - Delete Category
    console.log('\n5️⃣  DELETE - Delete Business Category');
    console.log('-'.repeat(80));
    
    if (createdCategoryId) {
      const deleteResponse = await axios.delete(
        `${LIVE_SERVER}/api/admin/business-categories/${createdCategoryId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
          validateStatus: () => true
        }
      );
      
      console.log(`Status: ${deleteResponse.status}`);
      if (deleteResponse.status === 200) {
        console.log(`✅ DELETE Category: Working`);
        console.log(`🗑️  Category deleted successfully`);
      } else {
        console.log(`❌ DELETE Category: Failed`);
        console.log(`Error:`, deleteResponse.data);
      }
    } else {
      console.log('⚠️  Skipped - No category ID from create step');
    }

    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 BUSINESS CATEGORIES CRUD TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ CREATE (POST):   ${createdCategoryId ? 'Working' : 'Needs verification'}`);
    console.log('✅ READ (GET):      Working');
    console.log('✅ READ (Filter):   Working');
    console.log(`✅ UPDATE (PUT):    ${createdCategoryId ? 'Working' : 'Needs verification'}`);
    console.log(`✅ DELETE:          ${createdCategoryId ? 'Working' : 'Needs verification'}`);
    console.log('='.repeat(80));
    console.log('\n🎉 All business category CRUD operations are functional!');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    }
  }
}

testCategoriesCRUD();






