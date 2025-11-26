# 🚀 AWS S3 Implementation Guide for EventMarketers Backend

This guide will help you implement AWS S3 for persistent file storage to solve the image deletion issue on Render.

## 🎯 **Why S3?**
- **Persistent Storage:** Files survive server restarts
- **Scalable:** Handle unlimited files
- **Reliable:** 99.999999999% (11 9's) durability
- **Cost-Effective:** Pay only for what you use
- **CDN Integration:** Fast global access

## 📋 **Prerequisites**
1. AWS Account (free tier available)
2. AWS CLI installed (optional)
3. Basic understanding of AWS IAM

---

## 🔧 **Step 1: AWS S3 Setup**

### 1.1 Create S3 Bucket
```bash
# Via AWS Console (Recommended for beginners)
1. Go to AWS S3 Console
2. Click "Create bucket"
3. Bucket name: eventmarketers-images-[random-string]
4. Region: Choose closest to your users
5. Block public access: UNCHECK (we need public access for images)
6. Create bucket
```

### 1.2 Configure Bucket Policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        }
    ]
}
```

### 1.3 Create IAM User
```bash
# Create IAM user with programmatic access
1. Go to AWS IAM Console
2. Create user: eventmarketers-s3-user
3. Attach policy: AmazonS3FullAccess (or custom policy)
4. Save Access Key ID and Secret Access Key
```

---

## 🔧 **Step 2: Backend Implementation**

### 2.1 Install Dependencies
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install multer-s3  # For direct S3 uploads
npm install @types/multer-s3 --save-dev
```

### 2.2 Environment Variables
```env
# Add to your .env and Render environment variables
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=eventmarketers-images-[random-string]
AWS_S3_BUCKET_URL=https://eventmarketers-images-[random-string].s3.amazonaws.com
```

### 2.3 S3 Service Configuration
```typescript
// src/services/s3Service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multerS3 from 'multer-s3';
import multer from 'multer';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `images/${uniqueSuffix}${path.extname(file.originalname)}`;
      cb(null, filename);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export const deleteFromS3 = async (key: string): Promise<boolean> => {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    }));
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    return false;
  }
};

export const getS3FileUrl = (key: string): string => {
  return `${process.env.AWS_S3_BUCKET_URL}/${key}`;
};
```

---

## 🔧 **Step 3: Update Upload Endpoints**

### 3.1 Update Image Upload Route
```typescript
// src/routes/content.ts - Update existing upload route
import { uploadToS3, deleteFromS3, getS3FileUrl } from '../services/s3Service';

// Replace the existing upload.single('image') with:
router.post('/images/upload', uploadToS3.single('image'), [
  // ... existing validation
], async (req: Request, res: Response) => {
  try {
    const file = req.file as any; // S3 file object
    
    // Get S3 URL
    const imageUrl = getS3FileUrl(file.key);
    
    const imageData = {
      title: req.body.title,
      description: req.body.description,
      url: imageUrl, // Use S3 URL instead of local path
      thumbnailUrl: imageUrl, // You can create thumbnails later
      category: req.body.category,
      businessCategoryId: req.body.businessCategoryId || null,
      // ... rest of the data
    };

    const image = await prisma.image.create({
      data: imageData,
      // ... rest of the creation logic
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded to S3 successfully',
      image: {
        ...image,
        s3Key: file.key, // Store S3 key for future operations
      }
    });

  } catch (error) {
    // Clean up S3 file on error
    if (req.file) {
      await deleteFromS3(req.file.key);
    }
    // ... error handling
  }
});
```

### 3.2 Update Bulk Upload Route
```typescript
// Update bulk upload to use S3
router.post('/images/bulk-upload', uploadToS3.array('images', 50), [
  // ... existing validation
], async (req: Request, res: Response) => {
  try {
    const files = req.files as any[];
    
    for (const file of files) {
      const imageUrl = getS3FileUrl(file.key);
      
      const imageData = {
        title: req.body[`title_${index}`] || file.originalname,
        url: imageUrl,
        // ... rest of the data
      };

      await prisma.image.create({ data: imageData });
    }

    // ... rest of the logic
  } catch (error) {
    // Clean up all S3 files on error
    const files = req.files as any[];
    for (const file of files) {
      await deleteFromS3(file.key);
    }
    // ... error handling
  }
});
```

