const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('🚀 EventMarketers Backend - Deployment Server');
console.log('==============================================\n');

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'eventmarketers-secret-key-2024';

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://eventmarketers.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
// ADMIN AUTHENTICATION APIs
// ============================================

// Admin Login
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('🔐 Admin login attempt:', email);

    // Find admin user
    const admin = await prisma.admins.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true
      }
    });

    if (!admin) {
      console.log('❌ Admin not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    if (!admin.isActive) {
      console.log('❌ Admin account inactive:', email);
      return res.status(401).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for admin:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        userType: 'ADMIN'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Admin login successful:', email);

    // Log successful login (optional - can fail silently)
    try {
      await prisma.audit_logs.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          adminId: admin.id,
          userType: 'ADMIN',
          action: 'LOGIN',
          resource: 'AUTH',
          details: 'Admin login successful',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'SUCCESS'
        }
      });
    } catch (auditError) {
      console.warn('⚠️ Failed to log audit entry:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        userType: 'ADMIN'
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Subadmin Login
app.post('/api/auth/subadmin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('🔐 Subadmin login attempt:', email);

    // Find subadmin user
    const subadmin = await prisma.subadmins.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        status: true,
        permissions: true,
        assignedCategories: true
      }
    });

    if (!subadmin) {
      console.log('❌ Subadmin not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    if (subadmin.status !== 'ACTIVE') {
      console.log('❌ Subadmin account not active:', email);
      return res.status(401).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, subadmin.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for subadmin:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: subadmin.id,
        email: subadmin.email,
        userType: 'SUBADMIN'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Subadmin login successful:', email);

    // Log successful login (optional - can fail silently)
    try {
      await prisma.audit_logs.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subadminId: subadmin.id,
          userType: 'SUBADMIN',
          action: 'LOGIN',
          resource: 'AUTH',
          details: 'Subadmin login successful',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'SUCCESS'
        }
      });
    } catch (auditError) {
      console.warn('⚠️ Failed to log audit entry:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: subadmin.id,
        email: subadmin.email,
        name: subadmin.name,
        role: subadmin.role,
        userType: 'SUBADMIN',
        permissions: subadmin.permissions,
        assignedCategories: subadmin.assignedCategories
      }
    });

  } catch (error) {
    console.error('❌ Subadmin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      prisma.mobileTemplate.count({ where: { isActive: true } }),
      prisma.mobileVideo.count({ where: { isActive: true } }),
      prisma.greetingTemplate.count({ where: { isActive: true } }),
      prisma.mobileDownload.count(),
      prisma.mobileLike.count()
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

    const where = { isActive: true };
    if (category) {
      where.category = category;
    }

    const templates = await prisma.mobileTemplate.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.mobileTemplate.count({ where });

    res.json({
      success: true,
      data: {
        templates: templates.map(template => ({
          id: template.id,
          title: template.title,
          description: template.description,
          imageUrl: template.imageUrl,
          thumbnailUrl: template.thumbnailUrl,
          category: template.category,
          tags: template.tags ? JSON.parse(template.tags) : [],
          isPremium: template.isPremium,
          downloads: template.downloads,
          likes: template.likes,
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

    const greetings = await prisma.greetingTemplate.findMany({
      where: { isActive: true },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.greetingTemplate.count({ where: { isActive: true } });

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
      },
      {
        id: '4',
        title: 'General Business Poster',
        category: 'general',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Multi-purpose business poster'
      },
      {
        id: '5',
        title: 'General Promotion',
        category: 'general',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'General promotional content'
      }
    ];

    const categoryLower = categoryName.toLowerCase();
    let posters = mockPosters.filter(p => p.category.toLowerCase() === categoryLower);

    if (categoryLower === 'general') {
      posters = mockPosters.filter(p => p.category.toLowerCase() === 'general');
    }

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedPosters = posters.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        category: categoryName,
        posters: paginatedPosters,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: posters.length,
          pages: Math.ceil(posters.length / limitNum)
        }
      }
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
app.post('/api/mobile/auth/register', async (req, res) => {
  try {
    const { deviceId, email, name, phone } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID is required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.mobileUser.findUnique({
      where: { deviceId }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this device ID already exists'
      });
    }

    // Create new mobile user
    const newUser = await prisma.mobileUser.create({
      data: {
        deviceId,
        email: email || null,
        name: name || null,
        phone: phone || null,
        isActive: true,
        lastActiveAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          deviceId: newUser.deviceId,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          isActive: newUser.isActive,
          lastActiveAt: newUser.lastActiveAt
        },
        message: 'Mobile user registered successfully'
      }
    });

  } catch (error) {
    console.error('Mobile user registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register mobile user'
    });
  }
});

// Mobile User Login API
app.post('/api/mobile/auth/login', async (req, res) => {
  try {
    const { deviceId, email } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID is required'
      });
    }

    // Try to find user by deviceId first
    let user = await prisma.mobileUser.findUnique({
      where: { deviceId }
    });

    // If not found by deviceId and email provided, try to find by email
    if (!user && email) {
      user = await prisma.mobileUser.findUnique({
        where: { email }
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please register first.'
      });
    }

    // Update last active timestamp
    await prisma.mobileUser.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    // Return user data with success response
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          deviceId: user.deviceId,
          email: user.email,
          name: user.name,
          phone: user.phone,
          isActive: user.isActive,
          lastActiveAt: new Date()
        },
        message: 'Login successful'
      }
    });

  } catch (error) {
    console.error('Mobile user login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login mobile user'
    });
  }
});

