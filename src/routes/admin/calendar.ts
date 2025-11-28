import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireStaff } from '../../middleware/auth';
import { createId as cuid } from '@paralleldrive/cuid2';
import { imageUpload, CloudinaryService } from '../../services/cloudinaryService';
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all admin calendar routes
router.use(authenticateToken);
router.use(requireStaff);

// Date validation regex
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/admin/calendar/posters
 * Get all calendar posters with filters and pagination
 */
router.get('/posters', async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Date filter
    if (req.query.date) {
      where.date = req.query.date as string;
    } else if (req.query.startDate && req.query.endDate) {
      where.date = {
        gte: req.query.startDate as string,
        lte: req.query.endDate as string
      };
    }

    // Festival name filter
    if (req.query.festivalName) {
      where.festivalName = {
        contains: req.query.festivalName as string,
        mode: 'insensitive'
      };
    }

    // Active status filter
    if (req.query.isActive !== undefined) {
      where.isActive = req.query.isActive === 'true' || req.query.isActive === true;
    }

    // Search filter (searches in name, title, description, festivalName)
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: 'insensitive' } },
        { title: { contains: req.query.search as string, mode: 'insensitive' } },
        { description: { contains: req.query.search as string, mode: 'insensitive' } },
        { festivalName: { contains: req.query.search as string, mode: 'insensitive' } }
      ];
    }

    // Get posters and total count
    const [posters, total] = await Promise.all([
      prisma.calendarPoster.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.calendarPoster.count({ where })
    ]);

    // Transform tags from string to array
    const transformedPosters = posters.map(poster => ({
      ...poster,
      tags: poster.tags ? poster.tags.split(',').map(t => t.trim()) : []
    }));

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    };

    res.json({
      success: true,
      data: {
        posters: transformedPosters,
        pagination
      },
      message: 'Posters fetched successfully'
    });
  } catch (error: any) {
    console.error('Error fetching calendar posters:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch posters'
    });
  }
});

/**
 * GET /api/admin/calendar/posters/:id
 * Get single calendar poster by ID
 */
router.get('/posters/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const poster = await prisma.calendarPoster.findUnique({
      where: { id }
    });

    if (!poster) {
      return res.status(404).json({
        success: false,
        error: 'Poster not found',
        message: `Calendar poster with ID ${id} does not exist`
      });
    }

    // Transform tags
    const transformedPoster = {
      ...poster,
      tags: poster.tags ? poster.tags.split(',').map(t => t.trim()) : []
    };

    res.json({
      success: true,
      data: transformedPoster,
      message: 'Poster fetched successfully'
    });
  } catch (error: any) {
    console.error('Error fetching calendar poster:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch poster'
    });
  }
});

/**
 * POST /api/admin/calendar/posters
 * Create new calendar poster
 */
