const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('🌱 Seeding admin users to production database...\n');

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: 'admin@eventmarketers.com' }
    });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists:', existingAdmin.email);
      console.log('   ID:', existingAdmin.id);
      console.log('   Name:', existingAdmin.name);
      console.log('   Active:', existingAdmin.isActive);
    } else {
      const admin = await prisma.admin.create({
        data: {
          id: `admin_${Date.now()}`,
          email: 'admin@eventmarketers.com',
          name: 'System Administrator',
          password: hashedPassword,
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Admin user created successfully!');
      console.log('   Email:', admin.email);
      console.log('   ID:', admin.id);
    }

    // Create subadmin user
    const subadminPassword = await bcrypt.hash('subadmin123', 12);
    
    const existingSubadmin = await prisma.subadmin.findUnique({
      where: { email: 'subadmin@eventmarketers.com' }
    });

    if (existingSubadmin) {
      console.log('\nℹ️  Subadmin user already exists:', existingSubadmin.email);
      console.log('   ID:', existingSubadmin.id);
      console.log('   Name:', existingSubadmin.name);
      console.log('   Status:', existingSubadmin.status);
    } else {
      // Get admin ID for createdBy field
      const admin = await prisma.admin.findUnique({
        where: { email: 'admin@eventmarketers.com' }
      });

      const subadmin = await prisma.subadmin.create({
        data: {
          id: `subadmin_${Date.now()}`,
          email: 'subadmin@eventmarketers.com',
          name: 'Content Manager',
          password: subadminPassword,
          role: 'Content Manager',
          permissions: JSON.stringify(['Images', 'Videos', 'Categories']),
          assignedCategories: JSON.stringify(['Event Planners', 'Decorators']),
          status: 'ACTIVE',
          createdBy: admin.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('\n✅ Subadmin user created successfully!');
      console.log('   Email:', subadmin.email);
      console.log('   ID:', subadmin.id);
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('   Admin: admin@eventmarketers.com / admin123');
    console.log('   Subadmin: subadmin@eventmarketers.com / subadmin123');

  } catch (error) {
    console.error('❌ Error seeding admin users:', error);
    console.error('\nError details:', error.message);
    
    if (error.code === 'P2002') {
      console.log('\n⚠️  User already exists (unique constraint violation)');
    } else if (error.code === 'P2003') {
      console.log('\n⚠️  Foreign key constraint error - admin user needed first');
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();