// Mobile Subscriptions Status API
app.get('/api/mobile/subscriptions/status', async (req, res) => {
  try {
    const { userId, deviceId } = req.query;

    if (!userId && !deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Either userId or deviceId is required'
      });
    }

    let user = null;

    // Find user by userId or deviceId
    if (userId) {
      user = await prisma.mobileUser.findUnique({
        where: { id: userId }
      });
    } else if (deviceId) {
      user = await prisma.mobileUser.findUnique({
        where: { deviceId }
      });
    }

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
        user: {
          id: user.id,
          deviceId: user.deviceId,
          email: user.email,
          name: user.name
        },
        subscription: {
          status: subscriptionStatus,
          currentPlan: currentSubscription?.plan || null,
          planId: currentSubscription?.planId || null,
          startDate: currentSubscription?.startDate || null,
          endDate: currentSubscription?.endDate || null,
          daysRemaining: daysRemaining,
          totalSubscriptions: allSubscriptions.length
        },
        message: `Subscription status: ${subscriptionStatus}`
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
// MOBILE DOWNLOADS API
// ============================================

// Track a download
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
    const validTypes = ['TEMPLATE', 'VIDEO', 'GREETING', 'CONTENT'];
    if (!validTypes.includes(resourceType)) {
      return res.status(400).json({
        success: false,
        error: 'Resource type must be TEMPLATE, VIDEO, GREETING, or CONTENT'
      });
    }

    console.log('📥 Download tracking request:', {
      mobileUserId,
      resourceId,
      resourceType,
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
        resourceType: resourceType
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
        resourceType: resourceType,
        fileUrl: fileUrl || `/${resourceType.toLowerCase()}/${resourceId}`,
        downloadedAt: new Date()
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

// Get all user downloads
app.get('/api/mobile/users/:id/downloads/all', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', type } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause based on type filter
    let whereClause = { mobileUserId: id };
    if (type) {
      whereClause.resourceType = type.toUpperCase();
    }

    // Get downloads from the unified MobileDownload table
    const [downloads, total] = await Promise.all([
      prisma.mobileDownload.findMany({
        where: whereClause,
        orderBy: { downloadedAt: 'desc' },
        skip,
        take,
        include: {
          mobileUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.mobileDownload.count({ where: whereClause })
    ]);

    // Get download statistics
    const stats = await Promise.all([
      prisma.mobileDownload.count({
        where: { mobileUserId: id, resourceType: 'TEMPLATE' }
      }),
      prisma.mobileDownload.count({
        where: { mobileUserId: id, resourceType: 'VIDEO' }
      }),
      prisma.mobileDownload.count({
        where: { mobileUserId: id, resourceType: 'GREETING' }
      }),
      prisma.mobileDownload.count({
        where: { mobileUserId: id, resourceType: 'CONTENT' }
      })
    ]);

    const [templateCount, videoCount, greetingCount, contentCount] = stats;

    res.json({
      success: true,
      message: 'All user downloads fetched successfully',
      data: {
        downloads,
        statistics: {
          total: total,
          byType: {
            templates: templateCount,
            videos: videoCount,
            greetings: greetingCount,
            content: contentCount
          }
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get all user downloads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all user downloads'
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

// 404 handler
app.use('*', (req, res) => {
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
  console.log('\n✅ Ready for deployment!');
});

module.exports = app;
