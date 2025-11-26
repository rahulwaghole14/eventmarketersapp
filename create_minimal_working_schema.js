const fs = require('fs');
const path = require('path');

console.log('🔧 Creating Minimal Working Schema');
console.log('==================================\n');

// Create a minimal working schema that focuses on the core functionality
const minimalSchema = `// Business Marketing Platform Database Schema (SQLite)
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// Admin Users
model Admin {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      String   @default("admin")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  businessCategories BusinessCategory[]
  images             Image[]
  videos             Video[]

  @@map("admins")
}

// Subadmin Users
model Subadmin {
  id                  String   @id @default(cuid())
  email               String   @unique
  password            String
  name                String?
  role                String   @default("subadmin")
  status              String   @default("ACTIVE")
  permissions         String?
  assignedCategories  String?
  lastLogin           DateTime?
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("subadmins")
}

// Customers
model Customer {
  id                      String   @id @default(cuid())
  email                   String   @unique
  password                String
  name                    String?
  phone                   String?
  businessName            String?
  businessPhone           String?
  businessEmail           String?
  businessWebsite         String?
  businessAddress         String?
  businessLogo            String?
  businessDescription     String?
  selectedBusinessCategory String?
  subscriptionStatus      String   @default("INACTIVE")
  subscriptionEndDate     DateTime?
  isActive                Boolean  @default(true)
  lastActiveAt            DateTime?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  // Relations
  subscriptions Subscription[]
  businessProfiles BusinessProfile[]

  @@map("customers")
}

// Installed Users
model InstalledUser {
  id                String   @id @default(cuid())
  deviceId          String   @unique
  email             String?
  name              String?
  phone             String?
  businessName      String?
  businessPhone     String?
  businessEmail     String?
  businessWebsite   String?
  businessAddress   String?
  businessLogo      String?
  businessDescription String?
  selectedBusinessCategory String?
  subscriptionData  String?  // JSON string
  businessProfile   String?  // JSON string
  isActive          Boolean  @default(true)
  lastActiveAt      DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("installed_users")
}

// Mobile Users
model MobileUser {
  id                String   @id @default(cuid())
  deviceId          String   @unique
  email             String?
  name              String?
  phone             String?
  isActive          Boolean  @default(true)
  lastActiveAt      DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  subscriptions     MobileSubscription[]
  downloads         MobileDownload[]
  likes             MobileLike[]
  activities        MobileActivity[]
  transactions      MobileTransaction[]
  businessProfiles  BusinessProfile[]

  @@map("mobile_users")
}

// Business Categories
model BusinessCategory {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  icon        String?
  isActive    Boolean  @default(true)
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  admin Admin @relation(fields: [createdBy], references: [id])
  images Image[]
  videos Video[]

  @@map("business_categories")
}

// Images
model Image {
  id                  String   @id @default(cuid())
  title               String
  description         String?
  url                 String
  thumbnailUrl        String?
  category            String
  tags                String?
  dimensions          String?
  fileSize            Int?
  isActive            Boolean  @default(true)
  createdBy           String
  businessCategoryId  String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  mobileSyncAt        DateTime?

  // Relations
  businessCategory BusinessCategory @relation(fields: [businessCategoryId], references: [id])
  admin           Admin            @relation(fields: [createdBy], references: [id])

  @@map("images")
}

// Videos
model Video {
  id                  String   @id @default(cuid())
  title               String
  description         String?
  url                 String
  videoUrl            String
  thumbnailUrl        String?
  duration            Int
  category            String
  tags                String?
  fileSize            Int?
  isActive            Boolean  @default(true)
  createdBy           String
  businessCategoryId  String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  mobileSyncAt        DateTime?

  // Relations
  businessCategory BusinessCategory @relation(fields: [businessCategoryId], references: [id])
  admin           Admin            @relation(fields: [createdBy], references: [id])

  @@map("videos")
}

// Mobile Templates
model MobileTemplate {
  id              String   @id @default(cuid())
  title           String
  description     String?
  imageUrl        String
  thumbnailUrl    String?
  category        String
  tags            String?
  isPremium       Boolean  @default(false)
  isActive        Boolean  @default(true)
  downloads       Int      @default(0)
  likes           Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  mobileSyncAt    DateTime?

  @@map("mobile_templates")
}

// Mobile Videos
model MobileVideo {
  id              String   @id @default(cuid())
  title           String
  description     String?
  videoUrl        String
  thumbnailUrl    String?
  duration        Int
  category        String
  tags            String?
  isPremium       Boolean  @default(false)
  isActive        Boolean  @default(true)
  downloads       Int      @default(0)
  likes           Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  mobileSyncAt    DateTime?

  @@map("mobile_videos")
}

// Greeting Templates
model GreetingTemplate {
  id          String   @id @default(cuid())
  title       String
  description String?
  imageUrl    String
  category    String
  tags        String?
  isActive    Boolean  @default(true)
  downloads   Int      @default(0)
  likes       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("greeting_templates")
}

// Mobile Subscriptions
model MobileSubscription {
  id            String   @id @default(cuid())
  mobileUserId  String
  plan          String
  planId        String
  status        String   @default("ACTIVE")
  startDate     DateTime @default(now())
  endDate       DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)

  @@map("mobile_subscriptions")
}

// Mobile Downloads
model MobileDownload {
  id            String   @id @default(cuid())
  mobileUserId  String
  resourceType  String
  resourceId    String
  downloadedAt  DateTime @default(now())

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)

  @@map("mobile_downloads")
}

// Mobile Likes
model MobileLike {
  id            String   @id @default(cuid())
  mobileUserId  String
  resourceType  String
  resourceId    String
  createdAt     DateTime @default(now())

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)

  @@map("mobile_likes")
}

// Mobile Activities
model MobileActivity {
  id            String   @id @default(cuid())
  mobileUserId  String
  action        String
  resource      String
  resourceId    String?
  details       String?
  createdAt     DateTime @default(now())

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)

  @@map("mobile_activities")
}

// Mobile Transactions
model MobileTransaction {
  id            String   @id @default(cuid())
  mobileUserId  String
  amount        Float
  currency      String   @default("INR")
  paymentId     String?
  paymentMethod String?
  status        String   @default("PENDING")
  createdAt     DateTime @default(now())

  // Relations
  mobileUser MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)

  @@map("mobile_transactions")
}

// Business Profiles
model BusinessProfile {
  id              String   @id @default(cuid())
  customerId      String?
  mobileUserId    String?
  businessName    String
  businessEmail   String?
  businessPhone   String?
  businessWebsite String?
  businessAddress String?
  businessLogo    String?
  businessDescription String?
  businessCategory String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  customer   Customer?   @relation(fields: [customerId], references: [id])
  mobileUser MobileUser? @relation(fields: [mobileUserId], references: [id])

  @@map("business_profiles")
}

// Subscriptions (Customer subscriptions)
model Subscription {
  id                String   @id @default(cuid())
  customerId        String
  plan              String
  planId            String
  status            String   @default("ACTIVE")
  startDate         DateTime @default(now())
  endDate           DateTime
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  customer Customer @relation(fields: [customerId], references: [id])

  @@map("subscriptions")
}

// Plans
model Plan {
  id          String   @id @default(cuid())
  name        String
  description String?
  price       Float
  duration    Int
  features    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("plans")
}

// Audit Logs
model AuditLog {
  id            String   @id @default(cuid())
  adminId       String?
  subadminId    String?
  customerId    String?
  installedUserId String?
  userType      String
  action        String
  resource      String
  resourceId    String?
  details       String?
  status        String   @default("SUCCESS")
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  @@map("audit_logs")
}

// Template Likes
model TemplateLike {
  id            String   @id @default(cuid())
  mobileUserId  String
  templateId    String
  createdAt     DateTime @default(now())

  @@map("template_likes")
}

// Video Likes
model VideoLike {
  id            String   @id @default(cuid())
  mobileUserId  String
  videoId       String
  createdAt     DateTime @default(now())

  @@map("video_likes")
}

// Greeting Likes
model GreetingLike {
  id            String   @id @default(cuid())
  mobileUserId  String
  greetingId    String
  createdAt     DateTime @default(now())

  @@map("greeting_likes")
}

// Template Downloads
model TemplateDownload {
  id            String   @id @default(cuid())
  mobileUserId  String
  templateId    String
  downloadedAt  DateTime @default(now())

  @@map("template_downloads")
}

// Video Downloads
model VideoDownload {
  id            String   @id @default(cuid())
  mobileUserId  String
  videoId       String
  downloadedAt  DateTime @default(now())

  @@map("video_downloads")
}

// Greeting Downloads
model GreetingDownload {
  id            String   @id @default(cuid())
  mobileUserId  String
  greetingId    String
  downloadedAt  DateTime @default(now())

  @@map("greeting_downloads")
}`;

// Write the minimal schema
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
fs.writeFileSync(schemaPath, minimalSchema);

console.log('✅ Minimal working schema created');
console.log('📝 Next steps:');
console.log('   1. Run: npx prisma generate');
console.log('   2. Run: npx prisma db push');
console.log('   3. Run: npm run build');







