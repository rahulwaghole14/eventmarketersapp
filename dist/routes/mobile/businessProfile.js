"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const BUSINESS_PROFILE_PAYMENT_AMOUNT = parseInt(process.env.BUSINESS_PROFILE_PAYMENT_AMOUNT || '99', 10);
const BUSINESS_PROFILE_PAYMENT_CURRENCY = (process.env.BUSINESS_PROFILE_PAYMENT_CURRENCY || 'INR').toUpperCase();
const BUSINESS_PROFILE_PAYMENT_EXPIRY_DAYS = parseInt(process.env.BUSINESS_PROFILE_PAYMENT_EXPIRY_DAYS || '90', 10);
const BUSINESS_PROFILE_PAYMENT_TYPE = 'BUSINESS_PROFILE';
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
let razorpayInstance = null;
if (razorpayKeyId && razorpayKeySecret) {
    try {
        razorpayInstance = new razorpay_1.default({
            key_id: razorpayKeyId,
            key_secret: razorpayKeySecret
        });
        console.log('✅ Razorpay initialized for business profile payments');
    }
    catch (error) {
        console.warn('⚠️  Razorpay initialization failed for business profile payments:', error instanceof Error ? error.message : error);
        razorpayInstance = null;
    }
}
else {
    console.warn('⚠️  Razorpay credentials missing. Business profile payment endpoints will be disabled until RAZORPAY_KEY_ID/SECRET are provided.');
}
const getPaymentExpiryDate = () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + BUSINESS_PROFILE_PAYMENT_EXPIRY_DAYS);
    return expiry;
};
const normalizeAmount = (value, fallback) => {
    if (value === undefined || value === null)
        return fallback;
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) {
        return fallback;
    }
    return Math.round(num);
};
const expireOldPayments = async (mobileUserId) => {
    try {
        await prisma.businessProfilePayment.updateMany({
            where: {
                mobileUserId,
                status: 'PENDING',
                expiresAt: { lt: new Date() }
            },
            data: { status: 'EXPIRED' }
        });
    }
    catch (error) {
        console.warn('⚠️  Failed to expire old business profile payments:', error);
    }
};
const metadataToObject = (metadata) => {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
        return metadata;
    }
    return {};
};
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/business-profiles';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
// Middleware to extract user ID from JWT token
const extractUserId = (req, res, next) => {
    try {
        console.log('🔐 extractUserId middleware - Processing request');
        console.log('📥 Authorization header:', req.headers.authorization);
        console.log('📥 X-User-ID header:', req.headers['x-user-id']);
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No valid authorization header found');
            return res.status(401).json({
                success: false,
                error: 'Authorization token required'
            });
        }
        const token = authHeader.substring(7);
        console.log('🔑 Token extracted:', token.substring(0, 20) + '...');
        // Try to verify JWT token
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
            console.log('🔍 JWT decoded:', decoded);
            // Extract user ID from token - check for mobile user type
            let userId;
            if (decoded.userType === 'MOBILE_USER' && decoded.id) {
                userId = decoded.id;
                req.userId = userId;
                console.log('✅ Mobile user ID extracted from JWT:', userId);
            }
            else {
                // Fallback to header-based user ID
                userId = req.headers['x-user-id'] || 'demo-user-id';
                req.userId = userId;
                console.log('⚠️ Using fallback user ID:', userId);
            }
            console.log('✅ User ID set from JWT:', userId);
            next();
        }
        catch (jwtError) {
            console.log('⚠️ JWT verification failed, using fallback:', jwtError.message);
            // Fallback to header-based user ID
            const userId = req.headers['x-user-id'] || 'demo-user-id';
            req.userId = userId;
            console.log('✅ User ID set from header fallback:', userId);
            next();
        }
    }
    catch (error) {
        console.log('❌ Error in extractUserId middleware:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid authorization token'
        });
    }
};
/**
 * POST /api/mobile/business-profile/create-payment-order
 * Create Razorpay order for additional business profile
 */
