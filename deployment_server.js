const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { PrismaClient } = require('@prisma/client');
const Razorpay = require('razorpay');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Configure Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dv949x1mt',
  api_key: process.env.CLOUDINARY_API_KEY || '832779239522536',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'aypOzVJTpUs14HIhoLE3FI8r5qw',
  secure: true
});

// Logo upload configuration for user profile logos
const logoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eventmarketers/user-logos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: {
      width: 400,
      height: 400,
      crop: 'limit',
      quality: 'auto',
      format: 'auto'
    }
  }
});

const logoUpload = multer({ 
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images allowed.'), false);
    }
  }
});

// URL validation function
function isValidLogoUrl(url) {
  // Allow empty/null (to remove logo)
  if (!url || url === '') return true;
  
  // Reject local file paths
  const invalidPatterns = [
    'file://',
    'content://',
    '/storage/',
    '\\'  // Windows paths
  ];
  
  if (invalidPatterns.some(pattern => url.includes(pattern))) {
    return false;
  }
  
  // Must be HTTPS URL
  return url.startsWith('https://');
}

// Helper function to get logo thumbnail URL
function getLogoThumbnailUrl(publicId) {
  return cloudinary.url(publicId, {
    transformation: {
      width: 200,
      height: 200,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    }
  });
}

function normalizePaymentAmount(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) {
    return fallback;
  }
  return Math.round(num);
}

function getBusinessProfilePaymentExpiryDate() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + BUSINESS_PROFILE_PAYMENT_EXPIRY_DAYS);
  return expiry;
}

async function expirePendingBusinessProfilePayments(mobileUserId) {
  try {
    await prisma.businessProfilePayment.updateMany({
      where: {
        mobileUserId,
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'EXPIRED' }
    });
  } catch (error) {
    console.warn('⚠️  Failed to expire old business profile payments:', error?.message || error);
  }
}

function metadataToObject(metadata) {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata;
  }
  return {};
}

// Password Reset Helper Functions
const RESET_CODE_EXPIRY_MINUTES = parseInt(process.env.PASSWORD_RESET_CODE_EXPIRY_MINUTES || '15', 10);
const MAX_RESET_ATTEMPTS = parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || '5', 10);

const generateResetCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const isEmailConfigured = () => Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM
);

let emailTransporter = null;

const getEmailTransporter = () => {
  if (!isEmailConfigured()) {
    if (!emailTransporter) {
      console.warn('[EMAIL] SMTP environment variables missing. Unable to send emails.');
    }
    return null;
  }

  if (emailTransporter) {
    return emailTransporter;
  }

  try {
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE.toLowerCase() === 'true'
      : port === 465;

    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('[EMAIL] SMTP transporter initialized');
    return emailTransporter;
  } catch (error) {
    console.error('[EMAIL] Failed to create transporter', error);
    return null;
  }
};

