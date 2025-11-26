"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const subscription_1 = require("../../middleware/subscription");
const cuid2_1 = require("@paralleldrive/cuid2");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/**
 * GET /api/mobile/templates
 * Get templates list with filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const { category, language = 'en', type, page = '1', limit = '10', sortBy = 'createdAt', order = 'desc' } = req.query;
        const where = { isActive: true };
        if (category)
            where.category = category;
        if (language)
            where.language = language;
        if (type)
            where.type = type;
        const orderBy = {};
        if (sortBy === 'popular')
            orderBy.downloads = order;
        else if (sortBy === 'likes')
            orderBy.likes = order;
        else if (sortBy === 'title')
            orderBy.title = order;
        else
            orderBy.createdAt = order;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const [templates, total] = await Promise.all([
            prisma.mobile_templates.findMany({
                where,
                orderBy,
                skip,
                take,
                // Note: mobile_templates has no relation to images in schema
            }),
            prisma.mobile_templates.count({ where })
        ]);
        res.json({
            success: true,
            message: 'Templates fetched successfully',
            data: {
                templates,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates'
        });
    }
});
/**
 * GET /api/mobile/templates/categories
 * Get template categories
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await prisma.businessCategory.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
        });
        res.json({
            success: true,
            message: 'Template categories fetched successfully',
            data: categories
        });
    }
    catch (error) {
        console.error('Get template categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template categories'
        });
    }
});
/**
 * GET /api/mobile/templates/languages
 * Get available languages
 */
router.get('/languages', async (req, res) => {
    try {
        const languages = await prisma.businessCategory.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json({
            success: true,
            message: 'Template languages fetched successfully',
            data: languages
        });
    }
    catch (error) {
        console.error('Get template languages error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template languages'
        });
    }
});
/**
 * GET /api/mobile/templates/search
 * Search templates
 */
router.get('/search', async (req, res) => {
    try {
        const { q, category, language = 'en', type, page = '1', limit = '10' } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }
        const where = {
            isActive: true,
            OR: [
                { title: { contains: q } },
                { description: { contains: q } },
                { tags: { contains: q } }
            ]
        };
        if (category)
            where.category = category;
        if (language)
            where.language = language;
        if (type)
            where.type = type;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const [templates, total] = await Promise.all([
            prisma.mobile_templates.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
                // Note: mobile_templates has no relation to images in schema
            }),
            prisma.mobile_templates.count({ where })
        ]);
        res.json({
            success: true,
            message: 'Template search completed successfully',
            data: {
                templates,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Search templates error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search templates'
        });
    }
});
/**
 * GET /api/mobile/templates/:id
 * Get template details by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const template = await prisma.mobile_templates.findUnique({
            where: { id }
            // Note: mobile_templates has no relation to images, templateLikes, or templateDownloads in schema
        });
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }
        res.json({
            success: true,
            message: 'Template details fetched successfully',
            data: template
        });
    }
    catch (error) {
        console.error('Get template details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch template details'
        });
    }
});
/**
 * POST /api/mobile/templates/:id/like
 * Like a template
 */
router.post('/:id/like', async (req, res) => {
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
        // Check if already liked
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
        // Create like and update template likes count
        const [like, updatedTemplate] = await Promise.all([
            prisma.template_likes.create({
                data: {
                    id: (0, cuid2_1.createId)(),
                    templateId: id,
                    mobileUserId: userId
                }
            }),
            prisma.mobile_templates.update({
                where: { id },
                data: {
                    likes: { increment: 1 }
                }
            })
        ]);
        res.json({
            success: true,
            message: 'Template liked successfully',
            isLiked: true
        });
    }
    catch (error) {
        console.error('Like template error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to like template'
        });
    }
});
/**
 * DELETE /api/mobile/templates/:id/like
 * Unlike a template
 */
router.delete('/:id/like', async (req, res) => {
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        // Check if like exists
        const existingLike = await prisma.template_likes.findFirst({
            where: {
                templateId: id,
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
            prisma.template_likes.delete({
                where: { id: existingLike.id }
            }),
            prisma.mobile_templates.update({
                where: { id },
                data: {
                    likes: { decrement: 1 }
                }
            })
        ]);
        res.json({
            success: true,
            message: 'Template unliked successfully',
            isLiked: false
        });
    }
    catch (error) {
        console.error('Unlike template error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unlike template'
        });
    }
});
/**
 * POST /api/mobile/templates/:id/download
 * Download a template (requires subscription for premium templates)
 */
router.post('/:id/download', subscription_1.checkSubscription, async (req, res) => {
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
        // Check if template is premium and user has subscription
        if (template.category === 'premium' && !req.subscriptionStatus?.isActive) {
            console.log('🔒 Premium template download denied for user:', userId);
            return res.status(403).json({
                success: false,
                error: 'Premium subscription required',
                code: 'SUBSCRIPTION_REQUIRED',
                message: 'This template requires an active premium subscription'
            });
        }
        // Create download record and update template downloads count
        const [download, updatedTemplate] = await Promise.all([
            prisma.template_downloads.create({
                data: {
                    id: (0, cuid2_1.createId)(),
                    templateId: id,
                    mobileUserId: userId
                }
            }),
            prisma.mobile_templates.update({
                where: { id },
                data: {
                    downloads: { increment: 1 }
                }
            })
        ]);
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
            message: 'Template download recorded successfully',
            downloadUrl: template.fileUrl || template.imageUrl
        });
    }
    catch (error) {
        console.error('Download template error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record template download'
        });
    }
});
exports.default = router;
//# sourceMappingURL=templates.js.map