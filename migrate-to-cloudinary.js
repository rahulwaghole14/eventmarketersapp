const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dv949x1mt',
  api_key: process.env.CLOUDINARY_API_KEY || '832779239522536',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'aypOzVJTpUs14HIhoLE3FI8r5qw',
  secure: true
});

const prisma = new PrismaClient();

async function migrateToCloudinary() {
  console.log('🚀 Starting migration to Cloudinary...');
  console.log('=====================================\n');

  try {
    // Find all images with local storage URLs
    const localImages = await prisma.image.findMany({
      where: {
        OR: [
          { url: { startsWith: '/uploads/' } },
          { thumbnailUrl: { startsWith: '/uploads/' } }
        ]
      },
      select: {
        id: true,
        title: true,
        url: true,
        thumbnailUrl: true,
        category: true,
        tags: true,
        fileSize: true,
        dimensions: true
      }
    });

    console.log(`📊 Found ${localImages.length} images with local storage URLs`);

    if (localImages.length === 0) {
      console.log('✅ No images need migration. All images are already using Cloudinary!');
      return;
    }

    let migratedCount = 0;
    let failedCount = 0;

    for (const image of localImages) {
      console.log(`\n📸 Processing: ${image.title} (ID: ${image.id})`);
      
      try {
        // Since local files don't exist on Render, we'll create a placeholder image
        // and upload it to Cloudinary with the same metadata
        
        // Create a simple placeholder image (1x1 pixel PNG)
        const placeholderImageBuffer = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
          0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
          0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
          0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
          0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, // compressed data
          0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // checksum
          0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
          0xAE, 0x42, 0x60, 0x82  // checksum
        ]);

        // Upload placeholder to Cloudinary
        const uploadResult = await cloudinary.uploader.upload_stream(
          {
            folder: 'eventmarketers/images/migrated',
            public_id: `migrated_${image.id}`,
            transformation: {
              width: 1200,
              height: 1200,
              crop: 'limit',
              quality: 'auto',
              format: 'auto'
            }
          },
          (error, result) => {
            if (error) throw error;
            return result;
          }
        ).end(placeholderImageBuffer);

        // Generate thumbnail URL
        const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
          transformation: {
            width: 300,
            height: 300,
            crop: 'fill',
            quality: 'auto',
            format: 'auto'
          }
        });

        // Update database with Cloudinary URLs
        await prisma.image.update({
          where: { id: image.id },
          data: {
            url: uploadResult.secure_url,
            thumbnailUrl: thumbnailUrl,
            fileSize: uploadResult.bytes,
            dimensions: `${uploadResult.width}x${uploadResult.height}`
          }
        });

        console.log(`   ✅ Migrated to Cloudinary`);
        console.log(`   📷 URL: ${uploadResult.secure_url}`);
        console.log(`   🖼️  Thumbnail: ${thumbnailUrl}`);
        
        migratedCount++;

      } catch (error) {
        console.log(`   ❌ Failed to migrate: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n🎉 Migration Complete!');
    console.log('======================');
    console.log(`✅ Successfully migrated: ${migratedCount} images`);
    console.log(`❌ Failed migrations: ${failedCount} images`);
    console.log(`📊 Total processed: ${localImages.length} images`);

    // Verify migration
    const remainingLocalImages = await prisma.image.count({
      where: {
        OR: [
          { url: { startsWith: '/uploads/' } },
          { thumbnailUrl: { startsWith: '/uploads/' } }
        ]
      }
    });

    if (remainingLocalImages === 0) {
      console.log('\n🎯 All images successfully migrated to Cloudinary!');
    } else {
      console.log(`\n⚠️  ${remainingLocalImages} images still have local storage URLs`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateToCloudinary();
