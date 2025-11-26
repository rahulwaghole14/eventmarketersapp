import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/mobile/home/featured
 * Get featured content for home screen - prioritizes images with "featured" tag
 */
router.get('/featured', async (req: Request, res: Response) => {
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
      take: parseInt(limit as string)
    });

    let featuredImages = taggedFeaturedImages;

    // If not enough tagged images, supplement with popular images
    if (taggedFeaturedImages.length < parseInt(limit as string)) {
      const remainingLimit = parseInt(limit as string) - taggedFeaturedImages.length;
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
      businessCategory: image.business_categories?.name,
      tags: image.tags ? JSON.parse(image.tags) : [],
      isFeatured: taggedFeaturedImages.some(img => img.id === image.id),
      createdAt: image.createdAt
    }));

    res.json({
      success: true,
      message: `Featured festival content retrieved successfully (${taggedFeaturedImages.length} tagged, ${featuredImages.length - taggedFeaturedImages.length} popular)`,
      data: {
        featured: featuredContent,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get featured content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured content'
    });
  }
});

/**
 * GET /api/mobile/home/upcoming-events
 * Get upcoming events from images tagged with "upcoming"
 */
router.get('/upcoming-events', async (req: Request, res: Response) => {
  try {
    const { limit = '20', category, location, isFree } = req.query;

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
      take: parseInt(limit as string) * 2 // Get more to allow for filtering
    });

    // If no images with "upcoming" tag, fall back to business categories
    let events: any[] = [];
    
    if (upcomingImages.length > 0) {
      // Create events from images tagged as "upcoming"
      events = upcomingImages.map((image, index) => {
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
          id: `event_${image.id}`,
          title: image.title,
          description: image.description || `Upcoming event for ${image.business_categories?.name || image.category}`,
          date: eventDate.toISOString().split('T')[0],
          time: `${9 + (index % 3)}:00`,
          location: locations[index % locations.length],
          organizer: `${image.business_categories?.name || 'Event'} Association`,
          organizerId: `org_${image.business_categories?.id || image.id}`,
          imageUrl: image.url,
          thumbnailUrl: image.thumbnailUrl,
          category: image.business_categories?.name || image.category,
          price: image.category === 'BUSINESS' ? Math.floor(Math.random() * 5000) + 500 : 0,
          isFree: image.category !== 'BUSINESS',
          attendees: Math.floor(Math.random() * 200) + 50,
          maxAttendees: Math.floor(Math.random() * 300) + 200,
          tags: image.tags ? JSON.parse(image.tags) : ["upcoming", "event"],
          createdAt: image.createdAt
        };
      });
    } else {
      // Fallback: Generate from business categories if no "upcoming" tagged images
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
          description: `Join us for the annual ${cat.name.toLowerCase()} business summit`,
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
        event.category.toLowerCase().includes((category as string).toLowerCase())
      );
    }
    if (location) {
      filteredEvents = filteredEvents.filter(event => 
        event.location.toLowerCase().includes((location as string).toLowerCase())
      );
    }
    if (isFree !== undefined) {
      filteredEvents = filteredEvents.filter(event => 
        event.isFree === (isFree === 'true')
      );
    }

    // Apply limit
    filteredEvents = filteredEvents.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      message: `Upcoming events retrieved successfully (${upcomingImages.length > 0 ? 'from tagged images' : 'from business categories'})`,
      data: {
        events: filteredEvents,
        pagination: {
          page: 1,
          limit: parseInt(limit as string),
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

/**
 * GET /api/mobile/home/templates
 * Get professional templates for home screen
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { limit = '20', category, sortBy = 'createdAt' } = req.query;
    
    // ONLY return BUSINESS category images
    const where: any = { 
      approvalStatus: 'APPROVED',
      isActive: true,
      category: 'BUSINESS'  // Only return business category images
    };

    const orderBy: any = {};
    if (sortBy === 'popular') orderBy.downloads = 'desc';
    else if (sortBy === 'likes') orderBy.likes = 'desc';
    else orderBy.createdAt = 'desc';

    const images = await prisma.image.findMany({
      where,
      orderBy,
      take: parseInt(limit as string),
      include: {
        business_categories: {
          select: {
            name: true,
            icon: true
          }
        }
      }
    });

    // Transform images to template format
    const templates = images.map(image => ({
      id: image.id,
      title: image.title,
      description: image.description,
      imageUrl: image.url,
      thumbnailUrl: image.thumbnailUrl,
      category: image.category === 'BUSINESS' ? 'premium' : 'free',
      businessCategory: image.business_categories?.name,
      downloads: image.downloads,
      views: image.views,
      likes: 0, // TODO: Implement likes system
      isLiked: false, // TODO: Check user likes
      tags: image.tags ? JSON.parse(image.tags) : [],
      createdAt: image.createdAt
    }));

    res.json({
      success: true,
      message: 'Templates fetched successfully',
      data: templates
    });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/mobile/home/video-content
 * Get video content for home screen
 */
router.get('/video-content', async (req: Request, res: Response) => {
  try {
    const { limit = '20', category, duration } = req.query;
    
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (duration === 'short') where.duration = { lte: 60 };
    else if (duration === 'medium') where.duration = { gte: 61, lte: 300 };
    else if (duration === 'long') where.duration = { gte: 301 };

    const videos = await prisma.mobile_videos.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      message: 'Video content fetched successfully',
      data: videos
    });

  } catch (error) {
    console.error('Get video content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video content'
    });
  }
});