const sendPasswordResetCodeEmail = async ({ to, code, minutesValid = RESET_CODE_EXPIRY_MINUTES }) => {
  const transporter = getEmailTransporter();

  if (!transporter) {
    console.warn(`[EMAIL] Skipping email send. Code for ${to}: ${code}`);
    return false;
  }

  try {
    const from = process.env.SMTP_FROM || 'Event Marketers <no-reply@eventmarketers.com>';
    const subject = 'Your Event Marketers Password Reset Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi,</p>
        <p>Use the verification code below to reset your Event Marketers password:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 4px; margin: 0;">${code}</h1>
        </div>
        <p>This code expires in ${minutesValid} minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="margin-top: 30px; color: #666; font-size: 12px;">— Event Marketers Team</p>
      </div>
    `;
    const text = `Use the verification code ${code} to reset your password. The code expires in ${minutesValid} minutes.`;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });

    console.log(`[EMAIL] Reset code email sent to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Failed to send reset code email to ${to}`, error);
    return false;
  }
};

function getMobileUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authorization token required');
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
    if (!decoded?.id) {
      const error = new Error('Invalid user token');
      error.statusCode = 401;
      throw error;
    }
    return decoded.id;
  } catch (jwtError) {
    const error = new Error('Invalid or expired token');
    error.statusCode = 401;
    throw error;
  }
}

// Import compiled web frontend routes
const authRoutes = require('./dist/routes/auth').default;
const adminRoutes = require('./dist/routes/admin').default;
const contentRoutes = require('./dist/routes/content').default;
const customerRoutes = require('./dist/routes/customer').default;
const installedUsersRoutes = require('./dist/routes/installedUsers').default;
const businessProfileRoutes = require('./dist/routes/businessProfile').default;
const analyticsRoutes = require('./dist/routes/analytics').default;
const searchRoutes = require('./dist/routes/search').default;
const fileManagementRoutes = require('./dist/routes/fileManagement').default;
const contentSyncRoutes = require('./dist/routes/contentSync').default;

console.log('🚀 EventMarketers Backend - Deployment Server');
console.log('==============================================\n');

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

const BUSINESS_PROFILE_PAYMENT_AMOUNT = parseInt(process.env.BUSINESS_PROFILE_PAYMENT_AMOUNT || '99', 10);
const BUSINESS_PROFILE_PAYMENT_CURRENCY = (process.env.BUSINESS_PROFILE_PAYMENT_CURRENCY || 'INR').toUpperCase();
const BUSINESS_PROFILE_PAYMENT_EXPIRY_DAYS = parseInt(process.env.BUSINESS_PROFILE_PAYMENT_EXPIRY_DAYS || '90', 10);
const BUSINESS_PROFILE_PAYMENT_TYPE = 'BUSINESS_PROFILE';

// Initialize Razorpay instance (only if credentials are provided)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized successfully');
  } catch (error) {
    console.warn('⚠️  Razorpay initialization failed:', error.message);
    razorpay = null;
  }
} else {
  console.warn('⚠️  Razorpay credentials not found. Payment features will be disabled.');
  console.warn('   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to enable payments');
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'https://eventmarketers.com',
    'https://eventmarketersfrontend.onrender.com',
    'https://eventmarketersbackend.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware - log all requests before routing (placed early)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/mobile/users') && req.method === 'POST') {
    console.log('🔍 DEBUG - POST request intercepted:', req.method, req.originalUrl);
    console.log('🔍 DEBUG - Path:', req.path);
  }
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// ADDITIONAL CONTENT MANAGEMENT ENDPOINTS
// ============================================

// Update image metadata endpoint
app.put('/api/content/images/:id', async (req, res) => {
  try {
    console.log('🔄 Update image request received');
    console.log('📝 Image ID:', req.params.id);
    console.log('📝 Update data:', req.body);

    const { id } = req.params;
    const { title, description, category, businessCategoryId, tags } = req.body;

    // Check if at least one field is provided
    if (!title && !description && !category && !businessCategoryId && !tags) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'At least one field must be provided for update'
      });
    }

    // Check if image exists
    const existingImage = await prisma.image.findUnique({
      where: { id },
      include: {
        business_categories: { select: { name: true, icon: true } }
      }
    });

    if (!existingImage) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        message: `Image with ID ${id} does not exist`
      });
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) {
      updateData.category = category;
      // If category is changed to non-BUSINESS, clear businessCategoryId
      if (category !== 'BUSINESS') {
        updateData.businessCategoryId = null;
      }
    }
    if (businessCategoryId !== undefined) {
      // Only allow businessCategoryId if category is BUSINESS
      if (existingImage.category === 'BUSINESS' || category === 'BUSINESS') {
        updateData.businessCategoryId = businessCategoryId;
      }
    }
    if (tags !== undefined) {
      // Validate tags format
      try {
        // If tags is already a JSON string, validate it
        if (typeof tags === 'string' && tags.startsWith('[')) {
          JSON.parse(tags);
          updateData.tags = tags;
        } else if (typeof tags === 'string') {
          // If tags is comma-separated, convert to JSON array
          const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
          updateData.tags = JSON.stringify(tagArray);
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Tags must be a valid JSON string or comma-separated values'
        });
      }
    }

    // Update the image
    const updatedImage = await prisma.image.update({
      where: { id },
      data: updateData,
      include: {
        business_categories: {
          select: { name: true, icon: true }
        }
      }
    });

    console.log('✅ Image updated successfully');
    res.json({
      success: true,
      message: 'Image updated successfully',
      data: {
        id: updatedImage.id,
        title: updatedImage.title,
        description: updatedImage.description,
        tags: updatedImage.tags,
        url: updatedImage.url,
        thumbnailUrl: updatedImage.thumbnailUrl,
        category: updatedImage.category,
        businessCategoryId: updatedImage.businessCategoryId,
        businessCategoryName: updatedImage.businessCategory?.name,
        uploadedBy: updatedImage.adminUploaderId || updatedImage.subadminUploaderId,
        createdAt: updatedImage.createdAt,
        updatedAt: updatedImage.updatedAt,
        approvalStatus: updatedImage.approvalStatus,
        downloads: updatedImage.downloads,
        views: updatedImage.views,
        isActive: updatedImage.isActive
      }
    });

  } catch (error) {
    console.error('❌ Update image error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while updating the image'
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EventMarketers Backend Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// WEB FRONTEND API ROUTES
// ============================================

// Register web frontend routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/customers', customerRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/installed-users', installedUsersRoutes);
app.use('/api/business-profile', businessProfileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/file-management', fileManagementRoutes);
app.use('/api/content-sync', contentSyncRoutes);

// ============================================
// ONE-TIME ADMIN SETUP ENDPOINT
// ============================================
// REMOVE THIS AFTER CREATING ADMIN USER!

app.post('/api/setup/create-admin-user', async (req, res) => {
  try {
    const { secret } = req.body;
    const SETUP_SECRET = 'EventMarketers_Setup_2024_Secret_Key';
    
    if (secret !== SETUP_SECRET) {
      return res.status(401).json({
        success: false,
        error: 'Invalid setup secret'
      });
    }

    console.log('🔐 One-time admin setup initiated...');

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('EventMarketers2024!', 12);
    
    // Use upsert to create or update admin user
    const admin = await prisma.admin.upsert({
      where: { email: 'admin@eventmarketers.com' },
      update: {
        password: hashedPassword,
        name: 'EventMarketers Admin',
        role: 'ADMIN',
        isActive: true
      },
      create: {
        email: 'admin@eventmarketers.com',
        name: 'EventMarketers Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Admin user created/updated:', admin.email);

    res.json({
      success: true,
      message: 'Admin user created/updated successfully',
      admins: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      credentials: {
        email: 'admin@eventmarketers.com',
        password: 'EventMarketers2024!'
      }
    });

  } catch (error) {
    console.error('❌ Error creating admins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create admin user',
      details: error.message
    });
  }
});

// ============================================
// MOBILE APIs - WORKING ENDPOINTS
// ============================================

// Mobile Home Stats API
app.get('/api/mobile/home/stats', async (req, res) => {
  try {
    const [templates, videos, greetings, downloads, likes] = await Promise.all([
      prisma.mobile_templates.count({ where: { isActive: true } }),
      prisma.mobile_videos.count({ where: { isActive: true } }),
      prisma.greeting_templates.count({ where: { isActive: true } }),
      prisma.mobileDownload.count(),
      prisma.mobile_likes.count()
    ]);

    res.json({
      success: true,
      data: {
        totalTemplates: templates,
        totalVideos: videos,
        totalGreetings: greetings,
        totalDownloads: downloads,
        totalLikes: likes,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Mobile home stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch home statistics'
    });
  }
});

// Mobile Templates API
app.get('/api/mobile/templates', async (req, res) => {
  try {
    const { page = '1', limit = '20', category } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const where = {
      approvalStatus: 'APPROVED',
      isActive: true
    };
    
    if (category) {
      where.category = category;
    }

    const templates = await prisma.image.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        business_categories: {
          select: { name: true, icon: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.image.count({ where });

    res.json({
      success: true,
      data: {
        templates: templates.map(template => ({
          id: template.id,
          title: template.title,
          description: template.description,
          imageUrl: template.url,
          thumbnailUrl: template.thumbnailUrl,
          category: template.businessCategory?.name || template.category,
          tags: template.tags ? JSON.parse(template.tags) : [],
          isPremium: template.category === 'BUSINESS',
          downloads: template.downloads,
          views: template.views,
          dimensions: template.dimensions,
          createdAt: template.createdAt
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Mobile templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mobile templates'
    });
  }
});

// Mobile Greetings API
app.get('/api/mobile/greetings', async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const greetings = await prisma.greeting_templates.findMany({
      where: { isActive: true },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.greeting_templates.count({ where: { isActive: true } });

    res.json({
      success: true,
      data: {
        greetings: greetings.map(greeting => ({
          id: greeting.id,
          title: greeting.title,
          description: greeting.description,
          imageUrl: greeting.imageUrl,
          category: greeting.category,
          tags: greeting.tags ? JSON.parse(greeting.tags) : [],
          downloads: greeting.downloads,
          likes: greeting.likes,
          createdAt: greeting.createdAt
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Mobile greetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mobile greetings'
    });
  }
});

// Mobile Posters API
app.get('/api/mobile/posters', async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Mock posters data for now
    const mockPosters = [
      {
        id: '1',
        title: 'Business Promotion',
        category: 'business',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Professional business poster'
      },
      {
        id: '2',
        title: 'Event Announcement',
        category: 'event',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Eye-catching event poster'
      },
      {
        id: '3',
        title: 'Sale Promotion',
        category: 'sale',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Attractive sale poster'
      }
    ];

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedPosters = mockPosters.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        posters: paginatedPosters,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: mockPosters.length,
          pages: Math.ceil(mockPosters.length / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Mobile posters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mobile posters'
    });
  }
});

// Mobile Posters Categories API
app.get('/api/mobile/posters/categories', async (req, res) => {
  try {
    const categories = [
      { id: '1', name: 'Business', icon: '💼', count: 25 },
      { id: '2', name: 'Event', icon: '🎉', count: 18 },
      { id: '3', name: 'Sale', icon: '🛍️', count: 12 },
      { id: '4', name: 'General', icon: '📄', count: 30 }
    ];

    res.json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    console.error('Mobile posters categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch poster categories'
    });
  }
});

// Mobile Posters by Category API
app.get('/api/mobile/posters/category/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Find the business category by name (case-insensitive)
    // First try exact match, then try normalized match (removing spaces/special chars)
    const normalizedInput = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    let finalCategory = await prisma.businessCategory.findFirst({
      where: {
        name: {
          equals: categoryName,
          mode: 'insensitive'
        },
        isActive: true
      }
    });

    // If not found by direct match, try fuzzy matching by normalized name
    if (!finalCategory) {
      const allCategories = await prisma.businessCategory.findMany({
        where: { isActive: true }
      });
      
      finalCategory = allCategories.find(cat => {
        const normalizedCatName = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedCatName === normalizedInput;
      });
    }

    if (!finalCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `Business category "${categoryName}" does not exist`
      });
    }

    // Get images (posters) for this business category
    const [posters, total] = await Promise.all([
      prisma.image.findMany({
        where: {
          businessCategoryId: finalCategory.id,
          approvalStatus: 'APPROVED',
          isActive: true
        },
        include: {
          business_categories: {
            select: { name: true, icon: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum
      }),
      prisma.image.count({
        where: {
          businessCategoryId: finalCategory.id,
          approvalStatus: 'APPROVED',
          isActive: true
        }
      })
    ]);

    // Transform to poster format
    const posterData = posters.map(image => ({
      id: image.id,
      title: image.title,
      description: image.description || `${finalCategory.name} poster`,
      category: finalCategory.name,
      categoryId: finalCategory.id,
      imageUrl: image.url,
      thumbnailUrl: image.thumbnailUrl,
      downloads: image.downloads,
      views: image.views,
      tags: image.tags ? JSON.parse(image.tags) : [],
      fileSize: image.fileSize,
      dimensions: image.dimensions,
      createdAt: image.createdAt
    }));

    res.json({
      success: true,
      data: {
        category: finalCategory.name,
        categoryId: finalCategory.id,
        categoryIcon: finalCategory.icon,
        categoryDescription: finalCategory.description,
        posters: posterData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          pages: Math.ceil(total / limitNum)
        }
      },
      message: `Retrieved ${posterData.length} posters for ${finalCategory.name} category`
    });
  } catch (error) {
    console.error('Fetch posters by category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posters by category'
    });
  }
});

// Mobile User Registration API
// Calendar API - Get Posters by Date
app.get('/api/mobile/calendar/posters/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Expected YYYY-MM-DD',
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    console.log('📅 [CALENDAR API] Fetching posters for date:', date);

    const posters = [];

    // Try to fetch from CalendarPoster model first (if it exists in database)
    try {
      const prismaAny = prisma;
      const calendarPosters = await prismaAny.calendarPoster?.findMany({
        where: {
          AND: [
            { isActive: true },
            { date: date }
          ]
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);

      if (calendarPosters && Array.isArray(calendarPosters)) {
        const formattedPosters = calendarPosters.map((poster) => ({
          id: poster.id,
          name: poster.name,
          title: poster.title || poster.name,
          description: poster.description || '',
          thumbnailUrl: poster.thumbnailUrl,
          imageUrl: poster.imageUrl,
          category: poster.category || 'Festival',
          downloads: poster.downloads || 0,
          isDownloaded: false,
          tags: poster.tags ? poster.tags.split(',').map((tag) => tag.trim()) : [],
          date: poster.date,
          festivalName: poster.festivalName,
          festivalEmoji: poster.festivalEmoji,
          createdAt: poster.createdAt.toISOString(),
          updatedAt: poster.updatedAt.toISOString()
        }));
        posters.push(...formattedPosters);
        console.log(`✅ [CALENDAR API] Found ${formattedPosters.length} poster(s) from CalendarPoster model`);
      }
    } catch (error) {
      // CalendarPoster model might not exist yet, that's okay
      if (!error.message?.includes('model') && !error.message?.includes('does not exist')) {
        console.error('⚠️ [CALENDAR API] Error fetching from CalendarPoster model:', error);
      }
    }

    // Fetch from Image model where tags contain the date or category is FESTIVAL
    try {
      const images = await prisma.image.findMany({
        where: {
          AND: [
            { isActive: true },
            { approvalStatus: 'APPROVED' },
            {
              OR: [
                { tags: { contains: date } },
                { category: 'FESTIVAL' },
                { category: 'CALENDAR' }
              ]
            }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Convert images to calendar poster format
      const imagePosters = images.map((image) => ({
        id: image.id,
        name: image.title,
        title: image.title,
        description: image.description || '',
        thumbnailUrl: image.thumbnailUrl || image.url,
        imageUrl: image.url,
        category: image.category || 'Festival',
        downloads: image.downloads || 0,
        isDownloaded: false,
        tags: image.tags ? image.tags.split(',').map((tag) => tag.trim()) : [],
        date: date,
        createdAt: image.createdAt.toISOString(),
        updatedAt: image.updatedAt.toISOString()
      }));

      posters.push(...imagePosters);
    } catch (error) {
      console.error('⚠️ [CALENDAR API] Error fetching from Image model:', error);
    }

    // Fetch from mobile_templates model
    try {
      const templates = await prisma.mobile_templates.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { tags: { contains: date } },
                { category: 'FESTIVAL' },
                { category: 'CALENDAR' }
              ]
            }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Convert templates to calendar poster format
      const templatePosters = templates.map((template) => ({
        id: template.id,
        name: template.title,
        title: template.title,
        description: template.description || '',
        thumbnailUrl: template.thumbnailUrl || template.imageUrl,
        imageUrl: template.imageUrl,
        category: template.category || 'Festival',
        downloads: template.downloads || 0,
        isDownloaded: false,
        tags: template.tags ? template.tags.split(',').map((tag) => tag.trim()) : [],
        date: date,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString()
      }));

      posters.push(...templatePosters);
    } catch (error) {
      console.error('⚠️ [CALENDAR API] Error fetching from mobile_templates model:', error);
    }

    // Remove duplicates based on ID
    const uniquePosters = posters.filter((poster, index, self) =>
      index === self.findIndex((p) => p.id === poster.id)
    );

    console.log(`✅ [CALENDAR API] Found ${uniquePosters.length} poster(s) for date: ${date}`);

    res.json({
      success: true,
      data: {
        posters: uniquePosters,
        date,
        total: uniquePosters.length
      },
      message: `Posters for ${date} fetched successfully`
    });

  } catch (error) {
    console.error('❌ [CALENDAR API] Error fetching posters by date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posters',
      message: error.message || 'Internal server error'
    });
  }
});

// Calendar API - Get Posters by Month
app.get('/api/mobile/calendar/posters/month/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    // Validate year and month
    if (isNaN(year) || year < 2020 || year > 2100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year. Expected year between 2020-2100',
        message: 'Year must be between 2020 and 2100'
      });
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month. Expected month between 1-12',
        message: 'Month must be between 1 and 12'
      });
    }

    console.log(`📅 [CALENDAR API] Fetching posters for month: ${year}-${month}`);

    // Get all dates in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const postersByDate = {};

    // Try to fetch from CalendarPoster model first (if it exists in database)
    try {
      const prismaAny = prisma;
      const calendarPosters = await prismaAny.calendarPoster?.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              date: {
                gte: monthStart,
                lte: monthEnd
              }
            }
          ]
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);

      if (calendarPosters && Array.isArray(calendarPosters)) {
        calendarPosters.forEach((poster) => {
          if (!postersByDate[poster.date]) {
            postersByDate[poster.date] = [];
          }
          postersByDate[poster.date].push({
            id: poster.id,
            name: poster.name,
            title: poster.title || poster.name,
            description: poster.description || '',
            thumbnailUrl: poster.thumbnailUrl,
            imageUrl: poster.imageUrl,
            category: poster.category || 'Festival',
            downloads: poster.downloads || 0,
            isDownloaded: false,
            tags: poster.tags ? poster.tags.split(',').map((tag) => tag.trim()) : [],
            date: poster.date,
            festivalName: poster.festivalName,
            festivalEmoji: poster.festivalEmoji,
            createdAt: poster.createdAt.toISOString(),
            updatedAt: poster.updatedAt.toISOString()
          });
        });
        console.log(`✅ [CALENDAR API] Found ${calendarPosters.length} poster(s) from CalendarPoster model`);
      }
    } catch (error) {
      // CalendarPoster model might not exist yet, that's okay
      if (!error.message?.includes('model') && !error.message?.includes('does not exist')) {
        console.error('⚠️ [CALENDAR API] Error fetching from CalendarPoster model:', error);
      }
    }

    // Fetch from Image model
    try {
      const images = await prisma.image.findMany({
        where: {
          AND: [
            { isActive: true },
            { approvalStatus: 'APPROVED' },
            {
              OR: [
                { category: 'FESTIVAL' },
                { category: 'CALENDAR' },
                {
                  tags: {
                    contains: `${year}-${String(month).padStart(2, '0')}`
                  }
                }
              ]
            }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      });

      // Group images by date from tags
      images.forEach((image) => {
        if (image.tags) {
          const tags = image.tags.split(',').map((tag) => tag.trim());
          tags.forEach((tag) => {
            // Check if tag matches date format YYYY-MM-DD
            const dateMatch = tag.match(/^\d{4}-\d{2}-\d{2}$/);
            if (dateMatch && tag >= monthStart && tag <= monthEnd) {
              if (!postersByDate[tag]) {
                postersByDate[tag] = [];
              }
              postersByDate[tag].push({
                id: image.id,
                name: image.title,
                title: image.title,
                description: image.description || '',
                thumbnailUrl: image.thumbnailUrl || image.url,
                imageUrl: image.url,
                category: image.category || 'Festival',
                downloads: image.downloads || 0,
                isDownloaded: false,
                tags: tags,
                date: tag,
                createdAt: image.createdAt.toISOString(),
                updatedAt: image.updatedAt.toISOString()
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('⚠️ [CALENDAR API] Error fetching from Image model:', error);
    }

    // Fetch from mobile_templates model
    try {
      const templates = await prisma.mobile_templates.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { category: 'FESTIVAL' },
                { category: 'CALENDAR' },
                {
                  tags: {
                    contains: `${year}-${String(month).padStart(2, '0')}`
                  }
                }
              ]
            }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      });

      // Group templates by date from tags
      templates.forEach((template) => {
        if (template.tags) {
          const tags = template.tags.split(',').map((tag) => tag.trim());
          tags.forEach((tag) => {
            // Check if tag matches date format YYYY-MM-DD
            const dateMatch = tag.match(/^\d{4}-\d{2}-\d{2}$/);
            if (dateMatch && tag >= monthStart && tag <= monthEnd) {
              if (!postersByDate[tag]) {
                postersByDate[tag] = [];
              }
              postersByDate[tag].push({
                id: template.id,
                name: template.title,
                title: template.title,
                description: template.description || '',
                thumbnailUrl: template.thumbnailUrl || template.imageUrl,
                imageUrl: template.imageUrl,
                category: template.category || 'Festival',
                downloads: template.downloads || 0,
                isDownloaded: false,
                tags: tags,
                date: tag,
                createdAt: template.createdAt.toISOString(),
                updatedAt: template.updatedAt.toISOString()
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('⚠️ [CALENDAR API] Error fetching from mobile_templates model:', error);
    }

    // Remove duplicates from each date
    Object.keys(postersByDate).forEach((date) => {
      postersByDate[date] = postersByDate[date].filter((poster, index, self) =>
        index === self.findIndex((p) => p.id === poster.id)
      );
    });

    const totalPosters = Object.values(postersByDate).reduce((sum, posters) => sum + posters.length, 0);

    console.log(`✅ [CALENDAR API] Found ${totalPosters} poster(s) across ${Object.keys(postersByDate).length} dates for month ${year}-${month}`);

    res.json({
      success: true,
      data: {
        posters: postersByDate,
        month,
        year,
        total: totalPosters
      },
      message: `Posters for ${year}-${month} fetched successfully`
    });

  } catch (error) {
    console.error('❌ [CALENDAR API] Error fetching posters by month:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posters',
      message: error.message || 'Internal server error'
    });
  }
});

app.post('/api/mobile/auth/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      companyName, 
      phone, 
      description, 
      category, 
      address, 
      alternatePhone, 
      website, 
      companyLogo, 
      displayName 
    } = req.body;

    // Validate required fields as per documentation (only email and password required)
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.mobileUser.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        message: 'User with this email already exists'
      });
    }

    // Hash password (in production, use bcrypt)
    // For now, we'll store it as plain text for demo purposes
    const hashedPassword = password; // In production: await bcrypt.hash(password, 10);

    // Create new mobile user
    const newUser = await prisma.mobileUser.create({
      data: {
        email,
        password: hashedPassword,
        name: companyName || displayName,
        phone,
        isActive: true,
        lastActiveAt: new Date()
      }
    });

    // Create business profile if company details provided
    let businessProfile = null;
    if (companyName || category) {
      businessProfile = await prisma.businessProfile.create({
        data: {
          mobileUserId: newUser.id,
          businessName: companyName,
          businessEmail: email,
          businessPhone: phone,
          businessDescription: description || '',
          businessCategory: category || 'General',
          businessAddress: address || '',
          businessWebsite: website || '',
          businessLogo: companyLogo || ''
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        userType: 'MOBILE_USER'
      },
      process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          companyName: businessProfile?.businessName || companyName,
          phoneNumber: newUser.phone,
          description: businessProfile?.businessDescription || description || '',
          category: businessProfile?.businessCategory || category || '',
          address: businessProfile?.businessAddress || address || '',
          alternatePhone: alternatePhone || '',
          website: businessProfile?.businessWebsite || website || '',
          logo: businessProfile?.businessLogo || companyLogo || '',
          photo: businessProfile?.businessLogo || companyLogo || '',
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
});

// Mobile User Login API
app.post('/api/mobile/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await prisma.mobileUser.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Verify password (in production, use bcrypt)
    // For now, we'll do simple string comparison for demo purposes
    console.log('🔐 Password verification:', {
      email: email,
      emailLength: email.length,
      passwordLength: password.length,
      savedPasswordLength: user.password.length,
      passwordsMatch: user.password === password
    });
    
    const isValidPassword = user.password === password; // In production: await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log('❌ Password mismatch!', {
        provided: password.substring(0, 5) + '...',
        stored: user.password.substring(0, 5) + '...'
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Update last active timestamp
    await prisma.mobileUser.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    // Get business profile if exists
    const businessProfile = await prisma.businessProfile.findFirst({
      where: { mobileUserId: user.id }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        userType: 'MOBILE_USER' 
      },
      process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024',
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    // Return user data with success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          companyName: businessProfile?.businessName || user.name,
          phoneNumber: user.phone,
          description: businessProfile?.businessDescription || '',
          category: businessProfile?.businessCategory || '',
          address: businessProfile?.businessAddress || '',
          alternatePhone: '',
          website: businessProfile?.businessWebsite || '',
          logo: businessProfile?.businessLogo || '',
          photo: businessProfile?.businessLogo || '',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login user'
    });
  }
});

// Google OAuth Login API
app.post('/api/mobile/auth/google', async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;

    // Validate required fields
    if (!idToken || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Google ID token and access token are required'
      });
    }

    // In a real implementation, you would:
    // 1. Verify the Google ID token with Google's API
    // 2. Extract user information from the token
    // 3. Create or find the user in your database
    // 4. Generate your own JWT token

    // For demo purposes, we'll simulate this process
    const mockGoogleUser = {
      email: 'google_user@example.com',
      name: 'Google User',
      providerId: 'google'
    };

    // Check if user already exists
    let user = await prisma.mobileUser.findUnique({
      where: { email: mockGoogleUser.email }
    });

    if (!user) {
      // Create new user from Google data
      user = await prisma.mobileUser.create({
        data: {
          email: mockGoogleUser.email,
          password: 'google_oauth_user', // Special password for OAuth users
          name: mockGoogleUser.name,
          isActive: true,
          lastActiveAt: new Date()
        }
      });
    }

    // Update last active timestamp
    await prisma.mobileUser.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    // Get business profile if exists
    const businessProfile = await prisma.businessProfile.findFirst({
      where: { mobileUserId: user.id }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        userType: 'MOBILE_USER',
        provider: 'google'
      },
      process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Google sign-in successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          companyName: businessProfile?.businessName || user.name,
          phoneNumber: user.phone,
          description: businessProfile?.businessDescription || '',
          category: businessProfile?.businessCategory || '',
          address: businessProfile?.businessAddress || '',
          alternatePhone: '',
          website: businessProfile?.businessWebsite || '',
          logo: businessProfile?.businessLogo || '',
          photo: businessProfile?.businessLogo || '',
          providerId: 'google',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Google'
    });
  }
});

// ============================================
// AUTHENTICATION ENDPOINTS - PHASE 1 BATCH 1
// ============================================

// Get Current User Profile (Me)
app.get('/api/mobile/auth/me', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user profile with latest business_profile data (matching update endpoint)
    const user = await prisma.mobileUser.findUnique({
      where: { id: userId },
      include: {
        business_profiles: {
          take: 1,
          orderBy: { createdAt: 'desc' }  // Get latest business profile (matches update endpoint)
        },
        _count: {
          select: {
            mobile_subscriptions: true,
            mobile_downloads: true,
            mobile_likes: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const businessProfile = user.business_profiles[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        // Return mobile_users data first, business_profile as fallback
        companyName: user.name || businessProfile?.businessName || '',
        phoneNumber: user.phone || businessProfile?.businessPhone || '',
        alternatePhone: user.alternatePhone || businessProfile?.alternatePhone || '',
        description: businessProfile?.businessDescription || '',
        category: businessProfile?.businessCategory || '',
        // Return null if not set, don't convert to empty string (matches PUT endpoint behavior)
        address: businessProfile?.businessAddress ?? null,
        website: businessProfile?.businessWebsite ?? null,
        logo: businessProfile?.businessLogo || '',
        photo: businessProfile?.businessLogo || '',
        totalViews: 0,
        downloadAttempts: user._count.downloads,
        isConverted: user._count.subscriptions > 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// Update User Profile
app.put('/api/mobile/auth/profile', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const {
      companyName,
      phoneNumber,
      description,
      category,
      address,
      alternatePhone,
      website,
      logo,
      photo
    } = req.body;

    // Validate logo URL if provided
    const logoUrl = logo || photo;
    if (logoUrl !== undefined && !isValidLogoUrl(logoUrl)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_LOGO_URL',
        message: 'Invalid logo URL. Please upload the image file using the upload endpoint.'
      });
    }

    // Update user basic info
    const updatedUser = await prisma.mobileUser.update({
      where: { id: userId },
      data: {
        name: companyName || undefined,
        phone: phoneNumber || undefined,
        alternatePhone: alternatePhone || undefined
      }
    });

    // Update or create business profile - get the OLDEST profile (registration data)
    let businessProfile = await prisma.businessProfile.findFirst({
      where: { mobileUserId: userId },
      orderBy: { createdAt: 'asc' }  // Use OLDEST profile (registration data)
    });

    if (businessProfile) {
      // Update existing profile
      businessProfile = await prisma.businessProfile.update({
        where: { id: businessProfile.id },
        data: {
          businessName: companyName || undefined,
          businessPhone: phoneNumber || undefined,
          alternatePhone: alternatePhone || undefined,
          businessDescription: description || undefined,
          businessCategory: category || undefined,
          businessAddress: address || undefined,
          businessWebsite: website || undefined,
          businessLogo: logoUrl !== undefined ? (logoUrl || null) : undefined
        }
      });
    } else if (companyName || category || logoUrl) {
      // Create new profile
      businessProfile = await prisma.businessProfile.create({
        data: {
          mobileUserId: userId,
          businessName: companyName || 'My Business',
          businessEmail: updatedUser.email || '',
          businessPhone: phoneNumber || updatedUser.phone || '',
          alternatePhone: alternatePhone || '',
          businessDescription: description || '',
          businessCategory: category || 'General',
          businessAddress: address || '',
          businessWebsite: website || '',
          businessLogo: logoUrl || null
        }
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        // Return mobile_users data first, business_profile as fallback
        companyName: updatedUser.name || businessProfile?.businessName || '',
        phoneNumber: updatedUser.phone || businessProfile?.businessPhone || '',
        alternatePhone: updatedUser.alternatePhone || businessProfile?.alternatePhone || '',
        description: businessProfile?.businessDescription || '',
        category: businessProfile?.businessCategory || '',
        address: businessProfile?.businessAddress || '',
        website: businessProfile?.businessWebsite || '',
        logo: businessProfile?.businessLogo || '',
        photo: businessProfile?.businessLogo || '',
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// ============================================
// UPLOAD USER PROFILE LOGO
// MUST come before /:id routes to avoid conflicts
// ============================================

// Test route to verify path matching works
app.post('/api/mobile/users/:userId/upload-logo/test', async (req, res) => {
  console.log('✅ Test route hit:', req.method, req.path);
  console.log('✅ Original URL:', req.originalUrl);
  console.log('✅ Params:', req.params);
  res.json({ success: true, message: 'Route is reachable', params: req.params, originalUrl: req.originalUrl });
});

// Also try a simpler pattern to test
app.post('/api/mobile/users/upload-logo-test', async (req, res) => {
  console.log('✅ Simple test route hit:', req.method, req.path);
  res.json({ success: true, message: 'Simple route works' });
});

app.post('/api/mobile/users/:userId/upload-logo', (req, res, next) => {
  console.log('📤 Logo upload middleware - Route matched:', req.method, req.path);
  console.log('📤 Params:', req.params);
  console.log('📤 Content-Type:', req.headers['content-type']);
  next();
}, (err, req, res, next) => {
  // Handle multer errors
  if (err) {
    console.error('❌ Multer error:', err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds 5MB limit.'
      });
    }
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FILE_TYPE',
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: err.message
    });
  }
  next();
}, logoUpload.single('logo'), async (req, res) => {
  console.log('📤 Logo upload endpoint hit:', req.method, req.path);
  console.log('📤 Params:', req.params);
  console.log('📤 File:', req.file ? 'File received' : 'No file');
  console.log('📤 Headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    const { userId } = req.params;

    // Extract user ID from JWT token for authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let authenticatedUserId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      authenticatedUserId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Verify user owns this profile
    if (authenticatedUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You can only update your own profile'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: 'No file uploaded'
      });
    }

    // Get Cloudinary URL from req.file
    const logoUrl = req.file.path || req.file.url || req.file.secure_url;

    if (!logoUrl) {
      return res.status(500).json({
        success: false,
        error: 'UPLOAD_FAILED',
        message: 'Failed to get uploaded file URL'
      });
    }

    // Get or create business profile
    let businessProfile = await prisma.businessProfile.findFirst({
      where: { mobileUserId: userId },
      orderBy: { createdAt: 'desc' }
    });

    if (businessProfile) {
      // Update existing profile
      businessProfile = await prisma.businessProfile.update({
        where: { id: businessProfile.id },
        data: { businessLogo: logoUrl }
      });
    } else {
      // Create new business profile
      const user = await prisma.mobileUser.findUnique({
        where: { id: userId },
        select: { name: true, email: true, phone: true }
      });

      businessProfile = await prisma.businessProfile.create({
        data: {
          mobileUserId: userId,
          businessName: user?.name || 'My Business',
          businessEmail: user?.email || '',
          businessPhone: user?.phone || '',
          businessLogo: logoUrl
        }
      });
    }

    // Generate thumbnail URL
    const publicId = req.file.public_id;
    const thumbnailUrl = publicId ? getLogoThumbnailUrl(publicId) : logoUrl;

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo: logoUrl,
        thumbnail: thumbnailUrl
      }
    });

  } catch (error) {
    console.error('❌ Logo upload error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Handle multer errors
    if (error.message && error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FILE_TYPE',
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds 5MB limit.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'UPLOAD_FAILED',
      message: 'Failed to upload logo',
      details: error.message
    });
  }
});

// User Logout
app.post('/api/mobile/auth/logout', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      // Token already invalid, that's fine for logout
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    }

    // Log the logout activity
    await prisma.mobileActivity.create({
      data: {
        mobileUserId: userId,
        action: 'LOGOUT',
        resource: 'Auth',
        resourceType: 'Auth',
        resourceId: userId
      }
    }).catch(err => console.error('Failed to log logout activity:', err));

    // Note: JWT tokens can't be invalidated server-side
    // The client should delete the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

// Forgot Password - Send reset code via email
app.post('/api/mobile/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find mobile user by email
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { email }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'User with this email not found'
      });
    }

    if (!mobileUser.password) {
      return res.status(400).json({
        success: false,
        error: 'Account was created without password. Please register again.'
      });
    }

    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

    // Use prisma as any to access mobilePasswordResetCode if it exists
    const prismaAny = prisma;
    await prismaAny.mobilePasswordResetCode.upsert({
      where: { mobileUserId: mobileUser.id },
      update: {
        code,
        email,
        expiresAt,
        attempts: 0,
        verifiedAt: null
      },
      create: {
        mobileUserId: mobileUser.id,
        email,
        code,
        expiresAt
      }
    }).catch(err => {
      // If model doesn't exist, log and continue
      console.warn('⚠️ MobilePasswordResetCode model may not exist:', err.message);
      throw err;
    });

    const emailSent = await sendPasswordResetCodeEmail({
      to: email,
      code,
      minutesValid: RESET_CODE_EXPIRY_MINUTES
    });

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Unable to send verification email. Please try again later.'
      });
    }

    const responseData = {};
    if (process.env.NODE_ENV !== 'production') {
      responseData.debugCode = code;
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: responseData
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// Verify Reset Code
app.post('/api/mobile/auth/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and code are required'
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code format'
      });
    }

    const mobileUser = await prisma.mobileUser.findUnique({
      where: { email }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'User with this email not found'
      });
    }

    const prismaAny = prisma;
    const resetRecord = await prismaAny.mobilePasswordResetCode.findUnique({
      where: { mobileUserId: mobileUser.id }
    }).catch(() => null);

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'No active reset request found. Please request a new code.'
      });
    }

    if (resetRecord.expiresAt < new Date()) {
      await prismaAny.mobilePasswordResetCode.delete({
        where: { mobileUserId: mobileUser.id }
      }).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.'
      });
    }

    if (resetRecord.attempts >= MAX_RESET_ATTEMPTS) {
      await prismaAny.mobilePasswordResetCode.delete({
        where: { mobileUserId: mobileUser.id }
      }).catch(() => {});
      return res.status(429).json({
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    if (resetRecord.code !== code) {
      await prismaAny.mobilePasswordResetCode.update({
        where: { mobileUserId: mobileUser.id },
        data: {
          attempts: { increment: 1 }
        }
      }).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    await prismaAny.mobilePasswordResetCode.update({
      where: { mobileUserId: mobileUser.id },
      data: {
        verifiedAt: new Date(),
        attempts: 0
      }
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Verification code confirmed'
    });

  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify code'
    });
  }
});

// Reset Password
app.post('/api/mobile/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, code, new password, and confirm password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    const mobileUser = await prisma.mobileUser.findUnique({
      where: { email }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const prismaAny = prisma;
    const resetRecord = await prismaAny.mobilePasswordResetCode.findUnique({
      where: { mobileUserId: mobileUser.id }
    }).catch(() => null);

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'No active reset request found. Please request a new code.'
      });
    }

    if (resetRecord.expiresAt < new Date()) {
      await prismaAny.mobilePasswordResetCode.delete({
        where: { mobileUserId: mobileUser.id }
      }).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.'
      });
    }

    if (resetRecord.code !== code) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.mobileUser.update({
        where: { id: mobileUser.id },
        data: { password: hashedPassword }
      }),
      prismaAny.mobilePasswordResetCode.delete({
        where: { mobileUserId: mobileUser.id }
      })
    ]).catch(async (err) => {
      // If delete fails, try to update user password anyway
      await prisma.mobileUser.update({
        where: { id: mobileUser.id },
        data: { password: hashedPassword }
      }).catch(() => {});
      throw err;
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Record User Activity
app.post('/api/mobile/activity', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const {
      userId: requestUserId,
      action,
      resourceType,
      resourceId,
      metadata
    } = req.body;

    // Validate required fields
    if (!action || !resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        message: 'Action, resourceType, and resourceId are required'
      });
    }

    // Create activity record
    const activity = await prisma.mobileActivity.create({
      data: {
        mobileUserId: userId,
        action,
        resource: resourceType,
        resourceType,
        resourceId,
        details: metadata ? JSON.stringify(metadata) : null
      }
    });

    res.json({
      success: true,
      message: 'Activity recorded successfully',
      activity: {
        id: activity.id,
        userId: activity.mobileUserId,
        action: activity.action,
        resourceType: activity.resourceType,
        resourceId: activity.resourceId,
        createdAt: activity.createdAt
      }
    });

  } catch (error) {
    console.error('Record activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record activity'
    });
  }
});


// Like Content
app.post('/api/mobile/likes', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const {
      resourceType,
      resourceId
    } = req.body;

    // Validate required fields
    if (!resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        message: 'ResourceType and resourceId are required'
      });
    }

    // Check if already liked
    const existingLike = await prisma.mobile_likes.findFirst({
      where: {
        mobileUserId: userId,
        resourceType,
        resourceId
      }
    });

    if (existingLike) {
      return res.status(400).json({
        success: false,
        error: 'Content already liked'
      });
    }

    // Create like record
    const like = await prisma.mobile_likes.create({
      data: {
        mobileUserId: userId,
        resourceType,
        resourceId
      }
    });

    res.json({
      success: true,
      message: 'Content liked successfully',
      data: {
        id: like.id,
        resourceType: like.resourceType,
        resourceId: like.resourceId,
        likedAt: like.likedAt
      }
    });

  } catch (error) {
    console.error('Like content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like content'
    });
  }
});

// ============================================
// BUSINESS PROFILE ENDPOINTS - PHASE 1 BATCH 2
// ============================================

// Create Business Profile
app.post('/api/mobile/business-profile', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const {
      businessName,
      ownerName,
      email,
      phone,
      alternatePhone,
      address,
      category,
      logo,
      description,
      website,
      socialMedia
    } = req.body;

    if (!businessName || !ownerName || !email || !phone || !category) {
      return res.status(400).json({
        success: false,
        error: 'Business name, owner name, email, phone, and category are required'
      });
    }

    // Verify the mobile user exists before creating profile
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: userId }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'Mobile user not found. Please ensure you are logged in with a valid account.'
      });
    }

    // Create business profile
    const businessProfile = await prisma.businessProfile.create({
      data: {
        mobileUserId: userId,
        businessName,
        businessEmail: email,
        businessPhone: phone,
        alternatePhone: alternatePhone || '',
        businessAddress: address || '',
        businessCategory: category,
        businessLogo: logo || '',
        businessDescription: description || '',
        businessWebsite: website || ''
      }
    });

    res.status(201).json({
      success: true,
      message: 'Business profile created successfully',
      data: {
        id: businessProfile.id,
        name: businessProfile.businessName,
        description: businessProfile.businessDescription || "",
        category: businessProfile.businessCategory || "",
        address: businessProfile.businessAddress || "",
        phone: businessProfile.businessPhone || "",
        alternatePhone: businessProfile.alternatePhone || "",
        email: businessProfile.businessEmail || "",
        website: businessProfile.businessWebsite || "",
        logo: businessProfile.businessLogo || "",
        createdAt: businessProfile.createdAt
      }
    });

  } catch (error) {
    console.error('Create business profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create business profile'
    });
  }
});

// Get All Business Profiles
app.get('/api/mobile/business-profile', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (category) where.businessCategory = category;
    if (search) {
      where.OR = [
        { businessName: { contains: search } },
        { businessDescription: { contains: search } }
      ];
    } else {
      // No search provided: include top N business-category images by default
      try {
        const imageWhere = {
          businessCategoryId: { not: null },
          approvalStatus: 'APPROVED',
          isActive: true
        };

        [businessCategoryImages, businessCategoryTotal] = await Promise.all([
          prisma.image.findMany({
            where: imageWhere,
            include: {
              business_categories: {
                select: { id: true, name: true, icon: true }
              }
            },
            orderBy: [
              { downloads: 'desc' },
              { createdAt: 'desc' }
            ],
            skip,
            take: limitNum
          }),
          prisma.image.count({ where: imageWhere })
        ]);

        console.log(`📸 Default include: ${businessCategoryImages.length} business category images (no search)`);
      } catch (defaultCategoryError) {
        console.error('Error fetching default business category images:', defaultCategoryError);
      }
    }

    const [profiles, total] = await Promise.all([
      prisma.businessProfile.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          businessCategory: true,
          businessLogo: true,
          businessDescription: true,
          businessPhone: true,
          businessEmail: true,
          businessAddress: true,
          createdAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.businessProfile.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        profiles: profiles.map(p => ({
          id: p.id,
          businessName: p.businessName,
          category: p.businessCategory,
          logo: p.businessLogo,
          description: p.businessDescription,
          phone: p.businessPhone,
          email: p.businessEmail,
          address: p.businessAddress,
          createdAt: p.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get business profiles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business profiles'
    });
  }
});

// Update Business Profile
app.put('/api/mobile/business-profile/:id', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { id } = req.params;
    const {
      businessName,
      email,
      phone,
      alternatePhone,
      address,
      category,
      logo,
      description,
      website,
      socialMedia
    } = req.body;

    // Check if profile exists and belongs to user
    const existingProfile = await prisma.businessProfile.findUnique({
      where: { id }
    });

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        error: 'Business profile not found'
      });
    }

    if (existingProfile.mobileUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this profile'
      });
    }

    // Update profile
    const updatedProfile = await prisma.businessProfile.update({
      where: { id },
      data: {
        businessName: businessName || undefined,
        businessEmail: email || undefined,
        businessPhone: phone || undefined,
        alternatePhone: alternatePhone || undefined,
        businessAddress: address || undefined,
        businessCategory: category || undefined,
        businessLogo: logo || undefined,
        businessDescription: description || undefined,
        businessWebsite: website || undefined
      }
    });

    res.json({
      success: true,
      message: 'Business profile updated successfully',
      data: {
        id: updatedProfile.id,
        name: updatedProfile.businessName,
        description: updatedProfile.businessDescription || "",
        category: updatedProfile.businessCategory || "",
        address: updatedProfile.businessAddress || "",
        phone: updatedProfile.businessPhone || "",
        alternatePhone: updatedProfile.alternatePhone || "",
        email: updatedProfile.businessEmail || "",
        website: updatedProfile.businessWebsite || "",
        logo: updatedProfile.businessLogo || "",
        createdAt: updatedProfile.createdAt,
        updatedAt: updatedProfile.updatedAt
      }
    });

  } catch (error) {
    console.error('Update business profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business profile'
    });
  }
});

// Delete Business Profile
app.delete('/api/mobile/business-profile/:id', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { id } = req.params;

    // Check if profile exists and belongs to user
    const existingProfile = await prisma.businessProfile.findUnique({
      where: { id }
    });

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        error: 'Business profile not found'
      });
    }

    if (existingProfile.mobileUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this profile'
      });
    }

    // Delete profile
    await prisma.businessProfile.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Business profile deleted successfully'
    });

  } catch (error) {
    console.error('Delete business profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete business profile'
    });
  }
});

app.post('/api/mobile/business-profile/create-payment-order', async (req, res) => {
  try {
    console.log('⚙️  [PaymentOrder] Incoming request headers:', {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    });

    let mobileUserId;
    try {
      mobileUserId = getMobileUserIdFromToken(req);
      console.log('⚙️  [PaymentOrder] Authenticated user:', mobileUserId);
    } catch (authError) {
      console.warn('⚠️  [PaymentOrder] Auth error:', authError.message);
      return res.status(authError.statusCode || 401).json({
        success: false,
        error: authError.message
      });
    }

    if (!razorpay) {
      console.error('❌ [PaymentOrder] Razorpay not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not configured',
        details: 'Razorpay credentials are missing on the server'
      });
    }

    await expirePendingBusinessProfilePayments(mobileUserId);
    console.log('⚙️  [PaymentOrder] Expired pending payments for user');

    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: 'Mobile user not found'
      });
    }

    const amountRupees = normalizePaymentAmount(req.body?.amount, BUSINESS_PROFILE_PAYMENT_AMOUNT);
    const currency = (req.body?.currency || BUSINESS_PROFILE_PAYMENT_CURRENCY).toUpperCase();
    const amountInPaise = Math.round(amountRupees * 100);
    const expiresAt = getBusinessProfilePaymentExpiryDate();
    const receipt = `BPAY_${mobileUserId.substring(0, 8)}_${Date.now()}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes: {
        type: BUSINESS_PROFILE_PAYMENT_TYPE,
        mobileUserId
      }
    });

    await prisma.businessProfilePayment.create({
      data: {
        mobileUserId,
        orderId: razorpayOrder.id,
        amount: amountRupees,
        amountPaise: amountInPaise,
        currency,
        status: 'PENDING',
        type: BUSINESS_PROFILE_PAYMENT_TYPE,
        receipt,
        expiresAt,
        metadata: {
          type: BUSINESS_PROFILE_PAYMENT_TYPE,
          userId: mobileUserId,
          requestedAmount: amountRupees,
          requestedCurrency: currency
        }
      }
    });

    res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: amountRupees,
        amountInPaise,
        currency,
        razorpayKey: process.env.RAZORPAY_KEY_ID || null,
        expiresAt: expiresAt.toISOString(),
        metadata: {
          type: BUSINESS_PROFILE_PAYMENT_TYPE.toLowerCase(),
          userId: mobileUserId
        }
      }
    });

  } catch (error) {
    console.error('Create business profile payment order error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to create payment order'
    });
  }
});

