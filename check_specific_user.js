const { PrismaClient } = require('@prisma/client');

// Production database URL
const DATABASE_URL = 'postgresql://eventmarketers_user:XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G@dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com/eventmarketers_db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function checkUser() {
  try {
    console.log('🔍 Checking user: test@test.com in production database');
    console.log('='.repeat(80));
    
    const user = await prisma.mobileUser.findUnique({
      where: { email: 'test@test.com' }
    });
    
    if (!user) {
      console.log('❌ User NOT FOUND in database!');
      console.log('\n📋 This means:');
      console.log('   - User was never registered');
      console.log('   - OR registration failed silently');
      console.log('   - OR email is different (case sensitivity, typo)');
      console.log('\n🔧 Solution:');
      console.log('   Ask user to register again with test@test.com / test123');
    } else {
      console.log('✅ User FOUND in database!');
      console.log('='.repeat(80));
      console.log('📋 USER DETAILS:');
      console.log('='.repeat(80));
      console.log(`🆔 ID: ${user.id}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.name}`);
      console.log(`📞 Phone: ${user.phone}`);
      console.log(`✅ Active: ${user.isActive}`);
      console.log(`📅 Created: ${user.createdAt}`);
      console.log(`📅 Last Active: ${user.lastActiveAt}`);
      console.log('='.repeat(80));
      console.log('\n🔐 PASSWORD ANALYSIS:');
      console.log('='.repeat(80));
      console.log(`Stored password: "${user.password}"`);
      console.log(`Password length: ${user.password.length} characters`);
      console.log(`Expected password: "test123"`);
      console.log(`Expected length: 7 characters`);
      console.log(`Match: ${user.password === 'test123' ? '✅ YES' : '❌ NO'}`);
      console.log('='.repeat(80));
      
      if (user.password !== 'test123') {
        console.log('\n🔴 PASSWORD MISMATCH DETECTED!');
        console.log('='.repeat(80));
        console.log(`Stored:   "${user.password}"`);
        console.log(`Expected: "test123"`);
        console.log('='.repeat(80));
        console.log('\n📋 Possible reasons:');
        console.log('   1. User registered with different password');
        console.log('   2. Password was modified after registration');
        console.log('   3. Default password override in database');
        console.log('\n🔧 Solution:');
        console.log('   Update user password to match:');
        console.log(`   UPDATE mobile_users SET password = 'test123' WHERE email = 'test@test.com';`);
      } else {
        console.log('\n✅ Password matches! Login should work.');
        console.log('   If login still fails, check:');
        console.log('   1. App is sending exact email/password');
        console.log('   2. No extra whitespace in request');
        console.log('   3. Check Render logs for verification output');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();






