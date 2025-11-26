const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkResources() {
  const resourceIds = [
    'cmgajhev7000jff4hatybvgur',
    'cmgaig0lx0008ff4h8tifs3bx'
  ];

  console.log('🔍 Checking if download resources exist in database\n');

  for (const id of resourceIds) {
    console.log(`Checking ID: ${id}`);
    
    // Check image table
    const image = await prisma.image.findUnique({
      where: { id },
      select: { id: true, title: true, url: true, category: true }
    });
    
    // Check mobile_templates table
    const template = await prisma.mobile_templates.findUnique({
      where: { id },
      select: { id: true, title: true, fileUrl: true, imageUrl: true, category: true }
    });
    
    // Check greeting_templates table
    const greeting = await prisma.greeting_templates.findUnique({
      where: { id },
      select: { id: true, title: true, imageUrl: true }
    });

    console.log(`  Image: ${image ? `✅ Found - "${image.title}" (${image.category}) - URL: ${image.url ? image.url.substring(0, 50) + '...' : 'N/A'}` : '❌ Not found'}`);
    console.log(`  Template: ${template ? `✅ Found - "${template.title}" (${template.category}) - URL: ${template.fileUrl || template.imageUrl || 'N/A'}` : '❌ Not found'}`);
    console.log(`  Greeting: ${greeting ? `✅ Found - "${greeting.title}" - URL: ${greeting.imageUrl || 'N/A'}` : '❌ Not found'}`);
    console.log('');
  }

  await prisma.$disconnect();
}

checkResources().catch(console.error);