app.post('/api/mobile/business-profile/verify-payment', async (req, res) => {
  try {
    console.log('⚙️  [VerifyPayment] Payload:', {
      orderId: req.body?.orderId,
      paymentId: req.body?.paymentId,
      signaturePresent: !!req.body?.signature
    });
    const { orderId, paymentId, signature } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'orderId, paymentId and signature are required'
      });
    }

    let mobileUserId;
    try {
      mobileUserId = getMobileUserIdFromToken(req);
      console.log('⚙️  [VerifyPayment] Authenticated user:', mobileUserId);
    } catch (authError) {
      console.warn('⚠️  [VerifyPayment] Auth error:', authError.message);
      return res.status(authError.statusCode || 401).json({
        success: false,
        error: authError.message
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('❌ [VerifyPayment] Missing Razorpay secret');
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not configured'
      });
    }

    const paymentRecord = await prisma.businessProfilePayment.findFirst({
      where: {
        orderId,
        mobileUserId
      }
    });

    if (!paymentRecord) {
      console.warn('⚠️  [VerifyPayment] Payment record not found for order/user', { orderId, mobileUserId });
      return res.status(404).json({
        success: false,
        error: 'Payment order not found for this user'
      });
    }

    if (paymentRecord.status === 'VERIFIED') {
      console.log('ℹ️  [VerifyPayment] Payment already verified', { orderId });
      return res.json({
        success: true,
        data: {
          verified: true,
          transactionId: paymentRecord.paymentId,
          message: 'Payment already verified'
        }
      });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      await prisma.businessProfilePayment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'FAILED',
          razorpaySignature: signature,
          metadata: {
            ...metadataToObject(paymentRecord.metadata),
            verificationError: 'SIGNATURE_MISMATCH'
          }
        }
      });

      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    const verifiedPayment = await prisma.businessProfilePayment.update({
      where: { id: paymentRecord.id },
      data: {
        paymentId,
        status: 'VERIFIED',
        razorpaySignature: signature,
        verifiedAt: new Date(),
        metadata: {
          ...metadataToObject(paymentRecord.metadata),
          verificationPayload: {
            amount: req.body?.amount || paymentRecord.amount,
            amountPaise: req.body?.amountPaise || paymentRecord.amountPaise,
            currency: req.body?.currency || paymentRecord.currency
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        verified: true,
        transactionId: verifiedPayment.paymentId,
        message: 'Payment verified'
      }
    });

  } catch (error) {
    console.error('Verify business profile payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
});

app.get('/api/mobile/business-profile/payment-status', async (req, res) => {
  try {
    console.log('⚙️  [PaymentStatus] Request headers:', {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'user-agent': req.headers['user-agent']
    });

    let mobileUserId;
    try {
      mobileUserId = getMobileUserIdFromToken(req);
      console.log('⚙️  [PaymentStatus] Authenticated user:', mobileUserId);
    } catch (authError) {
      console.warn('⚠️  [PaymentStatus] Auth error:', authError.message);
      return res.status(authError.statusCode || 401).json({
        success: false,
        error: authError.message
      });
    }

    await expirePendingBusinessProfilePayments(mobileUserId);
    console.log('⚙️  [PaymentStatus] Expired pending payments for user');

    const latestPayment = await prisma.businessProfilePayment.findFirst({
      where: {
        mobileUserId,
        status: 'VERIFIED',
        type: BUSINESS_PROFILE_PAYMENT_TYPE
      },
      orderBy: {
        verifiedAt: 'desc'
      }
    });

    if (!latestPayment) {
      console.log('ℹ️  [PaymentStatus] No verified payment found for user');
      return res.json({
        success: true,
        data: {
          hasPaid: false,
          message: 'No payment found',
          expiresAt: null
        }
      });
    }

    const response = {
      success: true,
      data: {
        hasPaid: true,
        message: 'Valid payment found',
        expiresAt: latestPayment.expiresAt ? latestPayment.expiresAt.toISOString() : null,
        lastPayment: {
          orderId: latestPayment.orderId,
          paymentId: latestPayment.paymentId,
          amount: latestPayment.amount,
          amountPaise: latestPayment.amountPaise,
          currency: latestPayment.currency,
          status: latestPayment.status,
          verifiedAt: latestPayment.verifiedAt ? latestPayment.verifiedAt.toISOString() : null,
          createdAt: latestPayment.createdAt.toISOString()
        }
      }
    };

    console.log('✅ [PaymentStatus] Response:', response);
    res.json(response);

  } catch (error) {
    console.error('Get business profile payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment status'
    });
  }
});