/**
 * GET /api/mobile/home/search
 * Search all content
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, type, limit = '20' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchQuery = q as string;
    const results: any = {};

    // Search templates
    if (!type || type === 'templates') {
      results.templates = await prisma.mobile_templates.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: searchQuery } },
            { description: { contains: searchQuery } },
            { tags: { contains: searchQuery } }
          ]
        },
        take: parseInt(limit as string)
      });
    }

    // Search videos
    if (!type || type === 'videos') {
      results.videos = await prisma.mobile_videos.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: searchQuery } },
            { description: { contains: searchQuery } },
            { tags: { contains: searchQuery } }
          ]
        },
        take: parseInt(limit as string)
      });
    }

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: results
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
});

/**
 * POST /api/mobile/home/templates/:id/like
 * Like a template
 */
router.post('/templates/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    // Verify token and get user ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

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

    // Check if user already liked this template
    const existingLike = await prisma.template_likes.findFirst({
      where: {
        templateId: id,
        mobileUserId: userId
      }
    });

    if (existingLike) {
      return res.status(409).json({
        success: false,
        error: 'Template already liked'
      });
    }

    // Create like record
    await prisma.template_likes.create({
      data: {
        id: `tl_${userId}_${id}`,
        templateId: id,
        mobileUserId: userId
      }
    });

    // Update template like count
    await prisma.mobile_templates.update({
      where: { id },
      data: { likes: { increment: 1 } }
    });

    res.json({
      success: true,
      message: 'Template liked successfully'
    });

  } catch (error) {
    console.error('Like template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like template'
    });
  }
});

/**
 * DELETE /api/mobile/home/templates/:id/like
 * Unlike a template
 */
router.delete('/templates/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    // Verify token and get user ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

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

    // Check if user liked this template
    const existingLike = await prisma.template_likes.findFirst({
      where: {
        templateId: id,
        mobileUserId: userId
      }
    });

    if (!existingLike) {
      return res.status(404).json({
        success: false,
        error: 'Template not liked by user'
      });
    }

    // Remove like record
    await prisma.template_likes.delete({
      where: { id: existingLike.id }
    });

    // Update template like count
    await prisma.mobile_templates.update({
      where: { id },
      data: { likes: { decrement: 1 } }
    });

    res.json({
      success: true,
      message: 'Template unliked successfully'
    });

  } catch (error) {
    console.error('Unlike template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlike template'
    });
  }
});

/**
 * POST /api/mobile/home/videos/:id/like
 * Like a video
 */
router.post('/videos/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    // Verify token and get user ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Check if video exists
    const video = await prisma.mobile_videos.findUnique({
      where: { id }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Check if user already liked this video
    const existingLike = await prisma.video_likes.findFirst({
      where: {
        videoId: id,
        mobileUserId: userId
      }
    });

    if (existingLike) {
      return res.status(409).json({
        success: false,
        error: 'Video already liked'
      });
    }

    // Create like record
    await prisma.video_likes.create({
      data: {
        id: `vl_${userId}_${id}`,
        videoId: id,
        mobileUserId: userId
      }
    });

    // Update video like count
    await prisma.mobile_videos.update({
      where: { id },
      data: { likes: { increment: 1 } }
    });

    res.json({
      success: true,
      message: 'Video liked successfully'
    });

  } catch (error) {
    console.error('Like video error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like video'
    });
  }
});