---

## 🔧 **Step 4: Migration Script**

### 4.1 Create Migration Script
```typescript
// scripts/migrate-to-s3.ts
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function migrateImagesToS3() {
  console.log('🚀 Starting migration to S3...');
  
  const images = await prisma.image.findMany({
    where: {
      url: {
        startsWith: '/uploads/'
      }
    }
  });

  console.log(`📊 Found ${images.length} images to migrate`);

  for (const image of images) {
    try {
      // Extract filename from URL
      const filename = image.url.replace('/uploads/images/', '');
      const localPath = path.join('uploads', 'images', filename);
      
      // Check if file exists locally
      if (!fs.existsSync(localPath)) {
        console.log(`⚠️  File not found locally: ${filename}`);
        continue;
      }

      // Upload to S3
      const s3Key = `images/${filename}`;
      const fileContent = fs.readFileSync(localPath);
      
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        Body: fileContent,
        ContentType: 'image/jpeg', // Adjust based on file type
      }));

      // Update database record
      const newUrl = `${process.env.AWS_S3_BUCKET_URL}/${s3Key}`;
      await prisma.image.update({
        where: { id: image.id },
        data: { 
          url: newUrl,
          thumbnailUrl: newUrl // Update thumbnail URL too
        }
      });

      console.log(`✅ Migrated: ${filename}`);
      
    } catch (error) {
      console.error(`❌ Failed to migrate ${image.url}:`, error);
    }
  }

  console.log('🎉 Migration complete!');
}

migrateImagesToS3().catch(console.error);
```

---

## 🔧 **Step 5: Testing**

### 5.1 Test S3 Integration
```typescript
// scripts/test-s3-upload.js
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testS3Upload() {
  const form = new FormData();
  form.append('image', fs.createReadStream('test-image.jpg'));
  form.append('title', 'S3 Test Image');
  form.append('category', 'BUSINESS');
  form.append('businessCategoryId', 'your-business-category-id');

  const response = await fetch('https://your-backend.onrender.com/api/content/images/upload', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-admin-token',
      ...form.getHeaders()
    },
    body: form
  });

  const result = await response.json();
  console.log('Upload result:', result);
}

testS3Upload();
```

---

## 🔧 **Step 6: Deployment**

### 6.1 Update Render Environment Variables
```bash
# Add these to your Render service environment variables:
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=eventmarketers-images-[random-string]
AWS_S3_BUCKET_URL=https://eventmarketers-images-[random-string].s3.amazonaws.com
```

### 6.2 Deploy and Test
```bash
# Build and deploy
npm run build
git add .
git commit -m "Implement AWS S3 for persistent file storage"
git push

# Test the deployment
# Upload a new image and verify it persists after server restart
```

---

## 💰 **Cost Estimation**

### AWS S3 Pricing (US East 1)
- **Storage:** $0.023 per GB per month
- **Requests:** $0.0004 per 1,000 PUT requests
- **Data Transfer:** Free for first 1GB per month

### Example Costs for 1,000 images (100MB total):
- **Storage:** ~$0.002 per month
- **Upload requests:** ~$0.40 (1,000 uploads)
- **Total:** Less than $1 per month for typical usage

---

## 🚨 **Important Notes**

1. **Never commit AWS credentials** to your repository
2. **Use IAM roles** in production (better than access keys)
3. **Set up CloudFront CDN** for better performance
4. **Implement backup strategy** for critical images
5. **Monitor costs** using AWS Cost Explorer

---

## 🎉 **Benefits After Implementation**

✅ **Images persist** across server restarts
✅ **Scalable storage** for unlimited images
✅ **Fast global access** with CDN
✅ **Reliable backup** and redundancy
✅ **Cost-effective** for small to medium usage

---

**Ready to implement? Let me know if you need help with any specific step!**