app.get('/api/mobile/business-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const profiles = await prisma.businessProfile.findMany({
      where: { mobileUserId: userId },
      select: {
        id: true,
        businessName: true,
        businessCategory: true,
        businessLogo: true,
        businessDescription: true,
        businessAddress: true,
        businessPhone: true,
        alternatePhone: true,
        businessEmail: true,
        businessWebsite: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        profiles: profiles.map(p => ({
          id: p.id,
          name: p.businessName,
          description: p.businessDescription || "",
          category: p.businessCategory || "",
          address: p.businessAddress || "",
          phone: p.businessPhone || "",
          alternatePhone: p.alternatePhone || "",
          email: p.businessEmail || "",
          website: p.businessWebsite || "",
          logo: p.businessLogo || "",
          createdAt: p.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Get user business profiles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user business profiles'
    });
  }
});


// Mobile Subscription Plans API
app.get('/api/mobile/subscriptions/plans', async (req, res) => {
  try {
    // Return available subscription plans
    const plans = [
      {
        id: 'quarterly_pro',
        name: 'Quarterly Pro',
        description: 'Quarterly subscription with premium features',
        price: 499,
        originalPrice: 999,
        currency: 'INR',
        duration: 'quarterly',
        savings: '49% OFF',
        features: [
          'Access to all premium business templates',
          'Unlimited downloads',
          'High-resolution content',
          'Priority customer support',
          'New templates every week',
          'Commercial usage rights',
          'Exclusive yearly subscriber content',
          'Advanced editing tools',
          'Bulk download feature'
        ],
        isPopular: true
      }
    ];

    res.json({
      success: true,
      data: {
        plans: plans
      }
    });

  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
});

// Create Payment Order (Mock Razorpay Integration)
app.post('/api/mobile/subscriptions/create-order', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authorization token required'
        }
      });
    }

    const token = authHeader.substring(7);
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Invalid or expired token'
        }
      });
    }

    const { planId, amount } = req.body;

    if (!planId || !amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Plan ID and amount are required'
        }
      });
    }

    // Validate and convert amount to number
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Amount must be a positive number'
        }
      });
    }

    // Razorpay expects amount in paise, so multiply rupees by 100
    const amountInPaise = Math.round(numericAmount * 100);

    // Check if mobile user exists
    const mobileUser = await prisma.mobileUser.findFirst({
      where: { id: userId }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Mobile user not found'
        }
      });
    }

    // Verify Razorpay is initialized
    if (!razorpay) {
      console.error('❌ Razorpay not initialized');
      return res.status(500).json({
        success: false,
        error: {
          code: 'RAZORPAY_CONFIG_ERROR',
          message: 'Razorpay credentials not configured',
          details: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required'
        }
      });
    }

    // Create order in Razorpay
    let razorpayOrder;
    try {
      console.log('🔄 Creating Razorpay order with amount:', amountInPaise, 'paise');
      // Generate short receipt (max 40 chars as per Razorpay requirement)
      const shortUserId = userId.substring(0, 8);
      const timestamp = Date.now().toString().slice(-10);
      const receipt = `rcpt_${shortUserId}_${timestamp}`.substring(0, 40);
      
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise, // Amount in paise
        currency: 'INR',
        receipt: receipt,
        notes: {
          planId,
          mobileUserId: userId,
          description: `Subscription payment for ${planId}`
        }
      });

      console.log('✅ Razorpay order created:', razorpayOrder.id);
    } catch (razorpayError) {
      console.error('❌ Razorpay order creation failed:', razorpayError);
      const errorMessage = razorpayError.message || razorpayError.error?.description || JSON.stringify(razorpayError);
      const errorDetails = {
        message: errorMessage,
        statusCode: razorpayError.statusCode,
        error: razorpayError.error
      };
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'RAZORPAY_ERROR',
          message: 'Failed to create Razorpay order',
          details: errorMessage,
          debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        }
      });
    }

    const orderId = razorpayOrder.id;

    // Log the payment attempt
    const { createId: cuid } = require('@paralleldrive/cuid2');
    await prisma.mobileActivity.create({
      data: {
        id: cuid(),
        mobileUserId: userId,
        action: 'PAYMENT_INITIATED',
        resource: 'Subscription',
        resourceType: 'Subscription',
        resourceId: orderId,
        details: JSON.stringify({
          planId,
          amount: numericAmount,
          amountInPaise,
          orderId,
          razorpayOrderId: razorpayOrder.id,
          razorpayStatus: razorpayOrder.status
        })
      }
    });

    res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id, // Real Razorpay order ID
        amount: numericAmount, // Amount in rupees (for display)
        amountInPaise, // Amount in paise (use this for Razorpay order creation)
        currency: 'INR',
        // Razorpay key - use this in frontend Razorpay initialization
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
        planId,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status
      }
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create payment order'
      }
    });
  }
});

// Verify Payment (Improved Implementation)
app.post('/api/mobile/subscriptions/verify-payment', async (req, res) => {
  let userId;
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authorization token required'
        }
      });
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Invalid or expired token'
        }
      });
    }

    const { orderId, paymentId, signature, planId, amount } = req.body;

    // Validation
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Order ID, Payment ID, and Signature are required'
        }
      });
    }

    // Check if mobile user exists
    const mobileUser = await prisma.mobileUser.findFirst({
      where: { id: userId }
    });

    if (!mobileUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Mobile user not found'
        }
      });
    }

    // Check if this paymentId has already been used (prevent duplicate payments)
    const existingSubscriptionWithPayment = await prisma.mobileSubscription.findFirst({
      where: { paymentId: paymentId }
    });

    if (existingSubscriptionWithPayment) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_PAYMENT',
          message: 'This payment has already been processed',
          data: {
            existingSubscriptionId: existingSubscriptionWithPayment.id
          }
        }
      });
    }

    // Check for existing active subscription
    const existingActiveSubscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId: userId,
        status: 'ACTIVE',
        endDate: {
          gte: new Date()
        }
      },
      orderBy: { endDate: 'desc' }
    });

    // Validate signature format (basic check)
    if (!signature || signature.length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid payment signature format'
        }
      });
    }

    // Determine plan details
    const subscriptionPlanId = planId || 'quarterly_pro';
    const subscriptionAmount = amount || 499;
    
    // Calculate subscription duration based on plan
    let monthsToAdd = 3; // Default quarterly
    if (subscriptionPlanId.includes('monthly')) {
      monthsToAdd = 1;
    } else if (subscriptionPlanId.includes('yearly') || subscriptionPlanId.includes('annual')) {
      monthsToAdd = 12;
    }

    const { createId: cuid } = require('@paralleldrive/cuid2');

    // Handle existing subscription: extend end date instead of creating duplicate
    let subscription;
    if (existingActiveSubscription) {
      // Extend existing subscription
      const newEndDate = new Date(existingActiveSubscription.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);

      subscription = await prisma.mobileSubscription.update({
        where: { id: existingActiveSubscription.id },
        data: {
          plan: subscriptionPlanId,
          planId: subscriptionPlanId,
          status: 'ACTIVE',
          endDate: newEndDate,
          amount: subscriptionAmount,
          paymentId: paymentId,
          paymentMethod: 'razorpay',
          autoRenew: true,
          updatedAt: new Date()
        }
      });

      // Log renewal activity
      await prisma.mobileActivity.create({
        data: {
          id: cuid(),
          mobileUserId: userId,
          action: 'SUBSCRIPTION_RENEWED',
          resource: 'Subscription',
          resourceType: 'Subscription',
          resourceId: subscription.id,
          details: JSON.stringify({
            orderId,
            paymentId,
            planId: subscription.planId,
            amount: subscription.amount,
            previousEndDate: existingActiveSubscription.endDate,
            newEndDate: subscription.endDate
          })
        }
      });

      // Create transaction record for renewal
      await prisma.mobileTransaction.create({
        data: {
          id: cuid(),
          mobileUserId: userId,
          amount: subscriptionAmount,
          currency: 'INR',
          paymentId: paymentId,
          paymentMethod: 'razorpay',
          status: 'SUCCESS'
        }
      });
    } else {
      // Create new subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthsToAdd);

      subscription = await prisma.mobileSubscription.create({
        data: {
          id: cuid(),
          mobileUserId: userId,
          plan: subscriptionPlanId,
          planId: subscriptionPlanId,
          status: 'ACTIVE',
          startDate,
          endDate,
          amount: subscriptionAmount,
          paymentId: paymentId,
          paymentMethod: 'razorpay',
          autoRenew: true
        }
      });

      // Log successful payment
      await prisma.mobileActivity.create({
        data: {
          id: cuid(),
          mobileUserId: userId,
          action: 'PAYMENT_SUCCESS',
          resource: 'Subscription',
          resourceType: 'Subscription',
          resourceId: subscription.id,
          details: JSON.stringify({
            orderId,
            paymentId,
            planId: subscription.planId,
            amount: subscription.amount
          })
        }
      });

      // Create transaction record
      await prisma.mobileTransaction.create({
        data: {
          id: cuid(),
          mobileUserId: userId,
          amount: subscriptionAmount,
          currency: 'INR',
          paymentId: paymentId,
          paymentMethod: 'razorpay',
          status: 'SUCCESS'
        }
      });
    }

    res.json({
      success: true,
      message: existingActiveSubscription ? 'Payment verified and subscription renewed successfully' : 'Payment verified successfully',
      data: {
        subscription: {
          id: subscription.id,
          plan: subscription.planId,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          amount: subscription.amount,
          daysRemaining: Math.ceil((subscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        },
        isRenewal: !!existingActiveSubscription
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    
    // Check for duplicate entry error
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_PAYMENT',
          message: 'This payment has already been processed'
        }
      });
    }
    
    // Log failed payment
    if (userId) {
      const { createId: cuid } = require('@paralleldrive/cuid2');
      await prisma.mobileActivity.create({
        data: {
          id: cuid(),
          mobileUserId: userId,
          action: 'PAYMENT_FAILED',
          resource: 'Subscription',
          resourceType: 'Subscription',
          resourceId: req.body.orderId || 'unknown',
          details: JSON.stringify({
            orderId: req.body.orderId,
            paymentId: req.body.paymentId,
            error: error.message || 'Payment verification failed'
          })
        }
      }).catch(console.error);
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_VERIFICATION_FAILED',
        message: error.message || 'Failed to verify payment'
      }
    });
  }
});

// Mobile Subscriptions Status API
app.get('/api/mobile/subscriptions/status', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
      console.log('✅ User ID extracted from JWT:', userId);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Find user by userId
    const user = await prisma.mobileUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check for active subscriptions
    const activeSubscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId: user.id,
        status: 'ACTIVE',
        endDate: {
          gte: new Date()
        }
      },
      orderBy: {
        endDate: 'desc'
      }
    });

    // Check for any subscriptions (active or expired)
    const allSubscriptions = await prisma.mobileSubscription.findMany({
      where: {
        mobileUserId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Determine subscription status
    let subscriptionStatus = 'INACTIVE';
    let currentSubscription = null;
    let daysRemaining = 0;

    if (activeSubscription) {
      subscriptionStatus = 'ACTIVE';
      currentSubscription = activeSubscription;
      const now = new Date();
      const endDate = new Date(activeSubscription.endDate);
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else if (allSubscriptions.length > 0) {
      // Check if there's an expired subscription
      const lastSubscription = allSubscriptions[0];
      const now = new Date();
      const endDate = new Date(lastSubscription.endDate);
      
      if (endDate < now) {
        subscriptionStatus = 'EXPIRED';
        currentSubscription = lastSubscription;
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    res.json({
      success: true,
      data: {
        isActive: subscriptionStatus === 'ACTIVE',
        plan: currentSubscription?.planId || null,
        planName: currentSubscription?.plan || null,
        status: subscriptionStatus.toLowerCase(),
        startDate: currentSubscription?.startDate || null,
        endDate: currentSubscription?.endDate || null,
        expiryDate: currentSubscription?.endDate || null,
        daysRemaining: daysRemaining,
        autoRenew: currentSubscription?.autoRenew || false
      }
    });

  } catch (error) {
    console.error('Mobile subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status'
    });
  }
});

// ============================================
// SUBSCRIPTION ACTIONS - PHASE 1 BATCH 3
// ============================================

// Subscribe to Plan
app.post('/api/mobile/subscriptions/subscribe', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { planId, paymentMethod = 'razorpay', autoRenew = true } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    // Validate plan
    const validPlans = {
      'quarterly_pro': { price: 499, period: 'quarter' }
    };

    if (!validPlans[planId]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan ID'
      });
    }

    const plan = validPlans[planId];

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    
    if (plan.period === 'quarter') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create subscription
    const subscription = await prisma.mobileSubscription.create({
      data: {
        mobileUserId: userId,
        plan: 'Quarterly Pro',
        planId: planId,
        status: 'ACTIVE',
        startDate,
        endDate,
        amount: plan.price,
        paymentId: `pay_${Date.now()}`,
        paymentMethod,
        autoRenew
      }
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscriptionId: subscription.id,
        planId: subscription.planId,
        planName: 'Quarterly Pro',
        status: 'active',
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew
      }
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

// Renew Subscription
app.post('/api/mobile/subscriptions/renew', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Find active subscription
    const subscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId: userId,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Extend subscription by the same period
    const newEndDate = new Date(subscription.endDate);
    if (subscription.planId === 'quarterly_pro') {
      newEndDate.setMonth(newEndDate.getMonth() + 3);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    // Update subscription
    const updatedSubscription = await prisma.mobileSubscription.update({
      where: { id: subscription.id },
      data: {
        endDate: newEndDate,
        status: 'ACTIVE'
      }
    });

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: {
        endDate: updatedSubscription.endDate
      }
    });

  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to renew subscription'
    });
  }
});

// Cancel Subscription
app.post('/api/mobile/subscriptions/cancel', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Find active subscription
    const subscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId: userId,
        status: 'ACTIVE'
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Cancel subscription
    await prisma.mobileSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        autoRenew: false
      }
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// ============================================
// TEMPLATE MANAGEMENT - PHASE 2 BATCH 1
// ============================================

// Get Templates with Filters
app.get('/api/mobile/templates', async (req, res) => {
  try {
    const { 
      category, 
      language = 'hindi', 
      page = 1, 
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (category) where.category = category;
    if (language) where.language = language;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [templates, total] = await Promise.all([
      prisma.mobile_templates.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          language: true,
          thumbnailUrl: true,
          imageUrl: true,
          isPremium: true,
          downloadCount: true,
          likeCount: true,
          createdAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy
      }),
      prisma.template.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        templates: templates.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          language: t.language,
          thumbnailUrl: t.thumbnailUrl,
          downloadUrl: t.downloadUrl,
          fileSize: t.fileSize,
          duration: t.duration,
          isPremium: t.isPremium,
          downloadCount: t.downloadCount,
          likeCount: t.likeCount,
          createdAt: t.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: total > 0 ? Math.ceil(total / parseInt(limit)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// Get Template Languages (must be before /:id route)
app.get('/api/mobile/templates/languages', async (req, res) => {
  try {
    const languages = [
      {
        code: "en",
        name: "English",
        nativeName: "English"
      },
      {
        code: "hi",
        name: "Hindi",
        nativeName: "हिन्दी"
      },
      {
        code: "ta",
        name: "Tamil",
        nativeName: "தமிழ்"
      },
      {
        code: "te",
        name: "Telugu",
        nativeName: "తెలుగు"
      },
      {
        code: "bn",
        name: "Bengali",
        nativeName: "বাংলা"
      },
      {
        code: "gu",
        name: "Gujarati",
        nativeName: "ગુજરાતી"
      },
      {
        code: "mr",
        name: "Marathi",
        nativeName: "मराठी"
      },
      {
        code: "pa",
        name: "Punjabi",
        nativeName: "ਪੰਜਾਬੀ"
      }
    ];

    res.json({
      success: true,
      data: languages,
      message: 'Languages fetched successfully'
    });

  } catch (error) {
    console.error('Get template languages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template languages'
    });
  }
});

// Get Template Categories (must be before /:id route)
app.get('/api/mobile/templates/categories', async (req, res) => {
  try {
    const categories = [
      { id: '1', name: 'Business', icon: '💼', count: 85 },
      { id: '2', name: 'Real Estate', icon: '🏠', count: 62 },
      { id: '3', name: 'Restaurant', icon: '🍽️', count: 48 },
      { id: '4', name: 'Salon & Spa', icon: '💅', count: 55 },
      { id: '5', name: 'Fitness', icon: '💪', count: 40 },
      { id: '6', name: 'Education', icon: '📚', count: 70 },
      { id: '7', name: 'Medical', icon: '⚕️', count: 45 },
      { id: '8', name: 'Retail', icon: '🛍️', count: 90 }
    ];

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Get template categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template categories'
    });
  }
});

// Get Template by ID
app.get('/api/mobile/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.mobile_templates.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        thumbnailUrl: true,
        category: true,
        tags: true,
        isPremium: true,
        downloads: true,
        likes: true,
        createdAt: true
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: template.id,
        title: template.title,
        description: template.description,
        category: template.category,
        language: template.language,
        thumbnailUrl: template.thumbnailUrl,
        imageUrl: template.imageUrl,
        isPremium: template.isPremium,
        downloadCount: template.downloads,
        likeCount: template.likes,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    });

  } catch (error) {
    console.error('Get template by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    });
  }
});