router.post('/create-payment-order', extractUserId, async (req, res) => {
    try {
        const mobileUserId = req.userId;
        if (!mobileUserId) {
            return res.status(401).json({
                success: false,
                error: 'Authorization token required'
            });
        }
        if (!razorpayInstance) {
            return res.status(500).json({
                success: false,
                error: 'Payment gateway not configured',
                details: 'Razorpay credentials are missing on the server'
            });
        }
        await expireOldPayments(mobileUserId);
        const user = await prisma.mobileUser.findUnique({
            where: { id: mobileUserId }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Mobile user not found'
            });
        }
        const amountRupees = normalizeAmount(req.body?.amount, BUSINESS_PROFILE_PAYMENT_AMOUNT);
        const currency = (req.body?.currency || BUSINESS_PROFILE_PAYMENT_CURRENCY).toUpperCase();
        const amountInPaise = Math.round(amountRupees * 100);
        const expiresAt = getPaymentExpiryDate();
        const receipt = `BPAY_${mobileUserId.substring(0, 8)}_${Date.now()}`;
        const razorpayOrder = await razorpayInstance.orders.create({
            amount: amountInPaise,
            currency,
            receipt,
            notes: {
                type: BUSINESS_PROFILE_PAYMENT_TYPE,
                mobileUserId
            }
        });
        await prisma.businessProfilePayment.create({
            data: {
                mobileUserId,
                orderId: razorpayOrder.id,
                amount: amountRupees,
                amountPaise: amountInPaise,
                currency,
                status: 'PENDING',
                type: BUSINESS_PROFILE_PAYMENT_TYPE,
                receipt,
                expiresAt,
                metadata: {
                    type: BUSINESS_PROFILE_PAYMENT_TYPE,
                    userId: mobileUserId,
                    requestedAmount: amountRupees,
                    requestedCurrency: currency
                }
            }
        });
        res.json({
            success: true,
            data: {
                orderId: razorpayOrder.id,
                amount: amountRupees,
                amountInPaise,
                currency,
                razorpayKey: razorpayKeyId,
                expiresAt: expiresAt.toISOString(),
                metadata: {
                    type: BUSINESS_PROFILE_PAYMENT_TYPE.toLowerCase(),
                    userId: mobileUserId
                }
            }
        });
    }
    catch (error) {
        console.error('Create business profile payment order error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to create payment order'
        });
    }
});
/**
 * POST /api/mobile/business-profile/verify-payment
 * Verify Razorpay payment for additional business profile
 */
router.post('/verify-payment', extractUserId, [
    (0, express_validator_1.body)('orderId').notEmpty().withMessage('orderId is required'),
    (0, express_validator_1.body)('paymentId').notEmpty().withMessage('paymentId is required'),
    (0, express_validator_1.body)('signature').notEmpty().withMessage('signature is required')
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
        const mobileUserId = req.userId;
        if (!mobileUserId) {
            return res.status(401).json({
                success: false,
                error: 'Authorization token required'
            });
        }
        if (!razorpayKeySecret) {
            return res.status(500).json({
                success: false,
                error: 'Payment gateway not configured'
            });
        }
        const { orderId, paymentId, signature } = req.body;
        const paymentRecord = await prisma.businessProfilePayment.findFirst({
            where: {
                orderId,
                mobileUserId
            }
        });
        if (!paymentRecord) {
            return res.status(404).json({
                success: false,
                error: 'Payment order not found for this user'
            });
        }
        if (paymentRecord.status === 'VERIFIED') {
            return res.json({
                success: true,
                data: {
                    verified: true,
                    transactionId: paymentRecord.paymentId,
                    message: 'Payment already verified'
                }
            });
        }
        const generatedSignature = crypto_1.default
            .createHmac('sha256', razorpayKeySecret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');
        if (generatedSignature !== signature) {
            await prisma.businessProfilePayment.update({
                where: { id: paymentRecord.id },
                data: {
                    status: 'FAILED',
                    razorpaySignature: signature,
                    metadata: {
                        ...metadataToObject(paymentRecord.metadata),
                        verificationError: 'SIGNATURE_MISMATCH'
                    }
                }
            });
            return res.status(400).json({
                success: false,
                error: 'Invalid payment signature'
            });
        }
        const verifiedPayment = await prisma.businessProfilePayment.update({
            where: { id: paymentRecord.id },
            data: {
                paymentId,
                status: 'VERIFIED',
                razorpaySignature: signature,
                verifiedAt: new Date(),
                metadata: {
                    ...metadataToObject(paymentRecord.metadata),
                    verificationPayload: {
                        amount: req.body.amount || paymentRecord.amount,
                        amountPaise: req.body.amountPaise || paymentRecord.amountPaise,
                        currency: req.body.currency || paymentRecord.currency
                    }
                }
            }
        });
        res.json({
            success: true,
            data: {
                verified: true,
                transactionId: verifiedPayment.paymentId,
                message: 'Payment verified'
            }
        });
    }
    catch (error) {
        console.error('Verify business profile payment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify payment'
        });
    }
});
/**
 * GET /api/mobile/business-profile/payment-status
 * Returns last successful additional profile payment info
 */
