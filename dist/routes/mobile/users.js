"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
const cuid2_1 = require("@paralleldrive/cuid2");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cloudinaryService_1 = require("../../services/cloudinaryService");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/**
 * POST /api/mobile/users/:userId/upload-logo
 * Upload user profile logo
 * MUST come before /:id routes to avoid route conflicts
 */
router.post('/:userId/upload-logo', cloudinaryService_1.logoUpload.single('logo'), async (req, res) => {
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
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
            authenticatedUserId = decoded.id;
        }
        catch (jwtError) {
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
        }
        else {
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
        const thumbnailUrl = publicId ? cloudinaryService_1.CloudinaryService.getLogoThumbnailUrl(publicId) : logoUrl;
        res.json({
            success: true,
            message: 'Logo uploaded successfully',
            data: {
                logo: logoUrl,
                thumbnail: thumbnailUrl
            }
        });
    }
    catch (error) {
        console.error('Logo upload error:', error);
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
            message: 'Failed to upload logo'
        });
    }
});
/**
 * GET /api/mobile/users/:id
 * Get user profile
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.mobileUser.findUnique({
            where: { id },
            include: {
                business_profiles: true,
                mobile_subscriptions: {
                    orderBy: { createdAt: 'desc' }
                }
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
            message: 'User profile fetched successfully',
            data: user
        });
    }
    catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile'
        });
    }
});
/**
 * PUT /api/mobile/users/:id
 * Update user profile
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, deviceId, description, category, address, alternatePhone, website, companyLogo, logo } = req.body;
        // Validate logo URL if provided
        const logoUrl = logo || companyLogo;
        if (logoUrl !== undefined && !(0, cloudinaryService_1.isValidLogoUrl)(logoUrl)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_LOGO_URL',
                message: 'Invalid logo URL. Please upload the image file using the upload endpoint.'
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
        // Update user
        const updatedUser = await prisma.mobileUser.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                deviceId,
                lastActiveAt: new Date()
            }
        });
        // Update business profile logo if provided
        if (logoUrl !== undefined) {
            const businessProfile = await prisma.businessProfile.findFirst({
                where: { mobileUserId: id },
                orderBy: { createdAt: 'desc' }
            });
            if (businessProfile) {
                await prisma.businessProfile.update({
                    where: { id: businessProfile.id },
                    data: { businessLogo: logoUrl || null }
                });
            }
            else if (logoUrl) {
                // Create new business profile if it doesn't exist and logo is provided
                await prisma.businessProfile.create({
                    data: {
                        mobileUserId: id,
                        businessName: updatedUser.name || 'My Business',
                        businessEmail: updatedUser.email || '',
                        businessPhone: updatedUser.phone || '',
                        businessLogo: logoUrl
                    }
                });
            }
        }
        res.json({
            success: true,
            message: 'User profile updated successfully',
            data: updatedUser
        });
    }
    catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user profile'
        });
    }
});
/**
 * GET /api/mobile/users/:id/activities
 * Get user activities
 */
router.get('/:id/activities', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = '1', limit = '20', action, resourceType } = req.query;
        const where = { mobileUserId: id };
        if (action)
            where.action = action;
        if (resourceType)
            where.resourceType = resourceType;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const [activities, total] = await Promise.all([
            prisma.mobileActivity.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.mobileActivity.count({ where })
        ]);
        res.json({
            success: true,
            message: 'User activities fetched successfully',
            data: {
                activities,
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
        console.error('Get user activities error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user activities'
        });
    }
});
/**
 * POST /api/mobile/users/:id/activities
 * Create user activity
 */
router.post('/:id/activities', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, resourceType, resourceId, metadata } = req.body;
        if (!action || !resourceType) {
            return res.status(400).json({
                success: false,
                error: 'Action and resource type are required'
            });
        }
        // Check if user exists
        const user = await prisma.mobileUser.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Create activity
        const activity = await prisma.mobileActivity.create({
            data: {
                id: (0, cuid2_1.createId)(),
                mobileUserId: id,
                action,
                resource: resourceType || 'unknown',
                resourceType,
                resourceId,
            }
        });
        res.status(201).json({
            success: true,
            message: 'User activity created successfully',
            data: activity
        });
    }
    catch (error) {
        console.error('Create user activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user activity'
        });
    }
});
/**
 * GET /api/mobile/users/:id/likes
 * Get user's likes
 */