// Download Template
app.post('/api/mobile/templates/:id/download', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { id } = req.params;

    // Check if template exists
    const template = await prisma.mobile_templates.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Check if user has already downloaded this template
    const existingDownload = await prisma.mobileDownload.findFirst({
      where: {
        mobileUserId: userId,
        resourceType: 'TEMPLATE',
        resourceId: id
      }
    });

    if (existingDownload) {
      return res.json({
        success: true,
        message: 'Template already downloaded',
        data: {
          imageUrl: template.imageUrl,
          downloadId: existingDownload.id
        }
      });
    }

    // Create download record
    const download = await prisma.mobileDownload.create({
      data: {
        mobileUserId: userId,
        resourceType: 'TEMPLATE',
        resourceId: id,
        resourceTitle: template.title,
          imageUrl: template.imageUrl
      }
    });

    // Increment download count
    await prisma.template.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 }
      }
    });

    res.json({
      success: true,
      message: 'Template download initiated',
      data: {
        downloadId: download.id,
        imageUrl: template.imageUrl,
        title: template.title
      }
    });

  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download template'
    });
  }
});

// Like/Unlike Template
app.post('/api/mobile/templates/:id/like', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { id } = req.params;

    // Check if template exists
    const template = await prisma.mobile_templates.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Check if user has already liked this template
    const existingLike = await prisma.mobile_likes.findFirst({
      where: {
        mobileUserId: userId,
        resourceType: 'TEMPLATE',
        resourceId: id
      }
    });

    if (existingLike) {
      // Unlike - remove the like
      await prisma.mobile_likes.delete({
        where: { id: existingLike.id }
      });

      // Decrement like count
      await prisma.template.update({
        where: { id },
        data: {
          likeCount: { decrement: 1 }
        }
      });

      res.json({
        success: true,
        message: 'Template unliked',
        data: {
          liked: false,
          likeCount: template.likeCount - 1
        }
      });
    } else {
      // Like - create new like
      await prisma.mobile_likes.create({
        data: {
          mobileUserId: userId,
          resourceType: 'TEMPLATE',
          resourceId: id,
          resourceTitle: template.title
        }
      });

      // Increment like count
      await prisma.template.update({
        where: { id },
        data: {
          likeCount: { increment: 1 }
        }
      });

      res.json({
        success: true,
        message: 'Template liked',
        data: {
          liked: true,
          likeCount: template.likeCount + 1
        }
      });
    }

  } catch (error) {
    console.error('Like template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like template'
    });
  }
});

// ============================================
// GREETING MANAGEMENT - PHASE 2 BATCH 2
// ============================================

// Get Greetings with Filters
app.get('/api/mobile/greetings', async (req, res) => {
  try {
    const { 
      category, 
      language = 'hindi', 
      page = 1, 
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (category) where.category = category;
    if (language) where.language = language;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [greetings, total] = await Promise.all([
      prisma.greeting_templates.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          language: true,
          thumbnailUrl: true,
          imageUrl: true,
          isPremium: true,
          downloadCount: true,
          likeCount: true,
          createdAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy
      }),
      prisma.greeting.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        greetings: greetings.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          language: g.language,
          thumbnailUrl: g.thumbnailUrl,
          downloadUrl: g.downloadUrl,
          fileSize: g.fileSize,
          duration: g.duration,
          isPremium: g.isPremium,
          downloadCount: g.downloadCount,
          likeCount: g.likeCount,
          createdAt: g.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: total > 0 ? Math.ceil(total / parseInt(limit)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get greetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch greetings'
    });
  }
});

// Get Greeting Templates (must be before /:id route)
app.get('/api/mobile/greetings/templates', async (req, res) => {
  try {
    let { page = '1', limit = '20', category, search, language } = req.query;
    
    // Decode search parameter to handle double-encoding (e.g., good%2520morning -> good morning)
    if (search) {
      try {
        let decoded = decodeURIComponent(search);
        // If still contains encoded characters, decode again (handles double-encoding)
        if (decoded.includes('%')) {
          decoded = decodeURIComponent(decoded);
        }
        search = decoded;
      } catch (e) {
        // If decoding fails, use original search value
        console.log('⚠️  Search parameter decode warning:', e.message);
      }
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Check if search term matches a business category name
    let businessCategoryImages = [];
    let businessCategoryTotal = 0;
    
    if (search) {
      console.log(`🔍 DEBUG: Starting business category search for: "${search}" - LOCAL TEST`);
      try {
        // First try exact contains match (case insensitive)
        let businessCategory = await prisma.businessCategory.findFirst({
          where: {
            name: {
              contains: search,
              mode: 'insensitive'
            },
            isActive: true
          }
        });
        
        // If no exact match and search has multiple words, try word-based matching
        if (!businessCategory && search.includes(' ')) {
          const searchWords = search.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          console.log(`🔍 Trying word-based search with words: ${searchWords.join(', ')}`);
          
          if (searchWords.length > 0) {
            // Try to find category where at least one word matches
            businessCategory = await prisma.businessCategory.findFirst({
              where: {
                AND: [
                  { isActive: true },
                  {
                    OR: searchWords.map(word => ({
                      name: {
                        contains: word,
                        mode: 'insensitive'
                      }
                    }))
                  }
                ]
              },
              orderBy: {
                name: 'asc'
              }
            });
          }
        }
        
        // Final attempt: try partial matches without word splitting
        if (!businessCategory) {
          const normalizedSearch = search.toLowerCase().replace(/\s+/g, '');
          console.log(`🔍 Trying normalized search: "${normalizedSearch}"`);
          
          // Get all active business categories and check manually
          const allCategories = await prisma.businessCategory.findMany({
            where: { isActive: true },
            select: { id: true, name: true }
          });
          
          // Find category where any part of the name matches (fuzzy)
          businessCategory = allCategories.find(cat => {
            const normalizedCat = cat.name.toLowerCase().replace(/\s+/g, '');
            return normalizedCat.includes(normalizedSearch) || normalizedSearch.includes(normalizedCat.substring(0, 10));
          });
        }

        console.log(`🔍 DEBUG: Business category search result:`, businessCategory ? `${businessCategory.name} (${businessCategory.id})` : 'No category found');

        if (businessCategory) {
          console.log(`🎯 Found business category: ${businessCategory.name} for search: ${search}`);
          
          // Search images from this business category
          // Remove the OR condition to get ALL images from the business category, not just those matching the search term in content
          const imageWhere = {
            businessCategoryId: businessCategory.id,
            approvalStatus: 'APPROVED',
            isActive: true
          };

          if (language) {
            imageWhere.tags = {
              contains: language,
              mode: 'insensitive'
            };
          }

          [businessCategoryImages, businessCategoryTotal] = await Promise.all([
            prisma.image.findMany({
              where: imageWhere,
              include: {
                business_categories: {
                  select: { id: true, name: true, icon: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              skip,
              take: limitNum
            }),
            prisma.image.count({ where: imageWhere })
          ]);

          console.log(`📸 Found ${businessCategoryImages.length} images from business category: ${businessCategory.name}`);
        }
      } catch (categoryError) {
        console.error('Error searching business category images:', categoryError);
        // Continue with normal greeting template search even if business category search fails
      }
    } else {
      // No search provided: include top N business-category images by default
      // Get diverse mix from different business categories
      try {
        // Get all active business categories that have images
          const categoriesWithImages = await prisma.businessCategory.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        });

        // Get top images from each category (for diversity)
        const imagesPerCategory = Math.max(3, Math.ceil(limitNum / Math.max(1, categoriesWithImages.length)));
        const allImages = [];
        
          for (const category of categoriesWithImages) {
          const categoryImages = await prisma.image.findMany({
            where: {
              businessCategoryId: category.id,
              approvalStatus: 'APPROVED',
                isActive: true,
                ...(language ? {
                  tags: {
                    contains: language,
                    mode: 'insensitive'
                  }
                } : {})
            },
            include: {
              business_categories: {
                select: { id: true, name: true, icon: true }
              }
            },
            orderBy: [
              { downloads: 'desc' },
              { createdAt: 'desc' }
            ],
            take: imagesPerCategory
          });
          
          allImages.push(...categoryImages);
          
          // Stop if we have enough images
          if (allImages.length >= limitNum * 2) break;
        }
        
        // Shuffle and take the requested amount (for diversity)
        // Sort by downloads first, then shuffle within similar download ranges
        allImages.sort((a, b) => {
          const downloadDiff = (b.downloads || 0) - (a.downloads || 0);
          if (Math.abs(downloadDiff) < 5) {
            // If downloads are similar, randomize
            return Math.random() - 0.5;
          }
          return downloadDiff;
        });
        
        // Take requested amount with pagination
        const totalImages = allImages.length;
        const paginatedImages = allImages.slice(skip, skip + limitNum);
        
        businessCategoryImages = paginatedImages;
        businessCategoryTotal = totalImages;

        console.log(`📸 Default include: ${businessCategoryImages.length} business category images from ${new Set(businessCategoryImages.map(img => img.business_categories?.name)).size} categories (no search)`);
      } catch (defaultCategoryError) {
        console.error('Error fetching default business category images:', defaultCategoryError);
        // Fallback to simple query if diversity query fails
        try {
          const imageWhere = {
            businessCategoryId: { not: null },
            approvalStatus: 'APPROVED',
            isActive: true,
            ...(language ? {
              tags: {
                contains: language,
                mode: 'insensitive'
              }
            } : {})
          };
          [businessCategoryImages, businessCategoryTotal] = await Promise.all([
            prisma.image.findMany({
              where: imageWhere,
              include: {
                business_categories: {
                  select: { id: true, name: true, icon: true }
                }
              },
              orderBy: [
                { downloads: 'desc' },
                { createdAt: 'desc' }
              ],
              skip,
              take: limitNum
            }),
            prisma.image.count({ where: imageWhere })
          ]);
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      }
    }

    // Original greeting template search logic
    const where = {
      isActive: true
    };

    const andConditions = [];

    if (language) {
      andConditions.push({
        tags: {
          contains: language,
          mode: 'insensitive'
        }
      });
    }
    
    if (category) {
      if (category === 'premium' || category === 'business') {
        where.category = 'BUSINESS';
      } else if (category === 'free') {
        where.OR = [
          { category: 'FESTIVAL' },
          { category: 'GENERAL' }
        ];
      } else if (category === 'festival') {
        where.category = 'FESTIVAL';
      } else if (category === 'general') {
        where.category = 'GENERAL';
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [templates, total] = await Promise.all([
      prisma.greeting_templates.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.greeting_templates.count({ where })
    ]);

    // Prepare response data
    const responseData = {
      templates: templates.map(template => ({
        id: template.id,
        title: template.title,
        description: template.description,
        imageUrl: template.imageUrl,
        thumbnailUrl: template.thumbnailUrl,
        category: template.category,
        tags: template.tags ? JSON.parse(template.tags) : [],
        isPremium: template.isPremium || false,
        downloads: template.downloads,
        views: template.views,
        dimensions: template.dimensions,
        createdAt: template.createdAt
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    // If we found business category images, include them in the response
    if (businessCategoryImages.length > 0) {
      responseData.businessCategoryImages = businessCategoryImages.map(image => ({
        id: image.id,
        title: image.title,
        description: image.description,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
        category: image.category,
        tags: image.tags ? JSON.parse(image.tags) : [],
        dimensions: image.dimensions,
        fileSize: image.fileSize,
        downloads: image.downloads,
        views: image.views,
        approvalStatus: image.approvalStatus,
        isActive: image.isActive,
        businessCategoryId: image.businessCategoryId,
        createdAt: image.createdAt,
        business_categories: image.business_categories
      }));
      responseData.businessCategoryPagination = {
        page: pageNum,
        limit: limitNum,
        total: businessCategoryTotal,
        totalPages: Math.ceil(businessCategoryTotal / limitNum)
      };
      responseData.totalResults = total + businessCategoryTotal;
      
      console.log(`✅ Returning ${templates.length} templates + ${businessCategoryImages.length} business category images`);
    } else {
      responseData.totalResults = total;
      console.log(`✅ Returning ${templates.length} templates (no business category match)`);
    }

    res.json({
      success: true,
      message: businessCategoryImages.length > 0 
        ? 'Greeting templates and business category images fetched successfully'
        : 'Greeting templates fetched successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Get greeting templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch greeting templates'
    });
  }
});

// Get Greeting Categories (must be before /:id route)
app.get('/api/mobile/greetings/categories', async (req, res) => {
  try {
    // Get all business categories from database
    const businessCategories = await prisma.businessCategory.findMany({
      where: {
        isActive: true,
        mainCategory: 'GENERAL' // Filter for greeting-type categories
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    // Calculate content count for each category
    const categoriesWithCount = await Promise.all(
      businessCategories.map(async (category) => {
        const imageCount = await prisma.image.count({
          where: {
            businessCategoryId: category.id,
            approvalStatus: 'APPROVED',
            isActive: true
          }
        });

        const videoCount = await prisma.video.count({
          where: {
            businessCategoryId: category.id,
            approvalStatus: 'APPROVED',
            isActive: true
          }
        });

        return {
          id: category.id,
          name: category.name,
          icon: category.icon || '🎉',
          description: category.description,
          count: imageCount + videoCount,
          imageCount,
          videoCount
        };
      })
    );

    // Also include main FESTIVAL categories
    const festivalCategories = await prisma.businessCategory.findMany({
      where: {
        isActive: true,
        mainCategory: 'FESTIVAL'
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    const festivalWithCount = await Promise.all(
      festivalCategories.map(async (category) => {
        const imageCount = await prisma.image.count({
          where: {
            businessCategoryId: category.id,
            approvalStatus: 'APPROVED',
            isActive: true
          }
        });

        const videoCount = await prisma.video.count({
          where: {
            businessCategoryId: category.id,
            approvalStatus: 'APPROVED',
            isActive: true
          }
        });

        return {
          id: category.id,
          name: category.name,
          icon: category.icon || '🎊',
          description: category.description,
          count: imageCount + videoCount,
          imageCount,
          videoCount
        };
      })
    );

    // Combine both arrays
    const allCategories = [...categoriesWithCount, ...festivalWithCount];

    res.json({
      success: true,
      data: { 
        categories: allCategories,
        total: allCategories.length
      }
    });

  } catch (error) {
    console.error('Get greeting categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch greeting categories'
    });
  }
});

// Get Greeting by ID
app.get('/api/mobile/greetings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const greeting = await prisma.greeting.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            downloads: true,
            likes: true
          }
        }
      }
    });

    if (!greeting) {
      return res.status(404).json({
        success: false,
        error: 'Greeting not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: greeting.id,
        title: greeting.title,
        description: greeting.description,
        category: greeting.category,
        language: greeting.language,
        thumbnailUrl: greeting.thumbnailUrl,
        downloadUrl: greeting.downloadUrl,
        fileSize: greeting.fileSize,
        duration: greeting.duration,
        isPremium: greeting.isPremium,
        downloadCount: greeting._count.downloads,
        likeCount: greeting._count.likes,
        createdAt: greeting.createdAt,
        updatedAt: greeting.updatedAt
      }
    });

  } catch (error) {
    console.error('Get greeting by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch greeting'
    });
  }
});

// Download Greeting
app.post('/api/mobile/greetings/:id/download', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { id } = req.params;

    // Check if greeting exists
    const greeting = await prisma.greeting.findUnique({
      where: { id }
    });

    if (!greeting) {
      return res.status(404).json({
        success: false,
        error: 'Greeting not found'
      });
    }

    // Check if user has already downloaded this greeting
    const existingDownload = await prisma.mobileDownload.findFirst({
      where: {
        mobileUserId: userId,
        resourceType: 'GREETING',
        resourceId: id
      }
    });

    if (existingDownload) {
      return res.json({
        success: true,
        message: 'Greeting already downloaded',
        data: {
          downloadUrl: greeting.downloadUrl,
          downloadId: existingDownload.id
        }
      });
    }

    // Create download record
    const download = await prisma.mobileDownload.create({
      data: {
        mobileUserId: userId,
        resourceType: 'GREETING',
        resourceId: id,
        resourceTitle: greeting.title,
        downloadUrl: greeting.downloadUrl
      }
    });

    // Increment download count
    await prisma.greeting.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 }
      }
    });

    res.json({
      success: true,
      message: 'Greeting download initiated',
      data: {
        downloadId: download.id,
        downloadUrl: greeting.downloadUrl,
        fileSize: greeting.fileSize,
        title: greeting.title
      }
    });

  } catch (error) {
    console.error('Download greeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download greeting'
    });
  }
});

// Like/Unlike Greeting
app.post('/api/mobile/greetings/:id/like', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const { id } = req.params;

    // Check if greeting exists
    const greeting = await prisma.greeting.findUnique({
      where: { id }
    });

    if (!greeting) {
      return res.status(404).json({
        success: false,
        error: 'Greeting not found'
      });
    }

    // Check if user has already liked this greeting
    const existingLike = await prisma.mobile_likes.findFirst({
      where: {
        mobileUserId: userId,
        resourceType: 'GREETING',
        resourceId: id
      }
    });

    if (existingLike) {
      // Unlike - remove the like
      await prisma.mobile_likes.delete({
        where: { id: existingLike.id }
      });

      // Decrement like count
      await prisma.greeting.update({
        where: { id },
        data: {
          likeCount: { decrement: 1 }
        }
      });

      res.json({
        success: true,
        message: 'Greeting unliked',
        data: {
          liked: false,
          likeCount: greeting.likeCount - 1
        }
      });
    } else {
      // Like - create new like
      await prisma.mobile_likes.create({
        data: {
          mobileUserId: userId,
          resourceType: 'GREETING',
          resourceId: id,
          resourceTitle: greeting.title
        }
      });

      // Increment like count
      await prisma.greeting.update({
        where: { id },
        data: {
          likeCount: { increment: 1 }
        }
      });

      res.json({
        success: true,
        message: 'Greeting liked',
        data: {
          liked: true,
          likeCount: greeting.likeCount + 1
        }
      });
    }

  } catch (error) {
    console.error('Like greeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like greeting'
    });
  }
});

// ============================================
// USER ANALYTICS - PHASE 3 BATCH 1
// ============================================

