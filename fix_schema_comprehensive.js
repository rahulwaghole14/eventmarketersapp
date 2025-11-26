const fs = require('fs');
const path = require('path');

console.log('🔧 Comprehensive Schema Fix Script');
console.log('=====================================\n');

// Read the current schema
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

console.log('📖 Current schema length:', schema.length, 'characters');

// Add missing models that the code expects
const missingModels = `
// Mobile Subscription Plans
model MobileSubscriptionPlan {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Float
  duration    Int      // Duration in days
  isYearly    Boolean  @default(false)
  features    String?  // JSON string of features
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  subscriptions MobileSubscription[]

  @@map("mobile_subscription_plans")
}

// Template Categories
model TemplateCategory {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  icon        String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  templates MobileTemplate[]

  @@map("template_categories")
}

// Template Languages
model TemplateLanguage {
  id          String   @id @default(cuid())
  name        String   @unique
  code        String   @unique // e.g., 'en', 'hi', 'es'
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  templates MobileTemplate[]

  @@map("template_languages")
}`;

// Find where to insert the new models (before the last closing)
const lastModelIndex = schema.lastIndexOf('}');
if (lastModelIndex !== -1) {
  schema = schema.slice(0, lastModelIndex) + missingModels + '\n\n' + schema.slice(lastModelIndex);
  console.log('✅ Added missing models');
}

// Update existing models with missing fields
console.log('🔧 Updating existing models with missing fields...');

// Add missing fields to MobileSubscription
schema = schema.replace(
  /model MobileSubscription \{[^}]*\}/s,
  `model MobileSubscription {
  id            String   @id @default(cuid())
  mobileUserId  String
  plan          String
  planId        String
  status        String   @default("ACTIVE")
  startDate     DateTime @default(now())
  endDate       DateTime
  amount        Float?
  paymentId     String?
  paymentMethod String?
  autoRenew     Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)
  planDetails MobileSubscriptionPlan? @relation(fields: [planId], references: [id])

  @@map("mobile_subscriptions")
}`
);

// Add missing fields to MobileTemplate
schema = schema.replace(
  /model MobileTemplate \{[^}]*\}/s,
  `model MobileTemplate {
  id              String   @id @default(cuid())
  title           String
  description     String?
  imageUrl        String
  thumbnailUrl    String?
  category        String
  tags            String?  // JSON array of tags
  isPremium       Boolean  @default(false)
  isActive        Boolean  @default(true)
  downloads       Int      @default(0)
  likes           Int      @default(0)
  sourceImageId   String?  // Reference to Image table
  mobileTemplateId String? // For sync purposes
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  mobileSyncAt    DateTime?

  // Relations
  sourceImage Image? @relation(fields: [sourceImageId], references: [id])
  templateCategory TemplateCategory? @relation(fields: [category], references: [name])
  templateLanguage TemplateLanguage? @relation(fields: [category], references: [name])
  templateLikes TemplateLike[]
  templateDownloads TemplateDownload[]

  @@map("mobile_templates")
}`
);

// Add missing fields to MobileVideo
schema = schema.replace(
  /model MobileVideo \{[^}]*\}/s,
  `model MobileVideo {
  id              String   @id @default(cuid())
  title           String
  description     String?
  videoUrl        String
  thumbnailUrl    String?
  duration        Int      // Duration in seconds
  category        String
  tags            String?  // JSON array of tags
  isPremium       Boolean  @default(false)
  isActive        Boolean  @default(true)
  downloads       Int      @default(0)
  likes           Int      @default(0)
  sourceVideoId   String?  // Reference to Video table
  mobileVideoId   String?  // For sync purposes
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  mobileSyncAt    DateTime?

  // Relations
  sourceVideo Video? @relation(fields: [sourceVideoId], references: [id])
  videoLikes VideoLike[]
  videoDownloads VideoDownload[]

  @@map("mobile_videos")
}`
);

// Add missing fields to MobileDownload
schema = schema.replace(
  /model MobileDownload \{[^}]*\}/s,
  `model MobileDownload {
  id            String   @id @default(cuid())
  mobileUserId  String
  resourceType  String   // 'TEMPLATE', 'VIDEO', 'GREETING'
  resourceId    String
  fileUrl       String?
  downloadedAt  DateTime @default(now())

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)

  @@map("mobile_downloads")
}`
);

// Add missing fields to MobileActivity
schema = schema.replace(
  /model MobileActivity \{[^}]*\}/s,
  `model MobileActivity {
  id            String   @id @default(cuid())
  mobileUserId  String
  action        String   // 'DOWNLOAD', 'LIKE', 'VIEW', etc.
  resourceType  String   // 'TEMPLATE', 'VIDEO', 'GREETING'
  resourceId    String?
  resource      String?  // Alternative field name
  details       String?  // JSON string with additional details
  createdAt     DateTime @default(now())

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)

  @@map("mobile_activities")
}`
);

// Update Image model to add missing fields
schema = schema.replace(
  /model Image \{[^}]*\}/s,
  `model Image {
  id                  String   @id @default(cuid())
  title               String
  description         String?
  url                 String
  thumbnailUrl        String?
  category            String
  tags                String?  // JSON array of tags
  dimensions          String?  // e.g., "1920x1080"
  fileSize            Int?     // File size in bytes
  isActive            Boolean  @default(true)
  createdBy           String   // Admin or Subadmin ID
  businessCategoryId  String
  mobileTemplateId    String?  // Reference to MobileTemplate
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  mobileSyncAt        DateTime?

  // Relations
  businessCategory BusinessCategory @relation(fields: [businessCategoryId], references: [id])
  adminUploader    Admin?           @relation(fields: [createdBy], references: [id])
  subadminUploader Subadmin?        @relation(fields: [createdBy], references: [id])
  mobileTemplates  MobileTemplate[]

  @@map("images")
}`
);

// Update Video model to add missing fields
schema = schema.replace(
  /model Video \{[^}]*\}/s,
  `model Video {
  id                  String   @id @default(cuid())
  title               String
  description         String?
  url                 String   // Alias for videoUrl
  videoUrl            String   // Original field
  thumbnailUrl        String?
  duration            Int      // Duration in seconds
  category            String
  tags                String?  // JSON array of tags
  fileSize            Int?     // File size in bytes
  isActive            Boolean  @default(true)
  createdBy           String   // Admin or Subadmin ID
  businessCategoryId  String
  mobileVideoId       String?  // Reference to MobileVideo
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  mobileSyncAt        DateTime?

  // Relations
  businessCategory BusinessCategory @relation(fields: [businessCategoryId], references: [id])
  adminUploader    Admin?           @relation(fields: [createdBy], references: [id])
  subadminUploader Subadmin?        @relation(fields: [createdBy], references: [id])
  mobileVideos     MobileVideo[]

  @@map("videos")
}`
);

// Write the updated schema
fs.writeFileSync(schemaPath, schema);
console.log('✅ Updated schema written to file');

console.log('\n🎉 Schema fix completed!');
console.log('📝 Next steps:');
console.log('   1. Run: npx prisma generate');
console.log('   2. Run: npx prisma db push');
console.log('   3. Run: npm run build');