router.get('/payment-status', extractUserId, async (req, res) => {
    try {
        const mobileUserId = req.userId;
        if (!mobileUserId) {
            return res.status(401).json({
                success: false,
                error: 'Authorization token required'
            });
        }
        await expireOldPayments(mobileUserId);
        const latestPayment = await prisma.businessProfilePayment.findFirst({
            where: {
                mobileUserId,
                status: 'VERIFIED',
                type: BUSINESS_PROFILE_PAYMENT_TYPE
            },
            orderBy: {
                verifiedAt: 'desc'
            }
        });
        if (!latestPayment) {
            return res.json({
                success: true,
                data: {
                    hasPaid: false,
                    message: 'No payment found',
                    expiresAt: null
                }
            });
        }
        res.json({
            success: true,
            data: {
                hasPaid: true,
                message: 'Valid payment found',
                expiresAt: latestPayment.expiresAt ? latestPayment.expiresAt.toISOString() : null,
                lastPayment: {
                    orderId: latestPayment.orderId,
                    paymentId: latestPayment.paymentId,
                    amount: latestPayment.amount,
                    amountPaise: latestPayment.amountPaise,
                    currency: latestPayment.currency,
                    status: latestPayment.status,
                    verifiedAt: latestPayment.verifiedAt ? latestPayment.verifiedAt.toISOString() : null,
                    createdAt: latestPayment.createdAt.toISOString()
                }
            }
        });
    }
    catch (error) {
        console.error('Get business profile payment status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment status'
        });
    }
});
/**
 * POST /api/mobile/business-profile
 * Create business profile
 */
router.post('/', extractUserId, async (req, res) => {
    try {
        const { businessName, ownerName, email, phone, address, category, logo, description, website, socialMedia } = req.body;
        const mobileUserId = req.userId;
        if (!businessName || !ownerName || !email || !phone || !category) {
            return res.status(400).json({
                success: false,
                error: 'Business name, owner name, email, phone, and category are required'
            });
        }
        // Check if user exists
        const user = await prisma.mobileUser.findUnique({
            where: { id: mobileUserId }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Mobile user not found'
            });
        }
        // Allow users to create multiple business profiles
        // No restriction on existing profiles
        // Create business profile
        const businessProfile = await prisma.businessProfile.create({
            data: {
                mobileUserId,
                businessName,
                businessEmail: email,
                businessPhone: phone,
                alternatePhone: req.body.alternatePhone || '',
                businessAddress: address,
                businessCategory: category,
                businessLogo: logo,
                businessDescription: description,
                businessWebsite: website
            },
            include: {
                mobile_users: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            message: 'Business profile created successfully',
            data: businessProfile
        });
    }
    catch (error) {
        console.error('Create business profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create business profile'
        });
    }
});
/**
 * GET /api/mobile/business-profile
 * Get all business profiles (with pagination and search)
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const category = req.query.category;
        const skip = (page - 1) * limit;
        // Build where clause
        let whereClause = {}; // Note: BusinessProfile has no isActive field
        if (search) {
            whereClause.OR = [
                { businessName: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { ownerName: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (category) {
            whereClause.category = { contains: category, mode: 'insensitive' };
        }
        const [businessProfiles, totalCount] = await Promise.all([
            prisma.businessProfile.findMany({
                where: whereClause,
                include: {
                    mobile_users: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.businessProfile.count({
                where: whereClause
            })
        ]);
        // Note: socialMedia field doesn't exist in BusinessProfile schema
        const profilesWithParsedSocialMedia = businessProfiles;
        res.json({
            success: true,
            message: 'Business profiles fetched successfully',
            data: {
                profiles: profilesWithParsedSocialMedia,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit)
                }
            }
        });
    }
    catch (error) {
        console.error('Get all business profiles error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch business profiles'
        });
    }
});
/**
 * GET /api/mobile/business-profile/:userId
 * Get business profile by user ID
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const businessProfiles = await prisma.businessProfile.findMany({
            where: {
                mobileUserId: userId
            },
            select: {
                id: true,
                businessName: true,
                businessDescription: true,
                businessCategory: true,
                businessAddress: true,
                businessPhone: true,
                alternatePhone: true,
                businessEmail: true,
                businessWebsite: true,
                businessLogo: true,
                createdAt: true,
                mobileUserId: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        if (!businessProfiles || businessProfiles.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No business profiles found for this user'
            });
        }
        // Format profiles to match expected response structure
        const formattedProfiles = businessProfiles.map(profile => {
            return {
                id: profile.id,
                name: profile.businessName,
                description: profile.businessDescription || "",
                category: profile.businessCategory || "",
                address: profile.businessAddress || "",
                phone: profile.businessPhone || "",
                alternatePhone: profile.alternatePhone || "",
                email: profile.businessEmail || "",
                website: profile.businessWebsite || "",
                logo: profile.businessLogo || "",
                createdAt: profile.createdAt
            };
        });
        res.json({
            success: true,
            data: {
                profiles: formattedProfiles
            }
        });
    }
    catch (error) {
        console.error('Get business profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch business profile'
        });
    }
});
/**
 * PUT /api/mobile/business-profile/:id
 * Update business profile
 */