router.post('/posters', 
  imageUpload.single('image'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('date').matches(DATE_REGEX).withMessage('Date must be in YYYY-MM-DD format')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Please check the provided data',
          details: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Image file is required'
        });
      }

      const {
        name,
        title,
        description,
        date,
        festivalName,
        festivalEmoji,
        category,
        tags,
        isActive
      } = req.body;

      // Upload image to Cloudinary
      const cloudinaryResult = await CloudinaryService.uploadImage(req.file, {
        folder: 'eventmarketers/calendar-posters'
      });

      if (!cloudinaryResult.success) {
        console.error('❌ Cloudinary upload failed:', cloudinaryResult.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to upload image to Cloudinary',
          message: cloudinaryResult.error || 'Image upload failed'
        });
      }

      // Generate thumbnail URL
      const thumbnailUrl = CloudinaryService.getTransformedImageUrl(cloudinaryResult.data.public_id, {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto',
        format: 'auto'
      });

      // Create poster in database
      const poster = await prisma.calendarPoster.create({
        data: {
          name: name.trim(),
          title: title?.trim() || name.trim(),
          description: description?.trim(),
          imageUrl: cloudinaryResult.data.secure_url,
          thumbnailUrl: thumbnailUrl,
          date: date,
          festivalName: festivalName?.trim(),
          festivalEmoji: festivalEmoji?.trim(),
          category: category || 'Festival',
          tags: tags?.trim(),
          isActive: isActive !== 'false' && isActive !== false,
          downloads: 0
        }
      });

      // Log activity
      await prisma.auditLog.create({
        data: {
          id: cuid(),
          adminId: req.user!.userType === 'ADMIN' ? req.user!.id : undefined,
          subadminId: req.user!.userType === 'SUBADMIN' ? req.user!.id : undefined,
          userType: req.user!.userType,
          action: 'CREATE',
          resource: 'CALENDAR_POSTER',
          resourceId: poster.id,
          details: `Created calendar poster: ${poster.name} for date ${poster.date}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'SUCCESS'
        }
      });

      // Transform tags
      const transformedPoster = {
        ...poster,
        tags: poster.tags ? poster.tags.split(',').map(t => t.trim()) : []
      };

      res.status(201).json({
        success: true,
        data: transformedPoster,
        message: 'Calendar poster created successfully'
      });
    } catch (error: any) {
      console.error('Error creating calendar poster:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create poster'
      });
    }
  }
);

/**
 * PUT /api/admin/calendar/posters/:id
 * Update calendar poster
 */
router.put('/posters/:id',
  [
    body('date').optional().matches(DATE_REGEX).withMessage('Date must be in YYYY-MM-DD format'),
    body('festivalEmoji').optional().isLength({ max: 2 }).withMessage('Festival emoji must be 2 characters or less')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Please check the provided data',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const updateData: any = {};

      // Only include fields that are provided
      if (req.body.name !== undefined) updateData.name = req.body.name.trim();
      if (req.body.title !== undefined) updateData.title = req.body.title?.trim();
      if (req.body.description !== undefined) updateData.description = req.body.description?.trim();
      if (req.body.date !== undefined) updateData.date = req.body.date;
      if (req.body.festivalName !== undefined) updateData.festivalName = req.body.festivalName?.trim();
      if (req.body.festivalEmoji !== undefined) updateData.festivalEmoji = req.body.festivalEmoji?.trim();
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.tags !== undefined) updateData.tags = req.body.tags?.trim();
      if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
      }

      // Check if poster exists
      const existingPoster = await prisma.calendarPoster.findUnique({
        where: { id }
      });

      if (!existingPoster) {
        return res.status(404).json({
          success: false,
          error: 'Poster not found',
          message: `Calendar poster with ID ${id} does not exist`
        });
      }

      // Update poster
      const updatedPoster = await prisma.calendarPoster.update({
        where: { id },
        data: updateData
      });

      // Log activity
      await prisma.auditLog.create({
        data: {
          id: cuid(),
          adminId: req.user!.userType === 'ADMIN' ? req.user!.id : undefined,
          subadminId: req.user!.userType === 'SUBADMIN' ? req.user!.id : undefined,
          userType: req.user!.userType,
          action: 'UPDATE',
          resource: 'CALENDAR_POSTER',
          resourceId: id,
          details: `Updated calendar poster: ${updatedPoster.name}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'SUCCESS'
        }
      });

      // Transform tags
      const transformedPoster = {
        ...updatedPoster,
        tags: updatedPoster.tags ? updatedPoster.tags.split(',').map(t => t.trim()) : []
      };

      res.json({
        success: true,
        data: transformedPoster,
        message: 'Poster updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating calendar poster:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update poster'
      });
    }
  }
);

/**
 * DELETE /api/admin/calendar/posters/:id
 * Delete calendar poster
 */