router.get('/:id/likes', async (req, res) => {
    try {
        const { id } = req.params;
        const { resourceType, page = '1', limit = '20' } = req.query;
        const where = { mobileUserId: id };
        if (resourceType)
            where.resourceType = resourceType;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
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
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get user likes error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user likes'
        });
    }
});
/**
 * GET /api/mobile/users/:id/downloads/all
 * Get all user's downloads (templates, videos, greeting templates)
 */
router.get('/:id/downloads/all', async (req, res) => {
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
                    mobile_users: {
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
    }
    catch (error) {
        console.error('Get all user downloads error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch all user downloads'
        });
    }
});
/**
 * GET /api/mobile/users/:id/downloads/stats
 * Get user's download statistics
 */
router.get('/:id/downloads/stats', async (req, res) => {
    try {
        const { id } = req.params;
        // Get download statistics by type
        const [templateCount, videoCount, greetingCount, contentCount, totalCount] = await Promise.all([
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
            }),
            prisma.mobileDownload.count({
                where: { mobileUserId: id }
            })
        ]);
        // Get recent downloads (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentCount = await prisma.mobileDownload.count({
            where: {
                mobileUserId: id,
                downloadedAt: {
                    gte: oneWeekAgo
                }
            }
        });
        // Get most downloaded content types
        const mostDownloadedType = await prisma.mobileDownload.groupBy({
            by: ['resourceType'],
            where: { mobileUserId: id },
            _count: { resourceType: true },
            orderBy: { _count: { resourceType: 'desc' } },
            take: 1
        });
        res.json({
            success: true,
            message: 'User download statistics fetched successfully',
            data: {
                total: totalCount,
                recent: recentCount,
                byType: {
                    templates: templateCount,
                    videos: videoCount,
                    greetings: greetingCount,
                    content: contentCount
                },
                mostDownloadedType: mostDownloadedType[0]?.resourceType || null,
                mostDownloadedCount: mostDownloadedType[0]?._count.resourceType || 0
            }
        });
    }
    catch (error) {
        console.error('Get user download stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user download statistics'
        });
    }
});
/**
 * GET /api/mobile/users/:id/downloads
 * Get user's downloads
 */
router.get('/:id/downloads', async (req, res) => {
    try {
        const { id } = req.params;
        const { resourceType, page = '1', limit = '20' } = req.query;
        const where = { mobileUserId: id };
        if (resourceType)
            where.resourceType = resourceType;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
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
                orderBy: { downloadedAt: 'desc' },
                skip,
                take
            }),
            prisma.mobileDownload.count({ where })
        ]);
        // Fetch actual resource details for each download
        const downloadsWithDetails = await Promise.all(downloads.map(async (d) => {
            let title = `Resource ${d.resourceId}`;
            let downloadUrl = d.fileUrl || '';
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
                        }
                        else {
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
                        }
                        else {
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
            }
            catch (err) {
                console.error(`Error fetching resource ${d.resourceId} (${d.resourceType}):`, err.message);
                // Keep default title and URL if fetch fails
            }
            // Clean up file:// URLs (local cache paths) - if we still have a file:// URL after fetching resource,
            // it means the resource wasn't found or didn't have a valid URL, so we should return empty instead
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
        }));
        res.json({
            success: true,
            message: 'User downloads fetched successfully',
            data: {
                downloads: downloadsWithDetails,
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
        console.error('Get user downloads error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user downloads'
        });
    }
});
/**
 * GET /api/mobile/users/:id/preferences
 * Get user preferences
 */
router.get('/:id/preferences', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists
        const user = await prisma.mobileUser.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Return default preferences for now (until UserPreferences model is created)
        const defaultPreferences = {
            userId: id,
            notificationsEnabled: true,
            darkModeEnabled: false,
            defaultViewMode: 'grid',
            preferredCategories: [],
            language: 'en',
            autoSave: true,
            highQualityDownloads: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        res.json({
            success: true,
            message: 'User preferences fetched successfully',
            data: defaultPreferences
        });
    }
    catch (error) {
        console.error('Get user preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user preferences'
        });
    }
});
/**
 * PUT /api/mobile/users/:id/preferences
 * Update user preferences
 */