router.put('/:id', extractUserId, async (req, res) => {
    try {
        console.log('🔍 PUT /api/mobile/business-profile/:id - Request received');
        console.log('📥 Request params:', req.params);
        console.log('📥 Request body:', req.body);
        console.log('📥 Request headers:', req.headers);
        const { id } = req.params;
        const mobileUserId = req.userId;
        console.log('👤 User ID from token:', mobileUserId);
        const { businessName, ownerName, email, phone, address, category, logo, description, website, socialMedia } = req.body;
        // Check if business profile exists and belongs to the user
        const existingProfile = await prisma.businessProfile.findFirst({
            where: {
                id,
                mobileUserId
            }
        });
        if (!existingProfile) {
            return res.status(404).json({
                success: false,
                error: 'Business profile not found or access denied'
            });
        }
        // Update business profile
        const updatedProfile = await prisma.businessProfile.update({
            where: { id },
            data: {
                businessName: businessName || undefined,
                businessEmail: email || undefined,
                businessPhone: phone || undefined,
                alternatePhone: req.body.alternatePhone || undefined,
                businessAddress: address || undefined,
                businessCategory: category || undefined,
                businessLogo: logo || undefined,
                businessDescription: description || undefined,
                businessWebsite: website || undefined
            },
            include: {
                mobile_users: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        // Note: socialMedia field doesn't exist in BusinessProfile schema
        const profileData = {
            ...updatedProfile
        };
        res.json({
            success: true,
            message: 'Business profile updated successfully',
            data: profileData
        });
    }
    catch (error) {
        console.error('Update business profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update business profile'
        });
    }
});
/**
 * DELETE /api/mobile/business-profile/:id
 * Delete business profile
 */
router.delete('/:id', extractUserId, async (req, res) => {
    try {
        console.log('🔍 DELETE /api/mobile/business-profile/:id - Request received');
        console.log('📥 Request params:', req.params);
        console.log('📥 Request headers:', req.headers);
        const { id } = req.params;
        const mobileUserId = req.userId;
        console.log('👤 User ID from token:', mobileUserId);
        console.log('🆔 Profile ID to delete:', id);
        // Check if business profile exists and belongs to the user
        console.log('🔍 Searching for profile with ID:', id, 'and user ID:', mobileUserId);
        const existingProfile = await prisma.businessProfile.findFirst({
            where: {
                id,
                mobileUserId
            }
        });
        console.log('🔍 Profile search result:', existingProfile ? 'Found' : 'Not found');
        if (!existingProfile) {
            // Let's also check if the profile exists at all (regardless of ownership)
            const anyProfile = await prisma.businessProfile.findUnique({
                where: { id }
            });
            console.log('🔍 Profile exists in database:', anyProfile ? 'Yes' : 'No');
            if (anyProfile) {
                console.log('🔍 Profile owner:', anyProfile.mobileUserId);
                console.log('🔍 Requesting user:', mobileUserId);
                console.log('🔍 Ownership match:', anyProfile.mobileUserId === mobileUserId);
            }
            return res.status(404).json({
                success: false,
                error: 'Business profile not found or access denied'
            });
        }
        // Soft delete by setting isActive to false
        // Note: BusinessProfile doesn't have isActive field - using delete instead
        await prisma.businessProfile.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Business profile deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete business profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete business profile'
        });
    }
});
/**
 * POST /api/mobile/business-profile/:id/upload
 * Upload business profile image (logo)
 */
router.post('/:id/upload', extractUserId, upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const mobileUserId = req.userId;
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        // Check if business profile exists and belongs to the user
        const existingProfile = await prisma.businessProfile.findFirst({
            where: {
                id,
                mobileUserId
            }
        });
        if (!existingProfile) {
            return res.status(404).json({
                success: false,
                error: 'Business profile not found or access denied'
            });
        }
        // Update the profile with the new logo URL
        const logoUrl = `/uploads/business-profiles/${req.file.filename}`;
        const updatedProfile = await prisma.businessProfile.update({
            where: { id },
            data: { businessLogo: logoUrl },
            include: {
                mobile_users: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url: logoUrl,
                profile: updatedProfile
            }
        });
    }
    catch (error) {
        console.error('Upload business profile image error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload image'
        });
    }
});
exports.default = router;
//# sourceMappingURL=businessProfile.js.map