router.delete('/posters/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get poster to delete image
    const poster = await prisma.calendarPoster.findUnique({
      where: { id }
    });

    if (!poster) {
      return res.status(404).json({
        success: false,
        error: 'Poster not found',
        message: `Calendar poster with ID ${id} does not exist`
      });
    }

    // Extract public_id from Cloudinary URL and delete image
    try {
      const urlParts = poster.imageUrl.split('/');
      const publicIdWithExtension = urlParts.slice(-2).join('/');
      const publicId = publicIdWithExtension.split('.')[0];
      
      await CloudinaryService.deleteFile(publicId, 'image');
    } catch (imageError) {
      console.error('Error deleting image from Cloudinary:', imageError);
      // Continue with database deletion even if image deletion fails
    }

    // Delete poster from database
    await prisma.calendarPoster.delete({
      where: { id }
    });

    // Log activity
    await prisma.auditLog.create({
      data: {
        id: cuid(),
        adminId: req.user!.userType === 'ADMIN' ? req.user!.id : undefined,
        subadminId: req.user!.userType === 'SUBADMIN' ? req.user!.id : undefined,
        userType: req.user!.userType,
        action: 'DELETE',
        resource: 'CALENDAR_POSTER',
        resourceId: id,
        details: `Deleted calendar poster: ${poster.name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'SUCCESS'
      }
    });

    res.json({
      success: true,
      message: 'Calendar poster deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting calendar poster:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete poster'
    });
  }
});

/**
 * DELETE /api/admin/calendar/posters/bulk
 * Bulk delete calendar posters
 */
router.delete('/posters/bulk',
  [
    body('posterIds').isArray({ min: 1 }).withMessage('posterIds array is required and must not be empty'),
    body('posterIds.*').isString().withMessage('Each poster ID must be a string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Please check the provided data',
          details: errors.array()
        });
      }

      const { posterIds } = req.body;

      // Get all posters to delete images
      const posters = await prisma.calendarPoster.findMany({
        where: { id: { in: posterIds } }
      });

      // Delete images from Cloudinary (non-blocking)
      posters.forEach(poster => {
        try {
          const urlParts = poster.imageUrl.split('/');
          const publicIdWithExtension = urlParts.slice(-2).join('/');
          const publicId = publicIdWithExtension.split('.')[0];
          CloudinaryService.deleteFile(publicId, 'image').catch(err =>
            console.error('Error deleting image:', err)
          );
        } catch (error) {
          console.error('Error processing image deletion:', error);
        }
      });

      // Delete posters from database
      const results = await Promise.allSettled(
        posterIds.map(id => prisma.calendarPoster.delete({ where: { id } }))
      );

      const successful: any[] = [];
      const failed: any[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push({ id: posterIds[index] });
        } else {
          failed.push({
            id: posterIds[index],
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Log activity
      await prisma.auditLog.create({
        data: {
          id: cuid(),
          adminId: req.user!.userType === 'ADMIN' ? req.user!.id : undefined,
          subadminId: req.user!.userType === 'SUBADMIN' ? req.user!.id : undefined,
          userType: req.user!.userType,
          action: 'BULK_DELETE',
          resource: 'CALENDAR_POSTER',
          details: `Bulk deleted ${successful.length} calendar poster(s)`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'SUCCESS'
        }
      });

      res.json({
        success: true,
        data: {
          summary: {
            total: posterIds.length,
            deleted: successful.length,
            failed: failed.length
          },
          results: { successful, failed }
        },
        message: 'Bulk delete completed successfully'
      });
    } catch (error: any) {
      console.error('Error bulk deleting calendar posters:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete posters'
      });
    }
  }
);

/**
 * POST /api/admin/calendar/posters/bulk-upload
 * Bulk upload multiple images for a single date
 */
router.post('/posters/bulk-upload',
  imageUpload.array('images', 50),
  [
    body('date').matches(DATE_REGEX).withMessage('Date must be in YYYY-MM-DD format')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Please check the provided data',
          details: errors.array()
        });
      }

      const { date, category, isActive } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'At least one image file is required'
        });
      }

      // Upload all images to Cloudinary
      const uploadPromises = files.map(file =>
        CloudinaryService.uploadImage(file, {
          folder: 'eventmarketers/calendar-posters'
        })
      );

      const uploadResults = await Promise.all(uploadPromises);

      // Create posters for each uploaded image
      const createPromises = uploadResults.map(async (uploadResult, index) => {
        if (!uploadResult.success) {
          throw new Error(`Failed to upload image ${index + 1}`);
        }

        const file = files[index];
        const name = path.parse(file.originalname).name;

        // Generate thumbnail URL
        const thumbnailUrl = CloudinaryService.getTransformedImageUrl(uploadResult.data.public_id, {
          width: 300,
          height: 300,
          crop: 'fill',
          quality: 'auto',
          format: 'auto'
        });

        return prisma.calendarPoster.create({
          data: {
            name: name,
            title: name,
            imageUrl: uploadResult.data.secure_url,
            thumbnailUrl: thumbnailUrl,
            date: date,
            category: category || 'Festival',
            isActive: isActive !== 'false' && isActive !== false,
            downloads: 0
          }
        });
      });

      const results = await Promise.allSettled(createPromises);

      const successful: any[] = [];
      const failed: any[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push({
            id: result.value.id,
            name: result.value.name,
            date: result.value.date
          });
        } else {
          failed.push({
            filename: files[index].originalname,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Log activity
      await prisma.auditLog.create({
        data: {
          id: cuid(),
          adminId: req.user!.userType === 'ADMIN' ? req.user!.id : undefined,
          subadminId: req.user!.userType === 'SUBADMIN' ? req.user!.id : undefined,
          userType: req.user!.userType,
          action: 'BULK_UPLOAD',
          resource: 'CALENDAR_POSTER',
          details: `Bulk uploaded ${successful.length} calendar poster(s) for date ${date}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'SUCCESS'
        }
      });

      res.status(201).json({
        success: true,
        data: {
          summary: {
            total: files.length,
            successful: successful.length,
            failed: failed.length
          },
          results: { successful, failed }
        },
        message: 'Bulk upload completed successfully'
      });
    } catch (error: any) {
      console.error('Error bulk uploading calendar posters:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to upload posters'
      });
    }
  }
);

export default router;

