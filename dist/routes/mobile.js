"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const cuid2_1 = require("@paralleldrive/cuid2");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// ============================================
// CUSTOMER REGISTRATION & AUTHENTICATION
// ============================================
// Customer registration
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    (0, express_validator_1.body)('selectedBusinessCategoryId').notEmpty().withMessage('Business category selection is required'),
    (0, express_validator_1.body)('deviceId').notEmpty().withMessage('Device ID is required'),
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
        const { email, name, phone, selectedBusinessCategoryId, deviceId, appVersion } = req.body;
        // Check if customer already exists
        const existingCustomer = await prisma.customer.findUnique({
            where: { email }
        });
        if (existingCustomer) {
            return res.status(400).json({
                success: false,
                error: 'Customer already registered'
            });
        }
        // Verify business category exists
        const businessCategory = await prisma.businessCategory.findUnique({
            where: { id: selectedBusinessCategoryId }
        });
        if (!businessCategory) {
            return res.status(400).json({
                success: false,
                error: 'Invalid business category'
            });
        }
        // Create customer
        const customer = await prisma.customer.create({
            data: {
                id: (0, cuid2_1.createId)(),
                email,
                name,
                phone,
                selectedBusinessCategoryId,
                subscriptionStatus: 'INACTIVE', // Will be activated after payment
                updatedAt: new Date()
            },
            include: {
                business_profiles: {
                    select: { businessName: true }
                }
            }
        });
        // Log registration
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId: customer.id,
                userType: 'CUSTOMER',
                action: 'REGISTER',
                resource: 'CUSTOMER',
                resourceId: customer.id,
                details: `Customer registered: ${customer.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            customer: {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                selectedBusinessCategory: customer.selectedBusinessCategory,
                subscriptionStatus: customer.subscriptionStatus
            }
        });
    }
    catch (error) {
        console.error('Customer registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});
// Activate subscription (after payment)
router.post('/activate-subscription', [
    (0, express_validator_1.body)('customerId').notEmpty().withMessage('Customer ID is required'),
    (0, express_validator_1.body)('paymentId').notEmpty().withMessage('Payment ID is required'),
    (0, express_validator_1.body)('amount').isNumeric().withMessage('Valid amount is required'),
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
        const { customerId, paymentId, amount, paymentMethod } = req.body;
        // Find customer
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }
        // Create subscription
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
        const subscription = await prisma.subscriptions.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId,
                plan: 'YEARLY',
                planId: 'YEARLY',
                status: 'ACTIVE',
                startDate,
                endDate,
                updatedAt: new Date()
            }
        });
        // Update customer subscription status
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                subscriptionStatus: 'ACTIVE',
                subscriptionStartDate: startDate,
                subscriptionEndDate: endDate,
                subscriptionAmount: parseFloat(amount),
                paymentMethod: paymentMethod || 'card'
            }
        });
        // Log subscription activation
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId,
                userType: 'CUSTOMER',
                action: 'ACTIVATE_SUBSCRIPTION',
                resource: 'SUBSCRIPTION',
                resourceId: subscription.id,
                details: `Activated yearly subscription - $${amount}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Subscription activated successfully',
            subscription: {
                id: subscription.id,
                plan: subscription.plan,
                planId: subscription.planId,
                status: subscription.status,
                startDate: subscription.startDate,
                endDate: subscription.endDate
            }
        });
    }
    catch (error) {
        console.error('Activate subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to activate subscription'
        });
    }
});
// ============================================
// CONTENT ACCESS FOR MOBILE APP
// ============================================
// Get available content for customer
router.get('/content/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { category, page = 1, limit = 20 } = req.query;
        // Find customer and verify subscription
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
            // Note: selectedBusinessCategory is a field, not a relation
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }
        if (customer.subscriptionStatus !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: 'Active subscription required'
            });
        }
        // Check if subscription is expired
        if (customer.subscriptionEndDate && customer.subscriptionEndDate < new Date()) {
            await prisma.customer.update({
                where: { id: customerId },
                data: { subscriptionStatus: 'EXPIRED' }
            });
            return res.status(403).json({
                success: false,
                error: 'Subscription expired'
            });
        }
        // Build content filter based on customer's access
        const contentFilter = {
            approvalStatus: 'APPROVED',
            OR: [
                { category: 'FESTIVAL' }, // All customers can access festival content
                { category: 'GENERAL' }, // All customers can access general content
            ]
        };
        // Add business category access if customer has selected one
        if (customer.selectedBusinessCategoryId) {
            contentFilter.OR.push({
                category: 'BUSINESS',
                businessCategoryId: customer.selectedBusinessCategoryId
            });
        }
        // Add category filter if specified
        if (category && ['BUSINESS', 'FESTIVAL', 'GENERAL'].includes(category)) {
            contentFilter.category = category;
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        // Get images and videos
        const [images, videos, totalImages, totalVideos] = await Promise.all([
            prisma.image.findMany({
                where: contentFilter,
                include: {
                    business_categories: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.video.findMany({
                where: contentFilter,
                include: {
                    business_categories: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.image.count({ where: contentFilter }),
            prisma.video.count({ where: contentFilter })
        ]);
        res.json({
            success: true,
            content: {
                images,
                videos,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalImages,
                    totalVideos,
                    totalPages: Math.ceil(Math.max(totalImages, totalVideos) / parseInt(limit))
                }
            },
            customerAccess: {
                selectedBusinessCategory: customer.selectedBusinessCategory,
                subscriptionStatus: customer.subscriptionStatus,
                subscriptionEndDate: customer.subscriptionEndDate
            }
        });
    }
    catch (error) {
        console.error('Get customer content error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch content'
        });
    }
});
// Download content (track downloads)
router.post('/download', [
    (0, express_validator_1.body)('customerId').notEmpty().withMessage('Customer ID is required'),
    (0, express_validator_1.body)('contentId').notEmpty().withMessage('Content ID is required'),
    (0, express_validator_1.body)('contentType').isIn(['IMAGE', 'VIDEO']).withMessage('Content type must be IMAGE or VIDEO'),
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
        const { customerId, contentId, contentType } = req.body;
        // Verify customer subscription
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });
        if (!customer || customer.subscriptionStatus !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                error: 'Active subscription required'
            });
        }
        // Track download
        const downloadData = {
            customerId,
            contentType,
            deviceInfo: req.get('User-Agent'),
            ipAddress: req.ip
        };
        if (contentType === 'IMAGE') {
            downloadData.imageId = contentId;
            // Increment image download count
            await prisma.image.update({
                where: { id: contentId },
                data: { downloads: { increment: 1 } }
            });
        }
        else {
            downloadData.videoId = contentId;
            // Increment video download count
            await prisma.video.update({
                where: { id: contentId },
                data: { downloads: { increment: 1 } }
            });
        }
        // Track download in audit log instead
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId,
                userType: 'CUSTOMER',
                action: 'DOWNLOAD',
                resource: contentType,
                resourceId: contentId,
                details: `Downloaded ${contentType.toLowerCase()}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        // Update customer total downloads
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                totalDownloads: { increment: 1 },
                lastActiveAt: new Date()
            }
        });
        res.json({
            success: true,
            message: 'Download tracked successfully'
        });
    }
    catch (error) {
        console.error('Track download error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track download'
        });
    }
});
// Get customer profile
router.get('/profile/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                business_profiles: {
                    select: { businessName: true }
                },
                subscriptions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }
        res.json({
            success: true,
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                selectedBusinessCategory: customer.selectedBusinessCategory,
                subscriptionStatus: customer.subscriptionStatus,
                subscriptionEndDate: customer.subscriptionEndDate,
                totalDownloads: customer.totalDownloads,
                lastActiveAt: customer.lastActiveAt,
                createdAt: customer.createdAt
            }
        });
    }
    catch (error) {
        console.error('Get customer profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer profile'
        });
    }
});
// Get available business categories for selection
router.get('/business-categories', async (req, res) => {
    try {
        console.log('🔍 Testing business categories endpoint...');
        // Test basic database connection first
        const count = await prisma.businessCategory.count();
        console.log('📊 Total business categories:', count);
        if (count === 0) {
            return res.json({
                success: true,
                categories: [],
                message: 'No business categories found'
            });
        }
        const categories = await prisma.businessCategory.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                isActive: true
            }
        });
        console.log('📋 Retrieved categories:', categories.length);
        res.json({
            success: true,
            categories: categories.filter(cat => cat.isActive)
        });
    }
    catch (error) {
        console.error('❌ Get business categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch business categories',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * GET /api/mobile/business-categories/business
 * Get business categories under the "BUSINESS" main category
 */
router.get('/business-categories/business', async (req, res) => {
    try {
        console.log('🔍 Fetching BUSINESS main category categories...');
        // Get business categories with mainCategory = 'BUSINESS'
        const categories = await prisma.businessCategory.findMany({
            where: {
                mainCategory: 'BUSINESS',
                isActive: true
            },
            select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                mainCategory: true,
                sortOrder: true,
                isActive: true
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' }
            ]
        });
        console.log(`📋 Retrieved ${categories.length} BUSINESS categories`);
        // Get content counts for each category
        const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
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
                description: category.description,
                icon: category.icon,
                mainCategory: category.mainCategory,
                posterCount: imageCount,
                videoCount: videoCount,
                totalContent: imageCount + videoCount,
                sortOrder: category.sortOrder
            };
        }));
        res.json({
            success: true,
            message: `Retrieved ${categoriesWithCounts.length} business categories under BUSINESS main category`,
            data: {
                categories: categoriesWithCounts,
                total: categoriesWithCounts.length,
                mainCategory: 'BUSINESS'
            }
        });
    }
    catch (error) {
        console.error('❌ Get BUSINESS categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch BUSINESS categories',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=mobile.js.map