const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Minimal test server is running',
    timestamp: new Date().toISOString()
  });
});

// Mobile Home Stats API
app.get('/api/mobile/home/stats', async (req, res) => {
  try {
    const [
      totalTemplates,
      totalVideos,
      totalGreetings,
      templateDownloads,
      videoDownloads,
      greetingDownloads,
      templateLikes,
      videoLikes,
      greetingLikes
    ] = await Promise.all([
      prisma.mobileTemplate.count({ where: { isActive: true } }),
      prisma.mobileVideo.count({ where: { isActive: true } }),
      prisma.greetingTemplate.count({ where: { isActive: true } }),
      prisma.templateDownload.count(),
      prisma.videoDownload.count(),
      prisma.greetingDownload.count(),
      prisma.templateLike.count(),
      prisma.videoLike.count(),
      prisma.greetingLike.count()
    ]);

    const totalDownloads = templateDownloads + videoDownloads + greetingDownloads;
    const totalLikes = templateLikes + videoLikes + greetingLikes;

    res.json({
      success: true,
      data: {
        stats: {
          totalTemplates,
          totalVideos,
          totalGreetings,
          totalDownloads,
          totalLikes
        }
      }
    });

  } catch (error) {
    console.error('Home stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get home stats'
    });
  }
});

// Mobile Templates API
app.get('/api/mobile/templates', async (req, res) => {
  try {
    const { page = '1', limit = '20', category, search } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { isActive: true };
    if (category) where.category = category;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [templates, total] = await Promise.all([
      prisma.mobileTemplate.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mobileTemplate.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get mobile templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mobile templates'
    });
  }
});

// Mobile Greetings API
app.get('/api/mobile/greetings', async (req, res) => {
  try {
    const { page = '1', limit = '20', category, search, type } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { isActive: true };
    if (category) where.category = category;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    if (type) where.type = type;

    const [greetings, total] = await Promise.all([
      prisma.greetingTemplate.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.greetingTemplate.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        greetings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Fetch greetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch greetings'
    });
  }
});

// Mobile Posters API (Mock Data)
app.get('/api/mobile/posters', async (req, res) => {
  try {
    const { category, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Mock poster data
    const mockPosters = [
      {
        id: '1',
        title: 'Restaurant Special Offer',
        category: 'restaurant',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300'
      },
      {
        id: '2',
        title: 'Wedding Invitation',
        category: 'wedding',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300'
      },
      {
        id: '3',
        title: 'Electronics Sale',
        category: 'electronics',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300'
      }
    ];

    let posters = mockPosters;
    if (category) {
      posters = mockPosters.filter(p => p.category === category);
    }

    // Pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedPosters = posters.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
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
    console.error('Fetch posters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posters'
    });
  }
});

// Mobile Posters Categories API
app.get('/api/mobile/posters/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'restaurant', name: 'Restaurant', count: 15, icon: '🍽️' },
      { id: 'wedding', name: 'Wedding Planning', count: 12, icon: '💒' },
      { id: 'electronics', name: 'Electronics', count: 18, icon: '📱' },
      { id: 'beauty', name: 'Beauty', count: 14, icon: '💄' },
      { id: 'fitness', name: 'Fitness', count: 16, icon: '💪' },
      { id: 'education', name: 'Education', count: 13, icon: '📚' },
      { id: 'general', name: 'General', count: 20, icon: '📄' }
    ];

    res.json({
      success: true,
      data: {
        categories
      }
    });

  } catch (error) {
    console.error('Fetch poster categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch poster categories'
    });
  }
});

// Mobile Posters by Category API (NEW ENDPOINT)
app.get('/api/mobile/posters/category/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Mock poster data with more categories
    const mockPosters = [
      {
        id: '1',
        title: 'Restaurant Special Offer',
        category: 'restaurant',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Delicious food promotion poster'
      },
      {
        id: '2',
        title: 'Wedding Invitation',
        category: 'wedding',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Elegant wedding invitation design'
      },
      {
        id: '3',
        title: 'Electronics Sale',
        category: 'electronics',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Tech gadgets sale promotion'
      },
      {
        id: '4',
        title: 'Beauty Product Launch',
        category: 'beauty',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'New beauty product announcement'
      },
      {
        id: '5',
        title: 'Fitness Challenge',
        category: 'fitness',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Join our fitness challenge'
      },
      {
        id: '6',
        title: 'Education Course',
        category: 'education',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Online course enrollment'
      },
      {
        id: '7',
        title: 'General Business Poster',
        category: 'general',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'Multi-purpose business poster'
      },
      {
        id: '8',
        title: 'General Promotion',
        category: 'general',
        imageUrl: '/api/placeholder/400/600',
        thumbnailUrl: '/api/placeholder/200/300',
        description: 'General promotional content'
      }
    ];

    // Filter posters by category (case-insensitive)
    const categoryLower = categoryName.toLowerCase();
    let posters = mockPosters.filter(p => p.category.toLowerCase() === categoryLower);

    // Handle special case for "General" category
    if (categoryLower === 'general') {
      posters = mockPosters.filter(p => p.category.toLowerCase() === 'general');
    }

    // Pagination
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
      return res.json({
        success: true,
        data: {
          user: existingUser,
          message: 'User already exists'
        }
      });
    }

    // Create new user
    const newUser = await prisma.mobileUser.create({
      data: {
        deviceId,
        email: email || null,
        name: name || null,
        phone: phone || null
      }
    });

    res.status(201).json({
      success: true,
      data: {
        user: newUser,
        message: 'User registered successfully'
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile APIs available at http://localhost:${PORT}/api/mobile/`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});