router.put('/:id/preferences', async (req, res) => {
    try {
        const { id } = req.params;
        const { notificationsEnabled, darkModeEnabled, defaultViewMode, preferredCategories, language, autoSave, highQualityDownloads } = req.body;
        // Check if user exists
        const user = await prisma.mobileUser.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Return updated preferences for now (until UserPreferences model is created)
        const updatedPreferences = {
            userId: id,
            notificationsEnabled: notificationsEnabled ?? true,
            darkModeEnabled: darkModeEnabled ?? false,
            defaultViewMode: defaultViewMode ?? 'grid',
            preferredCategories: preferredCategories ?? [],
            language: language ?? 'en',
            autoSave: autoSave ?? true,
            highQualityDownloads: highQualityDownloads ?? true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        res.json({
            success: true,
            message: 'User preferences updated successfully',
            data: updatedPreferences
        });
    }
    catch (error) {
        console.error('Update user preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user preferences'
        });
    }
});
/**
 * GET /api/mobile/users/:id/stats
 * Get user statistics
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists
        const user = await prisma.mobileUser.findUnique({
            where: { id }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Get various statistics
        const [businessProfileCount, businessProfileRecentCount, templateLikeCount, videoLikeCount, greetingLikeCount, templateLikeRecentCount, videoLikeRecentCount, greetingLikeRecentCount, downloadCount, downloadRecentCount] = await Promise.all([
            // Business profiles
            prisma.businessProfile.count({
                where: { mobileUserId: id }
            }),
            prisma.businessProfile.count({
                where: {
                    mobileUserId: id,
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                    }
                }
            }),
            // Likes counts
            prisma.template_likes.count({
                where: { mobileUserId: id }
            }),
            prisma.video_likes.count({
                where: { mobileUserId: id }
            }),
            prisma.greeting_likes.count({
                where: { mobileUserId: id }
            }),
            // Recent likes counts
            prisma.template_likes.count({
                where: {
                    mobileUserId: id,
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            prisma.video_likes.count({
                where: {
                    mobileUserId: id,
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            prisma.greeting_likes.count({
                where: {
                    mobileUserId: id,
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),
            // Downloads
            prisma.mobileDownload.count({
                where: { mobileUserId: id }
            }),
            // Recent downloads
            prisma.mobileDownload.count({
                where: {
                    mobileUserId: id,
                    downloadedAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);
        // Calculate totals
        const likeCount = templateLikeCount + videoLikeCount + greetingLikeCount;
        const likeRecentCount = templateLikeRecentCount + videoLikeRecentCount + greetingLikeRecentCount;
        res.json({
            success: true,
            message: 'User statistics fetched successfully',
            data: {
                business_profiles: {
                    total: businessProfileCount,
                    recentCount: businessProfileRecentCount
                },
                likes: {
                    total: likeCount,
                    recentCount: likeRecentCount,
                    byType: {
                        template: templateLikeCount,
                        video: videoLikeCount,
                        greeting: greetingLikeCount,
                        businessProfile: 0 // Not implemented yet
                    }
                },
                downloads: {
                    total: downloadCount,
                    recentCount: downloadRecentCount
                }
            }
        });
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user statistics'
        });
    }
});
/**
 * GET /api/mobile/users/profile
 * Get current user profile (requires authentication)
 */
router.get('/profile', async (req, res) => {
    try {
        // This would typically get the user ID from the authenticated token
        // For now, we'll use a placeholder user ID
        const userId = req.query.userId || 'default_user_id';
        const user = await prisma.mobileUser.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                deviceId: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
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
            data: { user }
        });
    }
    catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user profile'
        });
    }
});
/**
 * PUT /api/mobile/users/profile
 * Update current user profile (requires authentication)
 */
router.put('/profile', [
    (0, express_validator_1.body)('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email required')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        // This would typically get the user ID from the authenticated token
        // For now, we'll use a placeholder user ID
        const userId = req.body.userId || 'default_user_id';
        const { name, phone, email } = req.body;
        const updateData = {};
        if (name)
            updateData.name = name;
        if (phone)
            updateData.phone = phone;
        if (email)
            updateData.email = email;
        const user = await prisma.mobileUser.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                deviceId: true,
                isActive: true,
                updatedAt: true
            }
        });
        res.json({
            success: true,
            data: { user },
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user profile'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map