/**
 * DELETE /api/mobile/home/videos/:id/like
 * Unlike a video
 */
router.delete('/videos/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    // Verify token and get user ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Check if video exists
    const video = await prisma.mobile_videos.findUnique({
      where: { id }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Check if user liked this video
    const existingLike = await prisma.video_likes.findFirst({
      where: {
        videoId: id,
        mobileUserId: userId
      }
    });

    if (!existingLike) {
      return res.status(404).json({
        success: false,
        error: 'Video not liked by user'
      });
    }

    // Remove like record
    await prisma.video_likes.delete({
      where: { id: existingLike.id }
    });

    // Update video like count
    await prisma.mobile_videos.update({
      where: { id },
      data: { likes: { decrement: 1 } }
    });

    res.json({
      success: true,
      message: 'Video unliked successfully'
    });

  } catch (error) {
    console.error('Unlike video error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlike video'
    });
  }
});

/**
 * POST /api/mobile/home/templates/:id/download
 * Download a template
 */
router.post('/templates/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    // Verify token and get user ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

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

    // Check if user already downloaded this template
    const existingDownload = await prisma.template_downloads.findFirst({
      where: {
        templateId: id,
        mobileUserId: userId
      }
    });

    if (existingDownload) {
      return res.status(409).json({
        success: false,
        error: 'Template already downloaded'
      });
    }

    // Create download record
    await prisma.template_downloads.create({
      data: {
        id: `td_${userId}_${id}_${Date.now()}`,
        templateId: id,
        mobileUserId: userId
      }
    });

    // Update template download count
    await prisma.mobile_templates.update({
      where: { id },
      data: { downloads: { increment: 1 } }
    });

    // Also record in unified MobileDownload table
    await prisma.mobileDownload.create({
      data: {
        mobileUserId: userId,
        resourceType: 'TEMPLATE',
        resourceId: id,
        fileUrl: template.fileUrl || template.imageUrl
      }
    });

    res.json({
      success: true,
      message: 'Template downloaded successfully',
      data: {
        downloadUrl: template.fileUrl || template.imageUrl // Return file URL for download
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

/**
 * POST /api/mobile/home/videos/:id/download
 * Download a video
 */
router.post('/videos/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    // Verify token and get user ID
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Check if video exists
    const video = await prisma.mobile_videos.findUnique({
      where: { id }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Check if user already downloaded this video
    const existingDownload = await prisma.video_downloads.findFirst({
      where: {
        videoId: id,
        mobileUserId: userId
      }
    });

    if (existingDownload) {
      return res.status(409).json({
        success: false,
        error: 'Video already downloaded'
      });
    }

    // Create download record
    await prisma.video_downloads.create({
      data: {
        id: `vd_${userId}_${id}_${Date.now()}`,
        videoId: id,
        mobileUserId: userId
      }
    });

    // Update video download count
    await prisma.mobile_videos.update({
      where: { id },
      data: { downloads: { increment: 1 } }
    });

    // Also record in unified MobileDownload table
    await prisma.mobileDownload.create({
      data: {
        mobileUserId: userId,
        resourceType: 'VIDEO',
        resourceId: id,
        fileUrl: video.videoUrl
      }
    });

    res.json({
      success: true,
      message: 'Video downloaded successfully',
      data: {
        downloadUrl: video.videoUrl // Return video URL for download
      }
    });

  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download video'
    });
  }
});

/**
 * GET /api/mobile/home/stats
 * Get home screen statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
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
      prisma.mobile_templates.count({ where: { isActive: true } }),
      prisma.mobile_videos.count({ where: { isActive: true } }),
      prisma.greeting_templates.count({ where: { isActive: true } }),
      prisma.template_downloads.count(),
      prisma.video_downloads.count(),
      prisma.greeting_downloads.count(),
      prisma.template_likes.count(),
      prisma.video_likes.count(),
      prisma.greeting_likes.count()
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

export default router;