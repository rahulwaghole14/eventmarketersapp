const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabaseConnectivity() {
  try {
    console.log('🔍 Testing database connectivity...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test admin table
    const adminCount = await prisma.admin.count();
    console.log(`✅ Admin table accessible - ${adminCount} records`);
    
    // Test subadmin table
    const subadminCount = await prisma.subadmin.count();
    console.log(`✅ Subadmin table accessible - ${subadminCount} records`);
    
    // Test customer table
    const customerCount = await prisma.customer.count();
    console.log(`✅ Customer table accessible - ${customerCount} records`);
    
    // Test installed users table
    const installedUserCount = await prisma.installedUser.count();
    console.log(`✅ InstalledUser table accessible - ${installedUserCount} records`);
    
    // Test business categories table
    const categoryCount = await prisma.businessCategory.count();
    console.log(`✅ BusinessCategory table accessible - ${categoryCount} records`);
    
    // Test mobile templates table
    const mobileTemplateCount = await prisma.mobileTemplate.count();
    console.log(`✅ MobileTemplate table accessible - ${mobileTemplateCount} records`);
    
    // Test mobile users table
    const mobileUserCount = await prisma.mobileUser.count();
    console.log(`✅ MobileUser table accessible - ${mobileUserCount} records`);
    
    // Test if we can create a simple record
    const testUser = await prisma.mobileUser.create({
      data: {
        deviceId: `test_${Date.now()}`,
        name: 'Test User',
        email: `test${Date.now()}@example.com`
      }
    });
    console.log('✅ Can create records - Test user created:', testUser.id);
    
    // Clean up test user
    await prisma.mobileUser.delete({
      where: { id: testUser.id }
    });
    console.log('✅ Can delete records - Test user cleaned up');
    
    console.log('\n🎉 Database connectivity test PASSED!');
    console.log('📊 Summary:');
    console.log(`   - Admins: ${adminCount}`);
    console.log(`   - Subadmins: ${subadminCount}`);
    console.log(`   - Customers: ${customerCount}`);
    console.log(`   - Installed Users: ${installedUserCount}`);
    console.log(`   - Business Categories: ${categoryCount}`);
    console.log(`   - Mobile Templates: ${mobileTemplateCount}`);
    console.log(`   - Mobile Users: ${mobileUserCount}`);
    
  } catch (error) {
    console.error('❌ Database connectivity test FAILED:', error.message);
    console.error('Details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnectivity();







