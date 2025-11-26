import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createId as cuid } from '@paralleldrive/cuid2';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/mobile/greeting-categories
 * Get greeting categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    // Note: greeting_categories table doesn't exist in schema
    // Get unique categories from greeting_templates instead
    const templates = await prisma.greeting_templates.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category']
    });
    
    const categories = templates.map(t => ({ name: t.category, isActive: true }));

    res.json({
      success: true,
      message: 'Greeting categories fetched successfully',
      data: categories
    });

  } catch (error) {
    console.error('Get greeting categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch greeting categories'
    });
  }
});

/**
 * GET /api/mobile/greeting-templates
 * Get greeting templates with filtering and pagination
 * Enhanced to return images from business category when search matches category name
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    let { 
      category, 
      language = 'en', 
      page = '1', 
      limit = '10',
      search,
      isPremium
    } = req.query;
    
    // Decode search parameter to handle double-encoding (e.g., good%2520morning -> good morning)
    if (search) {
      try {
        let decoded = decodeURIComponent(search as string);
        // If still contains encoded characters, decode again (handles double-encoding)
        if (decoded.includes('%')) {
          decoded = decodeURIComponent(decoded);
        }
        search = decoded;
      } catch (e) {
        // If decoding fails, use original search value
        console.log('⚠️  Search parameter decode warning:', (e as Error).message);
      }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Check if search term matches a business category name
    let businessCategoryImages: any[] = [];
    let businessCategoryTotal = 0;
    
    if (search) {
      console.log(`🔍 DEBUG: Starting business category search for: "${search}" - DEPLOYMENT TEST v3`);
      try {
        // First try exact contains match (case insensitive)
        let businessCategory = await prisma.businessCategory.findFirst({
          where: {
            name: {
              contains: search as string,
              mode: 'insensitive'
            },
            isActive: true
          }
        });
        
        // If no exact match and search has multiple words, try word-based matching
        const searchStr = search as string;
        if (!businessCategory && searchStr.includes(' ')) {
          const searchWords = searchStr.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
          console.log(`🔍 Trying word-based search with words: ${searchWords.join(', ')}`);
          
          if (searchWords.length > 0) {
            // Try to find category where at least one word matches
            businessCategory = await prisma.businessCategory.findFirst({
              where: {
                AND: [
                  { isActive: true },
                  {
                    OR: searchWords.map((word: string) => ({
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
          const normalizedSearch = searchStr.toLowerCase().replace(/\s+/g, '');
          console.log(`🔍 Trying normalized search: "${normalizedSearch}"`);
          
          // Get all active business categories and check manually
          const allCategories = await prisma.businessCategory.findMany({
            where: { isActive: true },
            select: { id: true, name: true }
          });
          
          // Find category where any part of the name matches (fuzzy)
          const matchingCategory = allCategories.find((cat: { id: string; name: string }) => {
            const normalizedCat = cat.name.toLowerCase().replace(/\s+/g, '');
            return normalizedCat.includes(normalizedSearch) || normalizedSearch.includes(normalizedCat.substring(0, 10));
          });
          
          if (matchingCategory) {
            businessCategory = await prisma.businessCategory.findUnique({
              where: { id: matchingCategory.id }
            });
          }
        }

        console.log(`🔍 DEBUG: Business category search result:`, businessCategory ? `${businessCategory.name} (${businessCategory.id})` : 'No category found');

        if (businessCategory) {
          console.log(`🎯 Found business category: ${businessCategory.name} for search: ${search}`);
          
          // Search images from this business category
          // Remove the OR condition to get ALL images from the business category, not just those matching the search term in content
          const imageWhere: any = {
            businessCategoryId: businessCategory.id,
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
        const allImages: any[] = [];
        
        for (const category of categoriesWithImages) {
          const categoryImages = await prisma.image.findMany({
            where: {
              businessCategoryId: category.id,
              approvalStatus: 'APPROVED',
              isActive: true
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

        const uniqueCategories = new Set(businessCategoryImages.map((img: any) => img.business_categories?.name)).size;
        console.log(`📸 Default include: ${businessCategoryImages.length} business category images from ${uniqueCategories} categories (no search)`);
      } catch (defaultCategoryError) {
        console.error('Error fetching default business category images:', defaultCategoryError);
        // Fallback to simple query if diversity query fails
        try {
          const imageWhere: any = {
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
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      }
    }

    // Original greeting template search logic
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (language) where.language = language;
    if (isPremium !== undefined) where.isPremium = isPremium === 'true';
    
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
        { tags: { contains: search as string } }
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.greeting_templates.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.greeting_templates.count({ where })
    ]);

    // Prepare response data
    const responseData: any = {
      templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    // If we found business category images, include them in the response
    if (businessCategoryImages.length > 0) {
      responseData.businessCategoryImages = businessCategoryImages;
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

/**
 * GET /api/mobile/greeting-templates/search
 * Search greeting templates
 */