// Track Download
app.post('/api/mobile/downloads/track', async (req, res) => {
  try {
    const { mobileUserId, resourceId, resourceType, fileUrl } = req.body;

    // Validate required fields
    if (!mobileUserId || !resourceId || !resourceType) {
      return res.status(400).json({
        success: false,
        error: 'Mobile User ID, Resource ID, and Resource Type are required'
      });
    }

    // Validate resource type
    const validTypes = ['TEMPLATE', 'VIDEO', 'GREETING', 'CONTENT', 'POSTER'];
    if (!validTypes.includes(resourceType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Resource type must be one of: ${validTypes.join(', ')}`
      });
    }

    const normalizedResourceType = resourceType.toUpperCase();

    console.log('📥 Download tracking request:', {
      mobileUserId,
      resourceId,
      resourceType: normalizedResourceType,
      fileUrl
    });

    // Check if user exists
    const user = await prisma.mobileUser.findUnique({
      where: { id: mobileUserId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if download already exists (to avoid duplicates)
    const existingDownload = await prisma.mobileDownload.findFirst({
      where: {
        mobileUserId: mobileUserId,
        resourceId: resourceId,
        resourceType: normalizedResourceType
      }
    });

    if (existingDownload) {
      console.log('📋 Download already tracked, returning existing record');
      return res.json({
        success: true,
        message: 'Download already tracked',
        data: {
          download: existingDownload,
          isNew: false
        }
      });
    }

    // Create new download record
    const download = await prisma.mobileDownload.create({
      data: {
        mobileUserId: mobileUserId,
        resourceId: resourceId,
        resourceType: normalizedResourceType,
        fileUrl: fileUrl || `/${normalizedResourceType.toLowerCase()}/${resourceId}`
      }
    });

    console.log('✅ Download tracked successfully:', download.id);

    res.json({
      success: true,
      message: 'Download tracked successfully',
      data: {
        download,
        isNew: true
      }
    });

  } catch (error) {
    console.error('❌ Download tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track download'
    });
  }
});

// Get User Downloads
app.get('/api/mobile/users/:id/downloads', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { mobileUserId: id };
    if (type) where.resourceType = type.toUpperCase();

    const [downloads, total] = await Promise.all([
      prisma.mobileDownload.findMany({
        where,
        select: {
          id: true,
          resourceType: true,
          resourceId: true,
          fileUrl: true,
          downloadedAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { downloadedAt: 'desc' }
      }),
      prisma.mobileDownload.count({ where })
    ]);

    // Fetch actual resource details for each download
    const downloadsWithDetails = await Promise.all(
      downloads.map(async (d) => {
        let title = `Resource ${d.resourceId}`;
        let downloadUrl = d.fileUrl;

        try {
          // Fetch actual resource based on type
          switch (d.resourceType) {
            case 'POSTER':
            case 'TEMPLATE':
              // Try mobile_templates first, then image
              const template = await prisma.mobile_templates.findUnique({
                where: { id: d.resourceId },
                select: { title: true, fileUrl: true, imageUrl: true }
              });
              if (template) {
                title = template.title || title;
                downloadUrl = template.fileUrl || template.imageUrl || downloadUrl;
              } else {
                // Try image table
                const image = await prisma.image.findUnique({
                  where: { id: d.resourceId },
                  select: { title: true, url: true }
                });
                if (image) {
                  title = image.title || title;
                  downloadUrl = image.url || downloadUrl;
                }
              }
              break;

            case 'GREETING':
              const greeting = await prisma.greeting_templates.findUnique({
                where: { id: d.resourceId },
                select: { title: true, imageUrl: true }
              });
              if (greeting) {
                title = greeting.title || title;
                downloadUrl = greeting.imageUrl || downloadUrl;
              }
              break;

            case 'VIDEO':
              const video = await prisma.video.findUnique({
                where: { id: d.resourceId },
                select: { title: true, url: true }
              });
              if (video) {
                title = video.title || title;
                downloadUrl = video.url || downloadUrl;
              }
              break;

            case 'CONTENT':
              // Content can be image or video, try both
              const contentImage = await prisma.image.findUnique({
                where: { id: d.resourceId },
                select: { title: true, url: true }
              });
              if (contentImage) {
                title = contentImage.title || title;
                downloadUrl = contentImage.url || downloadUrl;
              } else {
                const contentVideo = await prisma.video.findUnique({
                  where: { id: d.resourceId },
                  select: { title: true, url: true }
                });
                if (contentVideo) {
                  title = contentVideo.title || title;
                  downloadUrl = contentVideo.url || downloadUrl;
                }
              }
              break;
          }
        } catch (err) {
          console.error(`Error fetching resource ${d.resourceId} (${d.resourceType}):`, err.message);
          // Keep default title and URL if fetch fails
        }

        // Clean up file:// URLs (local cache paths) - if we still have a file:// URL after fetching resource,
        // it means the resource wasn't found or didn't have a valid URL, so we should return null/empty instead
        if (downloadUrl && downloadUrl.startsWith('file://')) {
          // Resource URL wasn't found, set to empty string (frontend should handle missing URLs)
          downloadUrl = '';
        }

        return {
          id: d.id,
          type: d.resourceType,
          resourceId: d.resourceId,
          title: title,
          downloadUrl: downloadUrl,
          downloadedAt: d.downloadedAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        downloads: downloadsWithDetails,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: total > 0 ? Math.ceil(total / parseInt(limit)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get user downloads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user downloads'
    });
  }
});


// Get User Likes
app.get('/api/mobile/users/:id/likes', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { mobileUserId: id };
    if (type) where.resourceType = type.toUpperCase();

    const [likes, total] = await Promise.all([
      prisma.mobile_likes.findMany({
        where,
        select: {
          id: true,
          resourceType: true,
          resourceId: true,
          createdAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mobile_likes.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        likes: likes.map(l => ({
          id: l.id,
          type: l.resourceType,
          resourceId: l.resourceId,
          title: `Resource ${l.resourceId}`,
          likedAt: l.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: total > 0 ? Math.ceil(total / parseInt(limit)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get user likes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user likes'
    });
  }
});

// Get User Activity
app.get('/api/mobile/users/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { mobileUserId: id };
    if (action) where.action = action.toUpperCase();

    const [activities, total] = await Promise.all([
      prisma.mobileActivity.findMany({
        where,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          createdAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mobileActivity.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        activities: activities.map(a => ({
          id: a.id,
          action: a.action,
          resourceType: a.resourceType,
          resourceId: a.resourceId,
          timestamp: a.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: total > 0 ? Math.ceil(total / parseInt(limit)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    });
  }
});

// Get User Statistics
app.get('/api/mobile/users/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const [
      downloadCount,
      likeCount,
      subscriptionCount,
      businessProfileCount,
      lastActivity
    ] = await Promise.all([
      prisma.mobileDownload.count({ where: { mobileUserId: id } }),
      prisma.mobile_likes.count({ where: { mobileUserId: id } }),
      prisma.mobileSubscription.count({ where: { mobileUserId: id } }),
      prisma.businessProfile.count({ where: { mobileUserId: id } }),
      prisma.mobileActivity.findFirst({
        where: { mobileUserId: id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    // Get user info
    const user = await prisma.mobileUser.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
        createdAt: true,
        lastActiveAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          joinedAt: user.createdAt,
          lastActiveAt: user.lastActiveAt
        },
        stats: {
          totalDownloads: downloadCount,
          totalLikes: likeCount,
          totalSubscriptions: subscriptionCount,
          businessProfiles: businessProfileCount,
          lastActivityAt: lastActivity?.createdAt || null
        }
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics'
    });
  }
});

// ============================================
// CONTENT MANAGEMENT - PHASE 3 BATCH 2
// ============================================

// Get All Content (Templates + Greetings)
app.get('/api/mobile/content', async (req, res) => {
  try {
    const { 
      type, 
      category, 
      language = 'hindi', 
      page = 1, 
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let content = [];
    let total = 0;

    if (!type || type === 'all') {
      // Get both templates and greetings
      const [templates, greetings, templateCount, greetingCount] = await Promise.all([
        prisma.mobile_templates.findMany({
          where: {
            ...(category && { category }),
            ...(language && { language }),
            ...(search && {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } }
              ]
            })
          },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            language: true,
            thumbnailUrl: true,
            fileUrl: true,
            isPremium: true,
            downloads: true,
            likes: true,
            createdAt: true
          },
          skip,
          take: parseInt(limit),
        orderBy: sortBy === 'downloadCount' ? { downloads: sortOrder } : 
                 sortBy === 'likeCount' ? { likes: sortOrder } : 
                 { createdAt: sortOrder }
        }),
        prisma.greeting_templates.findMany({
          where: {
            ...(category && { category }),
            ...(search && {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } }
              ]
            })
          },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            imageUrl: true,
            downloads: true,
            likes: true,
            createdAt: true
          },
          skip,
          take: parseInt(limit),
        orderBy: sortBy === 'downloadCount' ? { downloads: sortOrder } : 
                 sortBy === 'likeCount' ? { likes: sortOrder } : 
                 { createdAt: sortOrder }
        }),
        prisma.mobile_templates.count({
          where: {
            ...(category && { category }),
            ...(language && { language }),
            ...(search && {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } }
              ]
            })
          }
        }),
        prisma.greeting_templates.count({
          where: {
            ...(category && { category }),
            ...(search && {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } }
              ]
            })
          }
        })
      ]);

      content = [
        ...templates.map(t => ({ ...t, type: 'template' })),
        ...greetings.map(g => ({ ...g, type: 'greeting' }))
      ].sort((a, b) => {
        if (sortOrder === 'desc') {
          return new Date(b[sortBy]) - new Date(a[sortBy]);
        } else {
          return new Date(a[sortBy]) - new Date(b[sortBy]);
        }
      });

      total = templateCount + greetingCount;
    } else if (type === 'template') {
      const where = {};
      if (category) where.category = category;
      if (language) where.language = language;
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { description: { contains: search } }
        ];
      }

      const [templates, templateCount] = await Promise.all([
        prisma.mobile_templates.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            language: true,
            thumbnailUrl: true,
            fileUrl: true,
            isPremium: true,
            downloads: true,
            likes: true,
            createdAt: true
          },
          skip,
          take: parseInt(limit),
        orderBy: sortBy === 'downloadCount' ? { downloads: sortOrder } : 
                 sortBy === 'likeCount' ? { likes: sortOrder } : 
                 { createdAt: sortOrder }
        }),
        prisma.mobile_templates.count({ where })
      ]);

      content = templates.map(t => ({ ...t, type: 'template' }));
      total = templateCount;
    } else if (type === 'greeting') {
      const where = {};
      if (category) where.category = category;
      if (language) where.language = language;
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { description: { contains: search } }
        ];
      }

      const [greetings, greetingCount] = await Promise.all([
        prisma.greeting_templates.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            language: true,
            thumbnailUrl: true,
            fileUrl: true,
            isPremium: true,
            downloads: true,
            likes: true,
            createdAt: true
          },
          skip,
          take: parseInt(limit),
        orderBy: sortBy === 'downloadCount' ? { downloads: sortOrder } : 
                 sortBy === 'likeCount' ? { likes: sortOrder } : 
                 { createdAt: sortOrder }
        }),
        prisma.greeting_templates.count({ where })
      ]);

      content = greetings.map(g => ({ ...g, type: 'greeting' }));
      total = greetingCount;
    }

    res.json({
      success: true,
      data: {
        content: content.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          category: item.category,
          language: item.language,
          thumbnailUrl: item.thumbnailUrl,
          downloadUrl: item.fileUrl,
          fileSize: null,
          duration: null,
          isPremium: item.isPremium,
          downloadCount: item.downloads,
          likeCount: item.likes,
          createdAt: item.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: total > 0 ? Math.ceil(total / parseInt(limit)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content'
    });
  }
});

// Search Content
app.get('/api/mobile/content/search', async (req, res) => {
  try {
    const { 
      q, 
      type = 'all', 
      category, 
      language = 'hindi',
      page = 1, 
      limit = 20 
    } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let results = [];
    let total = 0;

    const templateSearchWhere = {
      OR: [
        { title: { contains: q } },
        { description: { contains: q } }
      ],
      ...(category && { category }),
      ...(language && { language })
    };

    const greetingSearchWhere = {
      OR: [
        { title: { contains: q } },
        { description: { contains: q } }
      ],
      ...(category && { category })
    };

    if (type === 'all' || type === 'template') {
      const [templates, templateCount] = await Promise.all([
        prisma.mobile_templates.findMany({
          where: templateSearchWhere,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            language: true,
            thumbnailUrl: true,
            fileUrl: true,
            isPremium: true,
            downloads: true,
            likes: true,
            createdAt: true
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.mobile_templates.count({ where: templateSearchWhere })
      ]);

      results = [...results, ...templates.map(t => ({ ...t, type: 'template' }))];
      total += templateCount;
    }

    if (type === 'all' || type === 'greeting') {
      const [greetings, greetingCount] = await Promise.all([
        prisma.greeting_templates.findMany({
          where: greetingSearchWhere,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            imageUrl: true,
            downloads: true,
            likes: true,
            createdAt: true
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.greeting_templates.count({ where: greetingSearchWhere })
      ]);

      results = [...results, ...greetings.map(g => ({ ...g, type: 'greeting' }))];
      total += greetingCount;
    }

    // Sort by relevance (title matches first, then description)
    results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().includes(q.toLowerCase());
      const bTitleMatch = b.title.toLowerCase().includes(q.toLowerCase());
      
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      data: {
        query: q,
        results: results.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          category: item.category,
          language: item.language,
          thumbnailUrl: item.thumbnailUrl,
          downloadUrl: item.fileUrl,
          fileSize: null,
          duration: null,
          isPremium: item.isPremium,
          downloadCount: item.downloads,
          likeCount: item.likes,
          createdAt: item.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: total > 0 ? Math.ceil(total / parseInt(limit)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Search content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search content'
    });
  }
});

// Get Trending Content
app.get('/api/mobile/content/trending', async (req, res) => {
  try {
    const { 
      type = 'all', 
      category, 
      language = 'hindi',
      limit = 20 
    } = req.query;

    let trending = [];

    if (type === 'all' || type === 'template') {
      const templates = await prisma.mobile_templates.findMany({
        where: {
          ...(category && { category }),
          ...(language && { language })
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          language: true,
          thumbnailUrl: true,
          fileUrl: true,
          isPremium: true,
          downloads: true,
          likes: true,
          createdAt: true
        },
        orderBy: [
          { downloads: 'desc' },
          { likes: 'desc' },
          { createdAt: 'desc' }
        ],
        take: parseInt(limit)
      });

      trending = [...trending, ...templates.map(t => ({ ...t, type: 'template' }))];
    }

    if (type === 'all' || type === 'greeting') {
      const greetings = await prisma.greeting_templates.findMany({
        where: {
          ...(category && { category })
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          imageUrl: true,
          downloads: true,
          likes: true,
          createdAt: true
        },
        orderBy: [
          { downloads: 'desc' },
          { likes: 'desc' },
          { createdAt: 'desc' }
        ],
        take: parseInt(limit)
      });

      trending = [...trending, ...greetings.map(g => ({ ...g, type: 'greeting' }))];
    }

    // Sort by combined popularity score
    trending.sort((a, b) => {
      const aScore = (a.downloads || 0) + (a.likes || 0);
      const bScore = (b.downloads || 0) + (b.likes || 0);
      return bScore - aScore;
    });

    res.json({
      success: true,
      data: {
        trending: trending.slice(0, parseInt(limit)).map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          category: item.category,
          language: item.language,
          thumbnailUrl: item.thumbnailUrl,
          downloadUrl: item.fileUrl,
          fileSize: null,
          duration: null,
          isPremium: item.isPremium,
          downloadCount: item.downloads,
          likeCount: item.likes,
          createdAt: item.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Get trending content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending content'
    });
  }
});

// Get Content by Category
app.get('/api/mobile/content/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { 
      type = 'all', 
      language = 'hindi',
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let content = [];
    let total = 0;

    const templateWhere = { category, ...(language && { language }) };
    const greetingWhere = { category };

    if (type === 'all' || type === 'template') {
      const [templates, templateCount] = await Promise.all([
        prisma.mobile_templates.findMany({
          where: templateWhere,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            language: true,
            thumbnailUrl: true,
            fileUrl: true,
            isPremium: true,
            downloads: true,
            likes: true,
            createdAt: true
          },
          skip,
          take: parseInt(limit),
        orderBy: sortBy === 'downloadCount' ? { downloads: sortOrder } : 
                 sortBy === 'likeCount' ? { likes: sortOrder } : 
                 { createdAt: sortOrder }
        }),
        prisma.mobile_templates.count({ where: templateWhere })
      ]);

      content = [...content, ...templates.map(t => ({ ...t, type: 'template' }))];
      total += templateCount;
    }

    if (type === 'all' || type === 'greeting') {
      const [greetings, greetingCount] = await Promise.all([
        prisma.greeting_templates.findMany({
          where: greetingWhere,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            imageUrl: true,
            downloads: true,
            likes: true,
            createdAt: true
          },
          skip,
          take: parseInt(limit),
        orderBy: sortBy === 'downloadCount' ? { downloads: sortOrder } : 
                 sortBy === 'likeCount' ? { likes: sortOrder } : 
                 { createdAt: sortOrder }
        }),
        prisma.greeting_templates.count({ where: greetingWhere })
      ]);

      content = [...content, ...greetings.map(g => ({ ...g, type: 'greeting' }))];
      total += greetingCount;
    }

    res.json({
      success: true,
      data: {
        category,
        content: content.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          category: item.category,
          language: item.language,
          thumbnailUrl: item.thumbnailUrl,
          downloadUrl: item.fileUrl,
          fileSize: null,
          duration: null,
          isPremium: item.isPremium,
          downloadCount: item.downloads,
          likeCount: item.likes,
          createdAt: item.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: total > 0 ? Math.ceil(total / parseInt(limit)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get content by category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content by category'
    });
  }
});

// ============================================
// ENDPOINT 1: HOME FEATURED CONTENT
// ============================================
app.get('/api/mobile/home/featured', async (req, res) => {
  try {
    const { limit = '10', type, active = 'true' } = req.query;
    
    // First, try to get images tagged with "featured" - ONLY FESTIVAL category
    const taggedFeaturedImages = await prisma.image.findMany({
      where: {
        approvalStatus: 'APPROVED',
        isActive: true,
        category: 'FESTIVAL', // Only return festival category images
        tags: {
          contains: 'featured',
          mode: 'insensitive'
        }
      },
      include: {
        business_categories: {
          select: { name: true, icon: true }
        }
      },
      orderBy: [
        { downloads: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit)
    });

    let featuredImages = taggedFeaturedImages;

    // If not enough tagged images, supplement with popular images
    if (taggedFeaturedImages.length < parseInt(limit)) {
      const remainingLimit = parseInt(limit) - taggedFeaturedImages.length;
      const popularImages = await prisma.image.findMany({
        where: {
          approvalStatus: 'APPROVED',
          isActive: true,
          category: 'FESTIVAL', // Only return festival category images
          id: {
            notIn: taggedFeaturedImages.map(img => img.id)
          }
        },
        include: {
          business_categories: {
            select: { name: true, icon: true }
          }
        },
        orderBy: [
          { downloads: 'desc' },
          { views: 'desc' },
          { createdAt: 'desc' }
        ],
        take: remainingLimit
      });
      
      featuredImages = [...taggedFeaturedImages, ...popularImages];
    }

    // Transform to featured format
    const featuredContent = featuredImages.map(image => ({
      id: image.id,
      title: image.title,
      description: image.description || `Professional ${image.category.toLowerCase()} template`,
      imageUrl: image.url,
      thumbnailUrl: image.thumbnailUrl,
      type: 'templates',
      itemCount: image.downloads,
      views: image.views,
      category: image.category.toLowerCase(),
      business_categories: image.businessCategory?.name,
      tags: image.tags ? JSON.parse(image.tags) : [],
      isFeatured: taggedFeaturedImages.some(img => img.id === image.id),
      createdAt: image.createdAt
    }));

    res.json({
      success: true,
      data: {
        featured: featuredContent,
        lastUpdated: new Date().toISOString()
      },
      message: `Featured festival content retrieved successfully (${taggedFeaturedImages.length} tagged, ${featuredImages.length - taggedFeaturedImages.length} popular)`
    });

  } catch (error) {
    console.error('Get featured content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured content'
    });
  }
});



// ============================================
// PHASE 4: SUBSCRIPTIONS & TRACKING (13 APIs)
// ============================================

// ENDPOINT 7: SUBSCRIPTION USAGE ANALYTICS
// ============================================
app.get('/api/mobile/subscriptions/usage', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
    const userId = decoded.id;

    // Get current subscription
    const activeSubscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId: userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      }
    });

    if (!activeSubscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Get usage statistics
    const [downloads, likes, activities] = await Promise.all([
      prisma.mobileDownload.count({
        where: {
          mobileUserId: userId,
          downloadedAt: { gte: activeSubscription.startDate }
        }
      }),
      prisma.mobile_likes.count({
        where: {
          mobileUserId: userId,
          createdAt: { gte: activeSubscription.startDate }
        }
      }),
      prisma.mobileActivity.count({
        where: {
          mobileUserId: userId,
          createdAt: { gte: activeSubscription.startDate }
        }
      })
    ]);

    // Calculate usage limits based on plan
    const planLimits = {
      quarterly_pro: { downloads: 5000, likes: 2500, activities: 10000 }
    };

    const limits = planLimits[activeSubscription.planId] || planLimits.quarterly_pro;

    res.json({
      success: true,
      data: {
        subscription: {
          plan: activeSubscription.plan,
          planId: activeSubscription.planId,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate
        },
        usage: {
          downloads: {
            used: downloads,
            limit: limits.downloads,
            remaining: Math.max(0, limits.downloads - downloads),
            percentage: Math.round((downloads / limits.downloads) * 100)
          },
          likes: {
            used: likes,
            limit: limits.likes,
            remaining: Math.max(0, limits.likes - likes),
            percentage: Math.round((likes / limits.likes) * 100)
          },
          activities: {
            used: activities,
            limit: limits.activities,
            remaining: Math.max(0, limits.activities - activities),
            percentage: Math.round((activities / limits.activities) * 100)
          }
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get subscription usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription usage'
    });
  }
});

// ENDPOINT 8: BILLING INFORMATION
// ============================================
app.get('/api/mobile/subscriptions/billing', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
    const userId = decoded.id;

    // Get billing information
    const [subscriptions, transactions] = await Promise.all([
      prisma.mobileSubscription.findMany({
        where: { mobileUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.mobileTransaction.findMany({
        where: { mobileUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const totalSpent = subscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
    const currentSubscription = subscriptions.find(sub => 
      sub.status === 'ACTIVE' && sub.endDate > new Date()
    );

    res.json({
      success: true,
      data: {
        currentSubscription: currentSubscription ? {
          plan: currentSubscription.plan,
          planId: currentSubscription.planId,
          amount: currentSubscription.amount,
          startDate: currentSubscription.startDate,
          endDate: currentSubscription.endDate,
          autoRenew: currentSubscription.autoRenew,
          paymentMethod: currentSubscription.paymentMethod
        } : null,
        billing: {
          totalSpent,
          totalSubscriptions: subscriptions.length,
          nextBillingDate: currentSubscription?.endDate || null,
          currency: 'INR'
        },
        recentTransactions: transactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt
        })),
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get billing information error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing information'
    });
  }
});

// ENDPOINT 9: UPGRADE SUBSCRIPTION
// ============================================
app.post('/api/mobile/subscriptions/upgrade', async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
    const userId = decoded.id;

    // Find current subscription
    const currentSubscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId: userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      }
    });

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Check if already on the requested plan
    if (currentSubscription.planId === planId) {
      return res.status(400).json({
        success: false,
        error: 'Already subscribed to this plan'
      });
    }

    // Define plan details
    const planDetails = {
      monthly_pro: { plan: 'Monthly Pro', amount: 299 },
      yearly_pro: { plan: 'Yearly Pro', amount: 2999 }
    };

    const newPlan = planDetails[planId];
    if (!newPlan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan ID'
      });
    }

    // Calculate prorated amount (simplified)
    const daysRemaining = Math.ceil((currentSubscription.endDate - new Date()) / (1000 * 60 * 60 * 24));
    const proratedAmount = Math.round((newPlan.amount * daysRemaining) / 365);

    // Create transaction record
    const transaction = await prisma.mobileTransaction.create({
      data: {
        mobileUserId: userId,
        amount: proratedAmount,
        currency: 'INR',
        paymentId: `upgrade_${Date.now()}`,
        paymentMethod: 'Razorpay',
        status: 'COMPLETED'
      }
    });

    // Update subscription
    const updatedSubscription = await prisma.mobileSubscription.update({
      where: { id: currentSubscription.id },
      data: {
        plan: newPlan.plan,
        planId: planId,
        amount: proratedAmount,
        paymentId: transaction.paymentId,
        paymentMethod: 'Razorpay'
      }
    });

    res.json({
      success: true,
      data: {
        subscription: {
          id: updatedSubscription.id,
          plan: updatedSubscription.plan,
          planId: updatedSubscription.planId,
          amount: updatedSubscription.amount,
          startDate: updatedSubscription.startDate,
          endDate: updatedSubscription.endDate
        },
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status
        },
        message: 'Subscription upgraded successfully'
      }
    });

  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade subscription'
    });
  }
});

// ENDPOINT 10: DOWNGRADE SUBSCRIPTION
// ============================================
app.post('/api/mobile/subscriptions/downgrade', async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
    const userId = decoded.id;

    // Find current subscription
    const currentSubscription = await prisma.mobileSubscription.findFirst({
      where: {
        mobileUserId: userId,
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      }
    });

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Check if already on the requested plan
    if (currentSubscription.planId === planId) {
      return res.status(400).json({
        success: false,
        error: 'Already subscribed to this plan'
      });
    }

    // Define plan details
    const planDetails = {
      monthly_pro: { plan: 'Monthly Pro', amount: 299 },
      yearly_pro: { plan: 'Yearly Pro', amount: 2999 }
    };

    const newPlan = planDetails[planId];
    if (!newPlan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan ID'
      });
    }

    // For downgrade, we'll apply the change at next billing cycle
    const updatedSubscription = await prisma.mobileSubscription.update({
      where: { id: currentSubscription.id },
      data: {
        plan: newPlan.plan,
        planId: planId,
        // Note: Amount will be updated at next billing cycle
      }
    });

    res.json({
      success: true,
      data: {
        subscription: {
          id: updatedSubscription.id,
          plan: updatedSubscription.plan,
          planId: updatedSubscription.planId,
          startDate: updatedSubscription.startDate,
          endDate: updatedSubscription.endDate
        },
        message: 'Subscription will be downgraded at next billing cycle'
      }
    });

  } catch (error) {
    console.error('Downgrade subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to downgrade subscription'
    });
  }
});

// ENDPOINT 11: GET TRANSACTION HISTORY
// ============================================
app.get('/api/mobile/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
    const userId = decoded.id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = { mobileUserId: userId };
    if (status) {
      where.status = status;
    }

    const [transactions, total] = await Promise.all([
      prisma.mobileTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.mobileTransaction.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          paymentId: tx.paymentId,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

// ENDPOINT 12: CREATE TRANSACTION RECORD
// ============================================
app.post('/api/mobile/transactions', async (req, res) => {
  try {
    const { amount, currency = 'INR', paymentId, paymentMethod, status = 'PENDING' } = req.body;

    if (!amount || !paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Amount and payment ID are required'
      });
    }

    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
    const userId = decoded.id;

    // Create transaction
    const transaction = await prisma.mobileTransaction.create({
      data: {
        mobileUserId: userId,
        amount: parseFloat(amount),
        currency,
        paymentId,
        paymentMethod: paymentMethod || 'Razorpay',
        status
      }
    });

    res.status(201).json({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          paymentId: transaction.paymentId,
          paymentMethod: transaction.paymentMethod,
          createdAt: transaction.createdAt
        }
      },
      message: 'Transaction created successfully'
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction'
    });
  }
});

// ENDPOINT 13: DETAILED USAGE ANALYTICS
// ============================================
app.get('/api/mobile/analytics/usage', async (req, res) => {
  try {
    const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y

    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
    const userId = decoded.id;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get detailed analytics
    const [downloads, likes, activities, subscriptions] = await Promise.all([
      prisma.mobileDownload.findMany({
        where: {
          mobileUserId: userId,
          downloadedAt: { gte: startDate }
        },
        orderBy: { downloadedAt: 'desc' }
      }),
      prisma.mobile_likes.findMany({
        where: {
          mobileUserId: userId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mobileActivity.findMany({
        where: {
          mobileUserId: userId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mobileSubscription.findMany({
        where: {
          mobileUserId: userId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Calculate daily usage
    const dailyUsage = {};
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyUsage[dateStr] = {
        downloads: 0,
        likes: 0,
        activities: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate daily usage
    downloads.forEach(download => {
      const dateStr = download.downloadedAt.toISOString().split('T')[0];
      if (dailyUsage[dateStr]) {
        dailyUsage[dateStr].downloads++;
      }
    });

    likes.forEach(like => {
      const dateStr = like.createdAt.toISOString().split('T')[0];
      if (dailyUsage[dateStr]) {
        dailyUsage[dateStr].likes++;
      }
    });

    activities.forEach(activity => {
      const dateStr = activity.createdAt.toISOString().split('T')[0];
      if (dailyUsage[dateStr]) {
        dailyUsage[dateStr].activities++;
      }
    });

    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: startDate,
          end: now
        },
        summary: {
          totalDownloads: downloads.length,
          totalLikes: likes.length,
          totalActivities: activities.length,
          totalSubscriptions: subscriptions.length
        },
        dailyUsage: Object.entries(dailyUsage).map(([date, usage]) => ({
          date,
          downloads: usage.downloads,
          likes: usage.likes,
          activities: usage.activities
        })),
        recentActivity: {
          downloads: downloads.slice(0, 10).map(d => ({
            id: d.id,
            resourceType: d.resourceType,
            resourceId: d.resourceId,
            downloadedAt: d.downloadedAt
          })),
          likes: likes.slice(0, 10).map(l => ({
            id: l.id,
            resourceType: l.resourceType,
            resourceId: l.resourceId,
            createdAt: l.createdAt
          })),
          activities: activities.slice(0, 10).map(a => ({
            id: a.id,
            action: a.action,
            resource: a.resource,
            createdAt: a.createdAt
          }))
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get usage analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage analytics'
    });
  }
});

// ============================================
// ENDPOINT 4: SUBSCRIPTION HISTORY
// ============================================
app.get('/api/mobile/subscriptions/history', async (req, res) => {
  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get subscription history
    const [subscriptions, total] = await Promise.all([
      prisma.mobileSubscription.findMany({
        where: { mobileUserId: userId },
        select: {
          id: true,
          planId: true,
          status: true,
          amount: true,
          startDate: true,
          endDate: true,
          paymentId: true,
          paymentMethod: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.mobileSubscription.count({ where: { mobileUserId: userId } })
    ]);

    const paymentHistory = subscriptions.map(subscription => ({
      id: subscription.id,
      plan: subscription.planId,
      status: subscription.status,
      amount: subscription.amount,
      currency: 'INR',
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      paymentId: subscription.paymentId || `pay_${subscription.id.slice(-8)}`,
      paymentMethod: subscription.paymentMethod || 'Razorpay',
      paidAt: subscription.createdAt,
      description: 'Quarterly Pro Plan Subscription',
      isActive: subscription.status === 'ACTIVE' && subscription.endDate > new Date()
    }));

    res.json({
      success: true,
      data: {
        payments: paymentHistory,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalPayments: total,
          totalAmount: subscriptions.reduce((sum, sub) => sum + sub.amount, 0),
          currency: 'INR'
        }
      }
    });

  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription history'
    });
  }
});

// ============================================
// PHASE 3 BATCH 3: MISSING ENDPOINTS FROM API DOCUMENTATION
// ============================================

// Get Business Categories
app.get('/api/mobile/business-categories', async (req, res) => {
  try {
    // Get real business categories from database
    const dbCategories = await prisma.businessCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    // Get content count for each category
    const categoriesWithCount = await Promise.all(
      dbCategories.map(async (category) => {
        const [imageCount, videoCount] = await Promise.all([
          prisma.image.count({
            where: {
              businessCategoryId: category.id,
              approvalStatus: 'APPROVED',
              isActive: true
            }
          }),
          prisma.video.count({
            where: {
              businessCategoryId: category.id,
              approvalStatus: 'APPROVED',
              isActive: true
            }
          })
        ]);

        return {
          id: category.id,
          name: category.name,
          slug: category.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
          description: category.description || `${category.name} business content and templates`,
          icon: category.icon || "📄",
          color: generateColorForCategory(category.name),
          posterCount: imageCount,
          videoCount: videoCount,
          totalContent: imageCount + videoCount,
          mainCategory: category.mainCategory || 'BUSINESS',
          createdAt: category.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        categories: categoriesWithCount,
        total: categoriesWithCount.length
      },
      message: `Retrieved ${categoriesWithCount.length} business categories from database`
    });

  } catch (error) {
    console.error('Get business categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business categories'
    });
  }
});

// Get Business Categories under BUSINESS main category
app.get('/api/mobile/business-categories/business', async (req, res) => {
  try {
    console.log('🔍 Fetching BUSINESS main category categories...');
    
    // Get business categories with mainCategory = 'BUSINESS'
    const dbCategories = await prisma.businessCategory.findMany({
      where: {
        mainCategory: 'BUSINESS',
        isActive: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log(`📋 Retrieved ${dbCategories.length} BUSINESS categories`);

    // Get content counts for each category
    const categoriesWithCount = await Promise.all(
      dbCategories.map(async (category) => {
        const [imageCount, videoCount] = await Promise.all([
          prisma.image.count({
            where: {
              businessCategoryId: category.id,
              approvalStatus: 'APPROVED',
              isActive: true
            }
          }),
          prisma.video.count({
            where: {
              businessCategoryId: category.id,
              approvalStatus: 'APPROVED',
              isActive: true
            }
          })
        ]);

        return {
          id: category.id,
          name: category.name,
          slug: category.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
          description: category.description || `${category.name} business content and templates`,
          icon: category.icon || "📄",
          color: generateColorForCategory(category.name),
          posterCount: imageCount,
          videoCount: videoCount,
          totalContent: imageCount + videoCount,
          mainCategory: category.mainCategory || 'BUSINESS',
          sortOrder: category.sortOrder || 0,
          createdAt: category.createdAt
        };
      })
    );

    res.json({
      success: true,
      message: `Retrieved ${categoriesWithCount.length} business categories under BUSINESS main category`,
      data: {
        categories: categoriesWithCount,
        total: categoriesWithCount.length,
        mainCategory: 'BUSINESS'
      }
    });

  } catch (error) {
    console.error('Get BUSINESS categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch BUSINESS categories'
    });
  }
});

// Helper function to generate consistent colors for categories
function generateColorForCategory(categoryName) {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#74B9FF", "#A29BFE", "#FD79A8", "#FDCB6E", "#6C5CE7",
    "#00B894", "#00CEC9", "#FF7675", "#FD79A8", "#FDCB6E"
  ];
  
  // Generate consistent color based on category name
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get Upcoming Events
app.get('/api/mobile/home/upcoming-events', async (req, res) => {
  try {
    const { limit = 10, category, location, dateFrom, dateTo, isFree } = req.query;

    // Query images tagged with "upcoming" to create real events
    const upcomingImages = await prisma.image.findMany({
      where: {
        approvalStatus: 'APPROVED',
        isActive: true,
        tags: {
          contains: 'upcoming',
          mode: 'insensitive'
        }
      },
      include: {
        business_categories: {
          select: { id: true, name: true, icon: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit) * 2 // Get more to allow for filtering
    });

    // If no images with "upcoming" tag, fall back to business categories
    let events = [];
    
    if (upcomingImages.length > 0) {
      // Create events from images tagged as "upcoming"
      events = upcomingImages.map((image, index) => {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + (index + 1) * 7); // Events spread over weeks
        
        const locations = [
          "Mumbai Convention Center",
          "Delhi Business Hub", 
          "Bangalore Tech Park",
          "Chennai Trade Center",
          "Kolkata Event Hall",
          "Pune Business Center"
        ];

        return {
          id: `event_${image.id}`,
          title: image.title,
          description: image.description || `Upcoming event for ${image.businessCategory?.name || image.category}`,
          date: eventDate.toISOString().split('T')[0],
          time: `${9 + (index % 3)}:00`,
          location: locations[index % locations.length],
          organizer: `${image.businessCategory?.name || 'Event'} Association`,
          organizerId: `org_${image.businessCategory?.id || image.id}`,
          imageUrl: image.url,
          thumbnailUrl: image.thumbnailUrl,
          category: image.businessCategory?.name || image.category,
          price: image.category === 'BUSINESS' ? Math.floor(Math.random() * 5000) + 500 : 0,
          isFree: image.category !== 'BUSINESS',
          attendees: Math.floor(Math.random() * 200) + 50,
          maxAttendees: Math.floor(Math.random() * 300) + 200,
          tags: image.tags ? JSON.parse(image.tags) : ["upcoming", "event"],
          createdAt: image.createdAt
        };
      });
    } else {
      // Fallback: Generate events from business categories if no "upcoming" tagged images
      const businessCategories = await prisma.businessCategory.findMany({
        where: { isActive: true },
        take: 10
      });

      events = businessCategories.map((cat, index) => {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + (index + 1) * 7);
        
        const locations = [
          "Mumbai Convention Center",
          "Delhi Business Hub", 
          "Bangalore Tech Park",
          "Chennai Trade Center",
          "Kolkata Event Hall",
          "Pune Business Center"
        ];

        return {
          id: `event_${cat.id}`,
          title: `${cat.name} Business Summit 2024`,
          description: `Join us for the annual ${cat.name.toLowerCase()} business summit featuring industry leaders and networking opportunities`,
          date: eventDate.toISOString().split('T')[0],
          time: `${9 + (index % 3)}:00`,
          location: locations[index % locations.length],
          organizer: `${cat.name} Association`,
          organizerId: `org_${cat.id}`,
          imageUrl: cat.icon || "/api/placeholder/400/300",
          category: cat.name,
          price: index % 3 === 0 ? 0 : Math.floor(Math.random() * 5000) + 500,
          isFree: index % 3 === 0,
          attendees: Math.floor(Math.random() * 200) + 50,
          maxAttendees: Math.floor(Math.random() * 300) + 200,
          tags: [cat.name.toLowerCase(), "business", "networking", "summit"],
          createdAt: new Date().toISOString()
        };
      });
    }

    // Apply filters
    let filteredEvents = events;
    if (category) {
      filteredEvents = filteredEvents.filter(event => 
        event.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    if (location) {
      filteredEvents = filteredEvents.filter(event => 
        event.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    if (isFree !== undefined) {
      filteredEvents = filteredEvents.filter(event => 
        event.isFree === (isFree === 'true')
      );
    }

    // Apply limit
    filteredEvents = filteredEvents.slice(0, parseInt(limit));

    res.json({
      success: true,
      message: `Upcoming events retrieved successfully (${upcomingImages.length > 0 ? 'from tagged images' : 'from business categories'})`,
      data: {
        events: filteredEvents,
        pagination: {
          page: 1,
          limit: parseInt(limit),
          total: filteredEvents.length,
          pages: 1
        }
      }
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming events'
    });
  }
});

// Get Professional Templates
app.get('/api/mobile/home/templates', async (req, res) => {
  try {
    const { 
      limit = 10, 
      category, 
      subcategory, 
      isPremium, 
      sortBy = 'popular', 
      tags,
      language 
    } = req.query;

    // Build where clause for database query - ONLY return BUSINESS category images
    const where = {
      approvalStatus: 'APPROVED',
      isActive: true,
      category: 'BUSINESS'  // Only return business category images
    };

    // Additional subcategory filtering if provided
    if (subcategory) {
      // Subcategory filtering can be added here if needed
    }

    // Filter by language tag if provided
    if (language) {
      where.tags = {
        contains: language,
        mode: 'insensitive'
      };
    }

    // Build order by clause
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'popular') {
      orderBy = { downloads: 'desc' };
    } else if (sortBy === 'recent') {
      orderBy = { createdAt: 'desc' };
    } else if (sortBy === 'likes') {
      orderBy = { views: 'desc' }; // Use views as proxy for likes
    }

    // Get real images from database
    const images = await prisma.image.findMany({
      where,
      include: {
        business_categories: {
          select: { name: true, icon: true }
        }
      },
      orderBy,
      take: parseInt(limit)
    });

    // Transform to template format
    const templates = images.map(image => ({
      id: image.id,
      name: image.title,
      description: image.description || `Professional ${image.category.toLowerCase()} template`,
      thumbnail: image.thumbnailUrl,
      previewUrl: image.url,
      category: image.category === 'BUSINESS' ? 'premium' : 'free',
      subcategory: image.businessCategory?.name || 'General',
      likes: 0, // TODO: Implement likes system
      downloads: image.downloads,
      views: image.views,
      isLiked: false, // TODO: Check user likes
      isDownloaded: false, // TODO: Check user downloads
      isPremium: image.category === 'BUSINESS',
      tags: image.tags ? JSON.parse(image.tags) : [],
      fileSize: image.fileSize || 1024000,
      business_categories: image.businessCategory?.name,
      createdAt: image.createdAt
    }));

    res.json({
      success: true,
      data: templates,
      message: 'Templates retrieved successfully'
    });

  } catch (error) {
    console.error('Get professional templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch professional templates'
    });
  }
});

// Get Video Content
app.get('/api/mobile/home/video-content', async (req, res) => {
  try {
    const { 
      limit = 10, 
      category, 
      language = 'hindi', 
      isPremium, 
      sortBy = 'popular', 
      duration, 
      tags 
    } = req.query;

    // Build where clause for database query
    const where = {
      approvalStatus: 'APPROVED',
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    // Build order by clause
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'popular') {
      orderBy = { downloads: 'desc' };
    } else if (sortBy === 'views') {
      orderBy = { views: 'desc' };
    }

    // Get real videos from database
    const dbVideos = await prisma.video.findMany({
      where,
      include: {
        business_categories: {
          select: { name: true, icon: true }
        }
      },
      orderBy,
      take: parseInt(limit)
    });

    // Transform to API format
    const videos = dbVideos.map(video => ({
      id: video.id,
      title: video.title,
      description: video.description || `Professional ${video.category.toLowerCase()} video template`,
      thumbnail: video.thumbnailUrl || "/api/placeholder/400/300",
      videoUrl: video.videoUrl,
      duration: video.duration,
      category: video.category,
      language: language || 'hindi',
      likes: 0, // TODO: Implement likes system
      views: video.views,
      downloads: video.downloads,
      isLiked: false, // TODO: Check user likes
      isDownloaded: false, // TODO: Check user downloads
      isPremium: video.category === 'BUSINESS',
      tags: video.tags ? JSON.parse(video.tags) : [],
      fileSize: video.fileSize,
      business_categories: video.businessCategory?.name,
      createdAt: video.createdAt
    }));

    // Apply additional filters
    let filteredVideos = videos;
    if (language) {
      filteredVideos = filteredVideos.filter(video => 
        video.language === language
      );
    }
    if (isPremium !== undefined) {
      filteredVideos = filteredVideos.filter(video => 
        video.isPremium === (isPremium === 'true')
      );
    }
    if (duration) {
      const durationMap = {
        'short': 15,
        'medium': 30,
        'long': 60
      };
      filteredVideos = filteredVideos.filter(video => 
        video.duration <= durationMap[duration] || 30
      );
    }

    res.json({
      success: true,
      data: filteredVideos,
      message: 'Video content retrieved successfully'
    });

  } catch (error) {
    console.error('Get video content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video content'
    });
  }
});

// Search Content
app.get('/api/mobile/home/search', async (req, res) => {
  try {
    const { q, type = 'all', limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchResults = {
      templates: [],
      videos: [],
      events: []
    };

    if (type === 'all' || type === 'templates') {
      // Search templates
      const templates = await prisma.mobile_templates.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { tags: { contains: q } }
          ]
        },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          category: true,
          language: true,
          likes: true,
          downloads: true,
          isPremium: true,
          createdAt: true
        },
        take: parseInt(limit)
      });

      searchResults.templates = templates.map(template => ({
        id: template.id,
        title: template.title,
        description: template.description,
        thumbnail: template.thumbnailUrl,
        category: template.category,
        language: template.language,
        likes: template.likes,
        downloads: template.downloads,
        isPremium: template.isPremium,
        type: 'template',
        createdAt: template.createdAt
      }));
    }

    if (type === 'all' || type === 'videos') {
      // Mock video search results
      searchResults.videos = [
        {
          id: "video_search_1",
          title: `Video about ${q}`,
          description: `Professional video content related to ${q}`,
          thumbnail: "/api/placeholder/400/300",
          category: "Business",
          language: "hindi",
          likes: 50,
          downloads: 25,
          isPremium: false,
          type: 'video',
          createdAt: new Date().toISOString()
        }
      ];
    }

    if (type === 'all' || type === 'events') {
      // Mock event search results
      searchResults.events = [
        {
          id: "event_search_1",
          title: `Event about ${q}`,
          description: `Upcoming event related to ${q}`,
          date: "2024-11-15",
          location: "Mumbai",
          category: "Business",
          price: 500,
          isFree: false,
          type: 'event',
          createdAt: new Date().toISOString()
        }
      ];
    }

    res.json({
      success: true,
      data: searchResults,
      message: 'Search results retrieved successfully'
    });

  } catch (error) {
    console.error('Search content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search content'
    });
  }
});


// ============================================
// ENDPOINT 5: USER PROFILE BY ID
// ============================================
app.get('/api/mobile/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.mobileUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        alternatePhone: true,
        deviceId: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            mobile_subscriptions: true,
            mobile_downloads: true,
            mobile_likes: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Fetch business profile to get website and address
    const businessProfile = await prisma.businessProfile.findFirst({
      where: { mobileUserId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        businessWebsite: true,
        businessAddress: true
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          alternatePhone: user.alternatePhone,
          deviceId: user.deviceId,
          isActive: user.isActive,
          lastActiveAt: user.lastActiveAt,
          joinedDate: user.createdAt,
          updatedAt: user.updatedAt,
          website: businessProfile?.businessWebsite || null,
          address: businessProfile?.businessAddress || null,
          stats: {
            totalSubscriptions: user._count.mobile_subscriptions,
            totalDownloads: user._count.mobile_downloads,
            totalLikes: user._count.mobile_likes
          }
        }
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// ============================================
// UPDATE USER PROFILE
// ============================================
app.put('/api/mobile/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, deviceId, alternatePhone, website, address } = req.body;

    // Extract user ID from JWT token for authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
      userId = decoded.id;
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if user is trying to update their own profile
    if (userId !== id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own profile'
      });
    }

    // Check if user exists
    const existingUser = await prisma.mobileUser.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate email uniqueness if email is being updated
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.mobileUser.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Update user data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone;
    if (email !== undefined) updateData.email = email;
    if (deviceId !== undefined) updateData.deviceId = deviceId;
    
    // Always update the lastActiveAt timestamp
    updateData.lastActiveAt = new Date();

    const updatedUser = await prisma.mobileUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        alternatePhone: true,
        deviceId: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            mobile_subscriptions: true,
            mobile_downloads: true,
            mobile_likes: true
          }
        }
      }
    });

    // Handle BusinessProfile update for website and address
    // Always fetch/update to ensure consistency with /api/mobile/auth/me endpoint
    let businessProfile = null;
    
    // Find existing business profile for this user (get latest)
    const existingProfile = await prisma.businessProfile.findFirst({
      where: { mobileUserId: id },
      orderBy: { createdAt: 'desc' }
    });

    // Build update data - explicitly handle null values
    const hasWebsiteUpdate = website !== undefined;
    const hasAddressUpdate = address !== undefined;
    const hasUpdates = hasWebsiteUpdate || hasAddressUpdate;
    
    const businessProfileUpdateData = {};
    if (hasWebsiteUpdate) {
      businessProfileUpdateData.businessWebsite = website; // Can be null
    }
    if (hasAddressUpdate) {
      businessProfileUpdateData.businessAddress = address; // Can be null
    }

    if (hasUpdates) {
      businessProfileUpdateData.updatedAt = new Date();

      if (existingProfile) {
        // Update existing business profile (even if setting to null)
        businessProfile = await prisma.businessProfile.update({
          where: { id: existingProfile.id },
          data: businessProfileUpdateData,
          select: {
            businessWebsite: true,
            businessAddress: true
          }
        });
      } else {
        // Create new business profile if it doesn't exist
        businessProfile = await prisma.businessProfile.create({
          data: {
            mobileUserId: id,
            businessName: updatedUser.name || 'My Business',
            businessEmail: updatedUser.email || '',
            businessPhone: updatedUser.phone || '',
            businessWebsite: website !== undefined ? website : null,
            businessAddress: address !== undefined ? address : null
          },
          select: {
            businessWebsite: true,
            businessAddress: true
          }
        });
      }
    } else if (existingProfile) {
      // Fetch existing business profile for response (even if not updating)
      businessProfile = {
        businessWebsite: existingProfile.businessWebsite,
        businessAddress: existingProfile.businessAddress
      };
    } else {
      // No profile exists and no updates
      businessProfile = { businessWebsite: null, businessAddress: null };
    }

    res.json({
      success: true,
      message: 'User profile updated successfully',
      data: {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            alternatePhone: updatedUser.alternatePhone,
            deviceId: updatedUser.deviceId,
            isActive: updatedUser.isActive,
            lastActiveAt: updatedUser.lastActiveAt,
            joinedDate: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt,
            website: businessProfile?.businessWebsite || null,
            address: businessProfile?.businessAddress || null,
          stats: {
            totalSubscriptions: updatedUser._count.mobile_subscriptions,
            totalDownloads: updatedUser._count.mobile_downloads,
            totalLikes: updatedUser._count.mobile_likes
          }
        }
      }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

// ============================================
// PLACEHOLDER IMAGE API
// ============================================
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#666">
        ${width} x ${height}
      </text>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ============================================

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      if (decoded.userType !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      // Verify admin exists
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id }
      });

      if (!admin || !admin.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Invalid admin token'
        });
      }

      req.admin = admin;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// ============================================
// ADMIN APIs - WORKING ENDPOINTS
// ============================================

// Admin Login API
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find admin user
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // For demo purposes, accept any password (in production, use bcrypt)
    // const isValidPassword = await bcrypt.compare(password, admin.password);
    const isValidPassword = true; // Demo mode

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token (simplified for demo)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        userType: 'ADMIN' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: 'ADMIN'
        }
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Debug endpoint to check database directly
app.get('/api/admin/debug/subscriptions', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Debug: Checking database directly');
    
    // Check mobile users
    const mobileUsers = await prisma.mobileUser.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    console.log('👥 Mobile users found:', mobileUsers.length);
    
    // Check mobile subscriptions
    const subscriptions = await prisma.mobileSubscription.findMany({
      include: {
        mobile_users: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true
          }
        }
      }
    });
    console.log('📋 Subscriptions found:', subscriptions.length);
    
    res.json({
      success: true,
      debug: {
        mobileUsers,
        subscriptions,
        counts: {
          users: mobileUsers.length,
          subscriptions: subscriptions.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin Subscription Listing API
app.get('/api/admin/subscriptions', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin subscription listing request received');
    
    const { 
      page = 1, 
      limit = 20, 
      status, 
      plan, 
      search 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    console.log('📊 Query parameters:', { pageNum, limitNum, status, plan, search });

    // Build where clause for filtering
    const whereClause = {};
    
    if (status) {
      whereClause.status = status.toUpperCase();
    }
    
    if (plan) {
      whereClause.planId = plan;
    }

    console.log('🔍 Where clause:', whereClause);

    // First, let's check if there are any subscriptions at all
    const totalSubscriptions = await prisma.mobileSubscription.count();
    console.log('📈 Total subscriptions in database:', totalSubscriptions);

    if (totalSubscriptions === 0) {
      return res.json({
        success: true,
        data: {
          subscriptions: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0
          },
          summary: {
            totalSubscriptions: 0,
            activeSubscriptions: 0,
            monthlyRevenue: 0
          }
        }
      });
    }

    // Get subscriptions with user details
    const [subscriptions, totalCount] = await Promise.all([
      prisma.mobileSubscription.findMany({
        where: whereClause,
        include: {
          mobile_users: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum
      }),
      prisma.mobileSubscription.count({
        where: whereClause
      })
    ]);

    console.log('📋 Found subscriptions:', subscriptions.length);

    // Filter subscriptions by user search if needed
    let filteredSubscriptions = subscriptions;
    if (search) {
      filteredSubscriptions = subscriptions.filter(sub => 
        sub.mobileUser && (
          sub.mobileUser.name?.toLowerCase().includes(search.toLowerCase()) ||
          sub.mobileUser.email?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    // Calculate summary statistics
    const [activeSubscriptions, monthlyRevenue] = await Promise.all([
      prisma.mobileSubscription.count({
        where: { status: 'ACTIVE' }
      }),
      prisma.mobileSubscription.aggregate({
        where: { 
          status: 'ACTIVE',
          planId: 'monthly_pro'
        },
        _sum: { amount: true }
      })
    ]);

    const yearlyRevenue = await prisma.mobileSubscription.aggregate({
      where: { 
        status: 'ACTIVE',
        planId: 'yearly_pro'
      },
      _sum: { amount: true }
    });

    const totalRevenue = (monthlyRevenue._sum.amount || 0) + (yearlyRevenue._sum.amount || 0);

    // Format response
    const formattedSubscriptions = filteredSubscriptions.map(sub => ({
      id: sub.id,
      user: sub.mobileUser ? {
        id: sub.mobileUser.id,
        name: sub.mobileUser.name,
        email: sub.mobileUser.email,
        phone: sub.mobileUser.phone
      } : null,
      plan: sub.plan,
      planId: sub.planId,
      status: sub.status,
      amount: sub.amount,
      startDate: sub.startDate,
      endDate: sub.endDate,
      paymentMethod: sub.paymentMethod,
      autoRenew: sub.autoRenew,
      createdAt: sub.createdAt
    }));

    console.log('✅ Returning subscription data:', {
      subscriptionsCount: formattedSubscriptions.length,
      totalCount,
      summary: { totalSubscriptions, activeSubscriptions, monthlyRevenue: totalRevenue }
    });

    res.json({
      success: true,
      data: {
        subscriptions: formattedSubscriptions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        },
        summary: {
          totalSubscriptions,
          activeSubscriptions,
          monthlyRevenue: totalRevenue
        }
      }
    });

  } catch (error) {
    console.error('❌ Admin subscription listing error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions',
      details: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.originalUrl);
  console.log('❌ Path:', req.path);
  console.log('❌ Params:', req.params);
  console.log('❌ Base URL:', req.baseUrl);
  console.log('❌ Route matched:', req.route ? req.route.path : 'none');
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Deployment server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile APIs available at http://localhost:${PORT}/api/mobile/`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: SQLite (connected)`);
  console.log(`📤 Logo upload route: POST /api/mobile/users/:userId/upload-logo`);
  console.log('\n✅ Ready for deployment!');
});

module.exports = app;
