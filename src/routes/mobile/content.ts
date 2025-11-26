import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/mobile/videos
 * Get video content with filtering and pagination
 */
router.get('/videos', async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      language = 'en', 
      type,
      duration,
      page = '1', 
      limit = '10',
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (language) where.language = language;
    if (type) where.type = type;
    
    if (duration) {
      if (duration === 'short') where.duration = { lte: 60 };
      else if (duration === 'medium') where.duration = { gte: 61, lte: 300 };
      else if (duration === 'long') where.duration = { gte: 301 };
    }

    const orderBy: any = {};
    if (sortBy === 'popular') orderBy.downloads = order;
    else if (sortBy === 'likes') orderBy.likes = order;
    else if (sortBy === 'title') orderBy.title = order;
    else orderBy.createdAt = order;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [videos, total] = await Promise.all([
      prisma.mobile_videos.findMany({
        where,
        orderBy,
        skip,
        take
        // Note: mobile_videos has no sourceVideo relation in schema
      }),
      prisma.mobile_videos.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Videos fetched successfully',
      data: {
        videos,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos'
    });
  }
});

/**
 * GET /api/mobile/videos/:id
 * Get video details by ID
 */
router.get('/videos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await prisma.mobile_videos.findUnique({
      where: { id }
      // Note: mobile_videos has no relations to videoLikes/videoDownloads in schema
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    res.json({
      success: true,
      message: 'Video details fetched successfully',
      data: video
    });

  } catch (error) {
    console.error('Get video details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video details'
    });
  }
});

/**
 * POST /api/mobile/videos/:id/like
 * Like a video
 */
router.post('/videos/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mobileUserId } = req.body;

    if (!mobileUserId) {
      return res.status(400).json({
        success: false,
        error: 'Mobile user ID is required'
      });
    }

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

    // Check if already liked
    const existingLike = await prisma.video_likes.findFirst({
      where: {
        videoId: id,
        mobileUserId
      }
    });

    if (existingLike) {
      return res.status(409).json({
        success: false,
        error: 'Video already liked'
      });
    }

    // Create like and update video likes count
    const [like, updatedVideo] = await Promise.all([
      prisma.video_likes.create({
        data: {
          id: `vl_${mobileUserId}_${id}`,
          videoId: id,
          mobileUserId
        }
      }),
      prisma.mobile_videos.update({
        where: { id },
        data: {
          likes: { increment: 1 }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Video liked successfully',
      data: {
        like,
        video: {
          id: updatedVideo.id,
          likes: updatedVideo.likes
        }
      }
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
 * DELETE /api/mobile/videos/:id/like
 * Unlike a video
 */
router.delete('/videos/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mobileUserId } = req.body;

    if (!mobileUserId) {
      return res.status(400).json({
        success: false,
        error: 'Mobile user ID is required'
      });
    }

    // Check if like exists
    const existingLike = await prisma.video_likes.findFirst({
      where: {
        videoId: id,
        mobileUserId
      }
    });

    if (!existingLike) {
      return res.status(404).json({
        success: false,
        error: 'Like not found'
      });
    }

    // Delete like and update video likes count
    const [, updatedVideo] = await Promise.all([
      prisma.video_likes.delete({
        where: { id: existingLike.id }
      }),
      prisma.mobile_videos.update({
        where: { id },
        data: {
          likes: { decrement: 1 }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Video unliked successfully',
      data: {
        video: {
          id: updatedVideo.id,
          likes: updatedVideo.likes
        }
      }
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
 * POST /api/mobile/videos/:id/download
 * Download a video
 */
router.post('/videos/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mobileUserId } = req.body;

    if (!mobileUserId) {
      return res.status(400).json({
        success: false,
        error: 'Mobile user ID is required'
      });
    }

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

    // Create download record and update video downloads count
    const [download, updatedVideo] = await Promise.all([
      prisma.video_downloads.create({
        data: {
          id: `vd_${mobileUserId}_${id}_${Date.now()}`,
          videoId: id,
          mobileUserId
        }
      }),
      prisma.mobile_videos.update({
        where: { id },
        data: {
          downloads: { increment: 1 }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Video download recorded successfully',
      data: {
        download,
        video: {
          id: updatedVideo.id,
          downloads: updatedVideo.downloads,
          videoUrl: updatedVideo.videoUrl
        }
      }
    });

  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record video download'
    });
  }
});

/**
 * GET /api/mobile/videos/search
 * Search videos
 */
router.get('/videos/search', async (req: Request, res: Response) => {
  try {
    const { 
      q, 
      category, 
      language = 'en', 
      type,
      page = '1', 
      limit = '10' 
    } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const where: any = {
      isActive: true,
      OR: [
        { title: { contains: q as string } },
        { description: { contains: q as string } },
        { tags: { contains: q as string } }
      ]
    };

    if (category) where.category = category;
    if (language) where.language = language;
    if (type) where.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [videos, total] = await Promise.all([
      prisma.mobile_videos.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
        // Note: mobile_videos has no sourceVideo relation in schema
      }),
      prisma.mobile_videos.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Video search completed successfully',
      data: {
        videos,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Search videos error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search videos'
    });
  }
});

/**
 * GET /api/mobile/content/templates
 * Get mobile templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', category, search } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (search) where.title = { contains: search as string, mode: 'insensitive' };

    const [templates, total] = await Promise.all([
      prisma.mobile_templates.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
        // Note: mobile_templates has no sourceImage relation in schema
      }),
      prisma.mobile_templates.count({ where })
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

export default router;
