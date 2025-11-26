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
// INSTALLED USER REGISTRATION & MANAGEMENT
// ============================================
// Register new installed user (app install)
router.post('/register', [
    (0, express_validator_1.body)('deviceId').notEmpty().withMessage('Device ID is required'),
    (0, express_validator_1.body)('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone').optional().isLength({ min: 10 }).withMessage('Valid phone number required'),
    (0, express_validator_1.body)('appVersion').optional().isString(),
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
        const { deviceId, name, email, phone, appVersion } = req.body;
        // Check if device already registered
        const existingUser = await prisma.installedUser.findUnique({
            where: { deviceId }
        });
        if (existingUser) {
            // Update last active time
            const updatedUser = await prisma.installedUser.update({
                where: { deviceId },
                data: {
                    lastActiveAt: new Date(),
                    ...(name && { name }),
                    ...(email && { email }),
                    ...(phone && { phone }),
                    ...(appVersion && { appVersion })
                }
            });
            return res.json({
                success: true,
                message: 'User already registered, updated info',
                user: {
                    id: updatedUser.id,
                    deviceId: updatedUser.deviceId,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    userType: 'INSTALLED_USER',
                    canDownload: false,
                    totalViews: updatedUser.totalViews,
                    downloadAttempts: updatedUser.downloadAttempts
                }
            });
        }
        // Create new installed user
        const installedUser = await prisma.installedUser.create({
            data: {
                id: (0, cuid2_1.createId)(),
                deviceId,
                name,
                email,
                phone,
                appVersion,
                installDate: new Date(),
                lastActiveAt: new Date(),
                updatedAt: new Date()
            }
        });
        // Log installation
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                installedUserId: installedUser.id,
                userType: 'INSTALLED_USER',
                action: 'INSTALL',
                resource: 'APP',
                details: `App installed on device: ${deviceId}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Installed user registered successfully',
            user: {
                id: installedUser.id,
                deviceId: installedUser.deviceId,
                name: installedUser.name,
                email: installedUser.email,
                phone: installedUser.phone,
                userType: 'INSTALLED_USER',
                canDownload: false,
                totalViews: installedUser.totalViews,
                downloadAttempts: installedUser.downloadAttempts
            }
        });
    }
    catch (error) {
        console.error('Installed user registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register installed user'
        });
    }
});
// Get list of all installed users (admin endpoint)
router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const isConverted = req.query.isConverted; // boolean as string
        const businessCategory = req.query.businessCategory;
        const followUpStatus = req.query.followUpStatus;
        const paymentStatus = req.query.paymentStatus;
        // Build where clause
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { deviceId: { contains: search } }
            ];
        }
        // Handle isConverted boolean parameter
        if (isConverted !== undefined) {
            where.isConverted = isConverted === 'true';
        }
        // Handle businessCategory filter
        if (businessCategory) {
            where.selectedBusinessCategory = { contains: businessCategory };
        }
        // Handle followUpStatus filter (custom logic based on lastActiveAt)
        if (followUpStatus) {
            const now = new Date();
            switch (followUpStatus) {
                case 'recent':
                    where.lastActiveAt = {
                        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                    };
                    break;
                case 'overdue':
                    where.lastActiveAt = {
                        lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // More than 30 days ago
                    };
                    break;
                case 'never':
                    where.lastActiveAt = null;
                    break;
            }
        }
        // Handle paymentStatus filter (based on subscription status)
        if (paymentStatus) {
            switch (paymentStatus) {
                case 'paid':
                    where.subscriptionStatus = 'ACTIVE';
                    break;
                case 'unpaid':
                    where.subscriptionStatus = { not: 'ACTIVE' };
                    break;
                case 'expired':
                    where.subscriptionStatus = 'EXPIRED';
                    break;
            }
        }
        // Get installed users with pagination
        const [installedUsers, total] = await Promise.all([
            prisma.installedUser.findMany({
                where,
                skip,
                take: limit,
                orderBy: { lastActiveAt: 'desc' },
                select: {
                    id: true,
                    deviceId: true,
                    name: true,
                    email: true,
                    phone: true,
                    appVersion: true,
                    installDate: true,
                    lastActiveAt: true,
                    totalViews: true,
                    downloadAttempts: true,
                    isConverted: true,
                    convertedAt: true,
                    convertedToCustomerId: true
                }
            }),
            prisma.installedUser.count({ where })
        ]);
        // Calculate statistics
        const stats = await Promise.all([
            prisma.installedUser.count({ where: { isConverted: false } }), // Active installed users
            prisma.installedUser.count({ where: { isConverted: true } }), // Converted users
            prisma.installedUser.count({
                where: {
                    isConverted: false,
                    lastActiveAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                    }
                }
            }), // Recently active
            prisma.installedUser.aggregate({
                where: { isConverted: false },
                _avg: { totalViews: true }
            }), // Average views
            prisma.installedUser.aggregate({
                where: { isConverted: false },
                _avg: { downloadAttempts: true }
            }) // Average download attempts
        ]);
        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            data: {
                users: installedUsers.map(user => ({
                    id: user.id,
                    deviceId: user.deviceId,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    appVersion: user.appVersion,
                    installDate: user.installDate,
                    lastActiveAt: user.lastActiveAt,
                    totalViews: user.totalViews,
                    downloadAttempts: user.downloadAttempts,
                    isConverted: user.isConverted,
                    convertedAt: user.convertedAt,
                    convertedToCustomerId: user.convertedToCustomerId,
                    status: user.isConverted ? 'converted' :
                        (user.lastActiveAt && user.lastActiveAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ? 'active' : 'inactive'
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                statistics: {
                    totalInstalledUsers: stats[0],
                    totalConverted: stats[1],
                    recentlyActive: stats[2],
                    averageViews: Math.round(stats[3]._avg.totalViews || 0),
                    averageDownloadAttempts: Math.round(stats[4]._avg.downloadAttempts || 0)
                }
            }
        });
    }
    catch (error) {
        console.error('Get installed users list error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get installed users list'
        });
    }
});
// Get installed user profile
router.get('/profile/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const installedUser = await prisma.installedUser.findUnique({
            where: { deviceId }
        });
        if (!installedUser) {
            return res.status(404).json({
                success: false,
                error: 'Installed user not found'
            });
        }
        res.json({
            success: true,
            user: {
                id: installedUser.id,
                deviceId: installedUser.deviceId,
                name: installedUser.name,
                email: installedUser.email,
                phone: installedUser.phone,
                userType: 'INSTALLED_USER',
                canDownload: false,
                totalViews: installedUser.totalViews,
                downloadAttempts: installedUser.downloadAttempts,
                installDate: installedUser.installDate,
                lastActiveAt: installedUser.lastActiveAt
            }
        });
    }
    catch (error) {
        console.error('Get installed user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user profile'
        });
    }
});
// Update installed user profile
router.put('/profile/:deviceId', [
    (0, express_validator_1.body)('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone').optional().isLength({ min: 10 }).withMessage('Valid phone number required'),
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
        const { deviceId } = req.params;
        const { name, email, phone } = req.body;
        const updatedUser = await prisma.installedUser.update({
            where: { deviceId },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone && { phone }),
                lastActiveAt: new Date()
            }
        });
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                deviceId: updatedUser.deviceId,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                userType: 'INSTALLED_USER',
                canDownload: false
            }
        });
    }
    catch (error) {
        console.error('Update installed user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});
// Track content view (for installed users)
router.post('/track-view', [
    (0, express_validator_1.body)('deviceId').notEmpty().withMessage('Device ID is required'),
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
        const { deviceId, contentId, contentType } = req.body;
        // Update view count for installed user
        await prisma.installedUser.update({
            where: { deviceId },
            data: {
                totalViews: { increment: 1 },
                lastActiveAt: new Date()
            }
        });
        // Update content view count
        if (contentType === 'IMAGE') {
            await prisma.image.update({
                where: { id: contentId },
                data: { views: { increment: 1 } }
            });
        }
        else {
            await prisma.video.update({
                where: { id: contentId },
                data: { views: { increment: 1 } }
            });
        }
        res.json({
            success: true,
            message: 'View tracked successfully'
        });
    }
    catch (error) {
        console.error('Track view error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track view'
        });
    }
});
// Track download attempt (should trigger subscription prompt)
router.post('/track-download-attempt', [
    (0, express_validator_1.body)('deviceId').notEmpty().withMessage('Device ID is required'),
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
        const { deviceId, contentId, contentType } = req.body;
        // Update download attempt count
        const installedUser = await prisma.installedUser.update({
            where: { deviceId },
            data: {
                downloadAttempts: { increment: 1 },
                lastActiveAt: new Date()
            }
        });
        // Log download attempt
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                installedUserId: installedUser.id,
                userType: 'INSTALLED_USER',
                action: 'DOWNLOAD_ATTEMPT',
                resource: contentType,
                resourceId: contentId,
                details: `Download attempt blocked - subscription required`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'BLOCKED'
            }
        });
        res.json({
            success: false,
            error: 'SUBSCRIPTION_REQUIRED',
            message: 'Subscription required to download content',
            data: {
                downloadAttempts: installedUser.downloadAttempts,
                showSubscriptionPrompt: true,
                subscriptionPlans: [
                    {
                        id: 'yearly_pro',
                        name: 'Yearly Pro',
                        price: 1999,
                        period: 'year',
                        savings: '67% OFF'
                    }
                ]
            }
        });
    }
    catch (error) {
        console.error('Track download attempt error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track download attempt'
        });
    }
});
// Convert installed user to customer (after subscription)
router.post('/convert-to-customer', [
    (0, express_validator_1.body)('deviceId').notEmpty().withMessage('Device ID is required'),
    (0, express_validator_1.body)('subscriptionData').notEmpty().withMessage('Subscription data is required'),
    (0, express_validator_1.body)('businessProfile').notEmpty().withMessage('Business profile is required'),
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
        const { deviceId, subscriptionData, businessProfile } = req.body;
        // Find installed user
        const installedUser = await prisma.installedUser.findUnique({
            where: { deviceId }
        });
        if (!installedUser) {
            return res.status(404).json({
                success: false,
                error: 'Installed user not found'
            });
        }
        if (installedUser.isConverted) {
            return res.status(400).json({
                success: false,
                error: 'User already converted to customer'
            });
        }
        // Create customer from installed user
        const customer = await prisma.customer.create({
            data: {
                id: (0, cuid2_1.createId)(),
                name: businessProfile.businessName || installedUser.name || 'Business User',
                email: installedUser.email || businessProfile.businessEmail,
                phone: installedUser.phone || businessProfile.businessPhone,
                selectedBusinessCategoryId: subscriptionData.selectedBusinessCategoryId,
                subscriptionStatus: 'ACTIVE',
                subscriptionStartDate: new Date(),
                subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                subscriptionAmount: subscriptionData.amount,
                paymentMethod: subscriptionData.paymentMethod,
                // Business Profile
                businessName: businessProfile.businessName,
                businessPhone: businessProfile.businessPhone,
                businessEmail: businessProfile.businessEmail,
                businessWebsite: businessProfile.businessWebsite,
                businessAddress: businessProfile.businessAddress,
                businessLogo: businessProfile.businessLogo,
                businessDescription: businessProfile.businessDescription,
                selectedBusinessCategory: businessProfile.businessCategory,
                updatedAt: new Date()
            }
        });
        // Create subscription record
        await prisma.subscriptions.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId: customer.id,
                plan: 'YEARLY',
                planId: 'YEARLY',
                status: 'ACTIVE',
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                updatedAt: new Date()
            }
        });
        // Mark installed user as converted
        await prisma.installedUser.update({
            where: { deviceId },
            data: {
                isConverted: true,
                convertedAt: new Date(),
                convertedToCustomerId: customer.id
            }
        });
        // Log conversion
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId: customer.id,
                userType: 'CUSTOMER',
                action: 'CONVERSION',
                resource: 'SUBSCRIPTION',
                details: `Installed user converted to customer - ${businessProfile.businessName}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Successfully converted to customer',
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                businessName: customer.businessName,
                subscriptionStatus: customer.subscriptionStatus,
                subscriptionEndDate: customer.subscriptionEndDate,
                userType: 'CUSTOMER',
                canDownload: true
            }
        });
    }
    catch (error) {
        console.error('Convert to customer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to convert to customer'
        });
    }
});
exports.default = router;
//# sourceMappingURL=installedUsers.js.map