router.get('/templates/search', async (req: Request, res: Response) => {
  try {
    const { 
      q: searchQuery,
      category, 
      language = 'en', 
      page = '1', 
      limit = '10',
      isPremium
    } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const where: any = { 
      isActive: true,
      OR: [
        { title: { contains: searchQuery as string } },
        { description: { contains: searchQuery as string } },
        { tags: { contains: searchQuery as string } }
      ]
    };
    
    if (category) where.category = category;
    if (language) where.language = language;
    if (isPremium !== undefined) where.isPremium = isPremium === 'true';

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [templates, total] = await Promise.all([
      prisma.greeting_templates.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.greeting_templates.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Greeting templates search completed successfully',
      data: {
        templates,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Search greeting templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search greeting templates'
    });
  }
});

/**
 * GET /api/mobile/greeting-templates/:id
 * Get greeting template details by ID
 */
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.greeting_templates.findUnique({
      where: { id }
      // Note: greeting_templates has no relations to likes/downloads in schema
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Greeting template not found'
      });
    }

    res.json({
      success: true,
      message: 'Greeting template details fetched successfully',
      data: template
    });

  } catch (error) {
    console.error('Get greeting template details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch greeting template details'
    });
  }
});

/**
 * POST /api/mobile/greeting-templates/:id/like
 * Like a greeting template
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

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Check if template exists
    const template = await prisma.greeting_templates.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Greeting template not found'
      });
    }

    // Check if already liked
    const existingLike = await prisma.greeting_likes.findFirst({
      where: {
        greetingId: id,
        mobileUserId: userId
      }
    });

    if (existingLike) {
      return res.status(409).json({
        success: false,
        error: 'Greeting template already liked'
      });
    }

    // Create like and update template likes count
    const [like, updatedTemplate] = await Promise.all([
      prisma.greeting_likes.create({
        data: {
          id: `gl_${userId}_${id}`,
          greetingId: id,
          mobileUserId: userId
        }
      }),
      prisma.greeting_templates.update({
        where: { id },
        data: {
          likes: { increment: 1 }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Greeting template liked successfully',
      isLiked: true
    });

  } catch (error) {
    console.error('Like greeting template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like greeting template'
    });
  }
});

/**
 * DELETE /api/mobile/greeting-templates/:id/like
 * Unlike a greeting template
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

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Check if like exists
    const existingLike = await prisma.greeting_likes.findFirst({
      where: {
        greetingId: id,
        mobileUserId: userId
      }
    });

    if (!existingLike) {
      return res.status(404).json({
        success: false,
        error: 'Like not found'
      });
    }

    // Delete like and update template likes count
    const [, updatedTemplate] = await Promise.all([
      prisma.greeting_likes.delete({
        where: { id: existingLike.id }
      }),
      prisma.greeting_templates.update({
        where: { id },
        data: {
          likes: { decrement: 1 }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Greeting template unliked successfully',
      isLiked: false
    });

  } catch (error) {
    console.error('Unlike greeting template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlike greeting template'
    });
  }
});

/**
 * POST /api/mobile/greeting-templates/:id/download
 * Download a greeting template
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

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.id;

    // Check if template exists
    const template = await prisma.greeting_templates.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Greeting template not found'
      });
    }

    // Create download record and update template downloads count
    const [download, updatedTemplate] = await Promise.all([
      prisma.greeting_downloads.create({
        data: {
          id: `gd_${userId}_${id}_${Date.now()}`,
          greetingId: id,
          mobileUserId: userId
        }
      }),
      prisma.greeting_templates.update({
        where: { id },
        data: {
          downloads: { increment: 1 }
        }
      })
    ]);

    // Also record in unified MobileDownload table
    await prisma.mobileDownload.create({
      data: {
        id: cuid(),
        mobileUserId: userId,
        resourceType: 'GREETING',
        resourceId: id,
        fileUrl: template.imageUrl
      }
    });

    res.json({
      success: true,
      message: 'Greeting template download recorded successfully',
      downloadUrl: template.imageUrl
    });

  } catch (error) {
    console.error('Download greeting template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record greeting template download'
    });
  }
});

/**
 * GET /api/mobile/stickers
 * Get stickers
 */
router.get('/stickers', async (req: Request, res: Response) => {
  try {
    const { category, page = '1', limit = '50' } = req.query;

    const where: any = { isActive: true };
    if (category) where.category = category;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Note: stickers model doesn't exist in schema - returning empty array
    res.json({
      success: true,
      message: 'Stickers fetched successfully',
      data: {
        stickers: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          totalPages: 0
        }
      }
    });

  } catch (error) {
    console.error('Get stickers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stickers'
    });
  }
});

/**
 * GET /api/mobile/emojis
 * Get emojis
 */
router.get('/emojis', async (req: Request, res: Response) => {
  try {
    const { category, page = '1', limit = '100' } = req.query;

    const where: any = { isActive: true };
    if (category) where.category = category;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Note: emojis model doesn't exist in schema - returning empty array
    res.json({
      success: true,
      message: 'Emojis fetched successfully',
      data: {
        emojis: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          totalPages: 0
        }
      }
    });

  } catch (error) {
    console.error('Get emojis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emojis'
    });
  }
});

/**
 * GET /api/mobile/greetings
 * Get all greetings (alias for /templates)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', category, search, type } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (search) where.title = { contains: search as string, mode: 'insensitive' };
    if (type) where.type = type;

    const [greetings, total] = await Promise.all([
      prisma.greeting_templates.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.greeting_templates.count({ where })
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

export default router;
