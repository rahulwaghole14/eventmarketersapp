import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();
const router = Router();

/**
 * POST /api/mobile/likes
 * Like any resource (template, video, poster, greeting, etc.)
 */
router.post('/', [
  body('resourceType').isIn(['TEMPLATE', 'VIDEO', 'POSTER', 'GREETING', 'CONTENT']).withMessage('Resource type must be TEMPLATE, VIDEO, POSTER, GREETING, or CONTENT'),
  body('resourceId').notEmpty().withMessage('Resource ID is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resourceType, resourceId } = req.body;
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

    console.log('📥 Like request:', { resourceType, resourceId, userId });

    // Check if already liked
    const existingLike = await prisma.mobileLike.findFirst({
      where: {
        mobileUserId: userId,
        resourceType: resourceType,
        resourceId: resourceId
      }
    });

    if (existingLike) {
      return res.status(409).json({
        success: false,
        error: 'Resource already liked'
      });
    }

    // Create like record
    const like = await prisma.mobileLike.create({
      data: {
        mobileUserId: userId,
        resourceType: resourceType,
        resourceId: resourceId
      }
    });

    console.log('✅ Like created:', like.id);

    res.json({
      success: true,
      message: 'Resource liked successfully',
      data: {
        like,
        isLiked: true
      }
    });

  } catch (error) {
    console.error('❌ Like error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like resource'
    });
  }
});

/**
 * DELETE /api/mobile/likes
 * Unlike any resource
 */
router.delete('/', [
  body('resourceType').isIn(['TEMPLATE', 'VIDEO', 'POSTER', 'GREETING', 'CONTENT']).withMessage('Resource type must be TEMPLATE, VIDEO, POSTER, GREETING, or CONTENT'),
  body('resourceId').notEmpty().withMessage('Resource ID is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { resourceType, resourceId } = req.body;
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

    console.log('📥 Unlike request:', { resourceType, resourceId, userId });

    // Find and delete like record
    const like = await prisma.mobileLike.findFirst({
      where: {
        mobileUserId: userId,
        resourceType: resourceType,
        resourceId: resourceId
      }
    });

    if (!like) {
      return res.status(404).json({
        success: false,
        error: 'Like not found'
      });
    }

    await prisma.mobileLike.delete({
      where: { id: like.id }
    });

    console.log('✅ Like removed:', like.id);

    res.json({
      success: true,
      message: 'Resource unliked successfully',
      data: {
        isLiked: false
      }
    });

  } catch (error) {
    console.error('❌ Unlike error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlike resource'
    });
  }
});

/**
 * GET /api/mobile/likes/user/:userId
 * Get user's likes by type
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { resourceType, page = '1', limit = '20' } = req.query;

    const where: any = { mobileUserId: userId };
    if (resourceType) {
      where.resourceType = resourceType;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [likes, total] = await Promise.all([
      prisma.mobileLike.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.mobileLike.count({ where })
    ]);

    res.json({
      success: true,
      message: 'User likes fetched successfully',
      data: {
        likes,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get user likes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user likes'
    });
  }
});

/**
 * GET /api/mobile/likes/check
 * Check if a resource is liked by user
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    const { resourceType, resourceId } = req.query;
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

    const like = await prisma.mobileLike.findFirst({
      where: {
        mobileUserId: userId,
        resourceType: resourceType as string,
        resourceId: resourceId as string
      }
    });

    res.json({
      success: true,
      message: 'Like status checked successfully',
      data: {
        isLiked: !!like
      }
    });

  } catch (error) {
    console.error('❌ Check like status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check like status'
    });
  }
});

/**
 * GET /api/mobile/likes
 * Get user likes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { mobileUserId, page = '1', limit = '20', resourceType } = req.query;
    
    if (!mobileUserId) {
      return res.status(400).json({
        success: false,
        error: 'Mobile User ID is required'
      });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get likes from different tables based on resource type
    let likes = [];
    let total = 0;

    if (!resourceType || resourceType === 'TEMPLATE') {
      const templateLikes = await prisma.template_likes.findMany({
        where: { mobileUserId: mobileUserId as string },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
        // Note: template_likes has no relation to mobile_templates in schema
      });
      likes = [...likes, ...templateLikes.map(l => ({ ...l, resourceType: 'TEMPLATE' }))];
    }

    if (!resourceType || resourceType === 'VIDEO') {
      const videoLikes = await prisma.video_likes.findMany({
        where: { mobileUserId: mobileUserId as string },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
        // Note: video_likes has no relation to mobile_videos in schema
      });
      likes = [...likes, ...videoLikes.map(l => ({ ...l, resourceType: 'VIDEO' }))];
    }

    if (!resourceType || resourceType === 'GREETING') {
      const greetingLikes = await prisma.greeting_likes.findMany({
        where: { mobileUserId: mobileUserId as string },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
        // Note: greeting_likes has no relation to greeting_templates in schema
      });
      likes = [...likes, ...greetingLikes.map(l => ({ ...l, resourceType: 'GREETING' }))];
    }

    // Sort by creation date
    likes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: {
        likes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: likes.length
        }
      }
    });

  } catch (error) {
    console.error('Get likes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get likes'
    });
  }
});

export default router;
