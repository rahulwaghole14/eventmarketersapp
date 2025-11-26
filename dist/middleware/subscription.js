"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPremiumAccess = exports.checkSubscription = exports.requireSubscription = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Middleware to check if user has active subscription
 * This middleware should be used for premium features
 */
const requireSubscription = async (req, res, next) => {
    try {
        // Extract user ID from JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authorization token required'
            });
        }
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
        // Extract user ID from token - check for mobile user type
        let userId;
        if (decoded.userType === 'MOBILE_USER' && decoded.id) {
            userId = decoded.id;
            req.userId = userId;
            console.log('✅ Mobile user ID extracted from JWT:', userId);
        }
        else {
            return res.status(401).json({
                success: false,
                error: 'Invalid user type or missing user ID'
            });
        }
        console.log('🔐 Checking subscription for user:', userId);
        // Check if user has an active subscription
        const activeSubscription = await prisma.mobileSubscription.findFirst({
            where: {
                mobileUserId: userId,
                status: 'ACTIVE',
                endDate: { gte: new Date() } // Subscription not expired
            },
            // Note: plan field exists but has no relation in schema
            orderBy: { createdAt: 'desc' }
        });
        if (activeSubscription) {
            // Add subscription info to request
            req.subscriptionStatus = {
                isActive: true,
                planId: activeSubscription.planId,
                planName: activeSubscription.plan,
                expiryDate: activeSubscription.endDate,
                status: activeSubscription.status
            };
            console.log('✅ User has active subscription:', activeSubscription.plan);
            next();
        }
        else {
            console.log('❌ User does not have active subscription');
            return res.status(403).json({
                success: false,
                error: 'Premium subscription required',
                code: 'SUBSCRIPTION_REQUIRED',
                message: 'This feature requires an active premium subscription'
            });
        }
    }
    catch (error) {
        console.error('❌ Subscription middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify subscription status'
        });
    }
};
exports.requireSubscription = requireSubscription;
/**
 * Middleware to check subscription status without blocking
 * This middleware adds subscription info to request but doesn't block access
 */
const checkSubscription = async (req, res, next) => {
    try {
        // Extract user ID from JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.subscriptionStatus = {
                isActive: false,
                status: 'inactive'
            };
            return next();
        }
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'business-marketing-platform-super-secret-jwt-key-2024');
        // Extract user ID from token - check for mobile user type
        let userId;
        if (decoded.userType === 'MOBILE_USER' && decoded.id) {
            userId = decoded.id;
            req.userId = userId;
            console.log('✅ Mobile user ID extracted from JWT:', userId);
        }
        else {
            req.subscriptionStatus = {
                isActive: false,
                status: 'inactive'
            };
            return next();
        }
        console.log('🔍 Checking subscription status for user:', userId);
        // Check if user has an active subscription
        const activeSubscription = await prisma.mobileSubscription.findFirst({
            where: {
                mobileUserId: userId,
                status: 'ACTIVE',
                endDate: { gte: new Date() }
            },
            // Note: plan field exists but has no relation in schema
            orderBy: { createdAt: 'desc' }
        });
        if (activeSubscription) {
            req.subscriptionStatus = {
                isActive: true,
                planId: activeSubscription.planId,
                planName: activeSubscription.plan,
                expiryDate: activeSubscription.endDate,
                status: activeSubscription.status
            };
            console.log('✅ User has active subscription:', activeSubscription.plan);
        }
        else {
            req.subscriptionStatus = {
                isActive: false,
                status: 'inactive'
            };
            console.log('❌ User does not have active subscription');
        }
        next();
    }
    catch (error) {
        console.error('❌ Subscription check middleware error:', error);
        req.subscriptionStatus = {
            isActive: false,
            status: 'inactive'
        };
        next();
    }
};
exports.checkSubscription = checkSubscription;
/**
 * Helper function to check if user has premium access
 */
const hasPremiumAccess = (subscriptionStatus) => {
    if (!subscriptionStatus)
        return false;
    return subscriptionStatus.isActive &&
        subscriptionStatus.status === 'ACTIVE' &&
        (subscriptionStatus.expiryDate ? new Date(subscriptionStatus.expiryDate) > new Date() : true);
};
exports.hasPremiumAccess = hasPremiumAccess;
exports.default = {
    requireSubscription: exports.requireSubscription,
    checkSubscription: exports.checkSubscription,
    hasPremiumAccess: exports.hasPremiumAccess
};
//# sourceMappingURL=subscription.js.map