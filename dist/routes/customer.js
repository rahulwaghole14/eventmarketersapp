"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const cuid2_1 = require("@paralleldrive/cuid2");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// ============================================
// WEB APP CUSTOMER MANAGEMENT APIs
// ============================================
/**
 * POST /api/admin/customers
 * Create a new customer (Web App Admin Only)
 */
router.post('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, email, phone, businessName, businessEmail, businessPhone, businessWebsite, businessAddress, businessDescription, businessCategory, subscriptionPlan, subscriptionAmount, paymentMethod, autoActivateSubscription = true } = req.body;
        // Validation - matching provided sample
        if (!name || !email || !businessName || !businessAddress) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, email, businessName, businessAddress'
            });
        }
        // Website validation (optional but if provided, should be valid URL)
        if (businessWebsite && !/^https?:\/\/.+/.test(businessWebsite)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid website URL format. Use http:// or https://'
            });
        }
        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        // Phone validation (optional but if provided, should be valid)
        if (phone && !/^\+[1-9]\d{1,14}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format. Use international format (+91xxxxxxxxxx)'
            });
        }
        // Business category validation
        const allowedCategories = ['Event Planners', 'Decorators', 'Sound Suppliers', 'Light Suppliers', 'Mandap', 'Generators', 'Wedding Planner', 'General'];
        if (businessCategory && !allowedCategories.includes(businessCategory)) {
            return res.status(400).json({
                success: false,
                message: `Invalid business category. Allowed: ${allowedCategories.join(', ')}`
            });
        }
        // Subscription validation
        if (subscriptionPlan && !['MONTHLY', 'YEARLY'].includes(subscriptionPlan)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription plan. Use MONTHLY or YEARLY'
            });
        }
        if (subscriptionAmount && (subscriptionAmount < 0 || subscriptionAmount > 1000000)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription amount. Must be between 0 and 1000000'
            });
        }
        // Payment method validation
        if (paymentMethod && !['CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'UPI', 'WALLET'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method'
            });
        }
        // Check if email already exists
        const existingCustomer = await prisma.customer.findUnique({
            where: { email }
        });
        if (existingCustomer) {
            return res.status(400).json({
                success: false,
                message: 'Customer with this email already exists'
            });
        }
        // Create customer - matching provided sample
        const customer = await prisma.customer.create({
            data: {
                id: (0, cuid2_1.createId)(),
                name,
                email,
                phone: phone || null,
                businessName,
                businessEmail: businessEmail || email,
                businessPhone: businessPhone || phone || null,
                businessWebsite: businessWebsite || null,
                businessAddress,
                businessDescription: businessDescription || null,
                subscriptionStatus: autoActivateSubscription ? 'ACTIVE' : 'INACTIVE',
                subscriptionStartDate: autoActivateSubscription ? new Date() : null,
                subscriptionEndDate: autoActivateSubscription ?
                    new Date(Date.now() + (subscriptionPlan === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000) : null,
                subscriptionAmount: subscriptionAmount || 0,
                paymentMethod: paymentMethod || 'CREDIT_CARD',
                lastActiveAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                subscriptions: true
            }
        });
        // Create subscription if autoActivateSubscription is true
        let subscription = null;
        if (autoActivateSubscription && subscriptionPlan && subscriptionAmount) {
            subscription = await prisma.subscriptions.create({
                data: {
                    id: (0, cuid2_1.createId)(),
                    customerId: customer.id,
                    plan: subscriptionPlan,
                    planId: subscriptionPlan,
                    status: 'ACTIVE',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + (subscriptionPlan === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000),
                    updatedAt: new Date()
                }
            });
        }
        // Log the action
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'CREATE',
                resource: 'CUSTOMER',
                resourceId: customer.id,
                details: `Customer created: ${customer.name} (${customer.email})`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: {
                customer,
                subscription
            }
        });
    }
    catch (error) {
        console.error('Customer creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});
/**
 * GET /api/admin/customers
 * Get all customers with pagination and filters
 */
router.get('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search;
        const status = req.query.status;
        const category = req.query.category;
        // Build where clause
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { businessName: { contains: search, mode: 'insensitive' } },
                { businessCategory: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (status) {
            where.subscriptionStatus = status;
        }
        if (category) {
            where.businessCategory = { contains: category, mode: 'insensitive' };
        }
        const [customers, totalCount] = await Promise.all([
            prisma.customer.findMany({
                where,
                include: {
                    subscriptions: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.customer.count({ where })
        ]);
        res.json({
            success: true,
            message: 'Customers fetched successfully',
            data: {
                customers,
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
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customers'
        });
    }
});
/**
 * GET /api/admin/customers/:id
 * Get customer by ID
 */
router.get('/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                subscriptions: {
                    orderBy: { createdAt: 'desc' }
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
            message: 'Customer fetched successfully',
            data: { customer }
        });
    }
    catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer'
        });
    }
});
/**
 * PUT /api/admin/customers/:id
 * Update customer
 */
router.put('/:id', auth_1.authenticateToken, auth_1.requireAdmin, [
    (0, express_validator_1.body)('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('phone').optional().isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters'),
    (0, express_validator_1.body)('businessName').optional().isLength({ min: 2 }).withMessage('Business name must be at least 2 characters'),
    (0, express_validator_1.body)('businessEmail').optional().isEmail().withMessage('Valid business email required'),
    (0, express_validator_1.body)('businessPhone').optional().isLength({ min: 10 }).withMessage('Business phone must be at least 10 characters'),
    (0, express_validator_1.body)('businessWebsite').optional().isURL().withMessage('Valid website URL required'),
    (0, express_validator_1.body)('businessCategory').optional().isLength({ min: 2 }).withMessage('Business category must be at least 2 characters')
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
        const { id } = req.params;
        const updateData = req.body;
        // Check if customer exists
        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        });
        if (!existingCustomer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }
        // Check email uniqueness if email is being updated
        if (updateData.email && updateData.email !== existingCustomer.email) {
            const emailExists = await prisma.customer.findUnique({
                where: { email: updateData.email }
            });
            if (emailExists) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already exists'
                });
            }
        }
        // Update customer
        const updatedCustomer = await prisma.customer.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date()
            },
            include: {
                subscriptions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        // Log the action
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'UPDATE',
                resource: 'CUSTOMER',
                resourceId: id,
                details: `Customer updated: ${updatedCustomer.name} (${updatedCustomer.email})`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Customer updated successfully',
            data: { customer: updatedCustomer }
        });
    }
    catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update customer'
        });
    }
});
/**
 * DELETE /api/admin/customers/:id
 * Delete customer (soft delete by deactivating)
 */
router.delete('/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if customer exists
        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        });
        if (!existingCustomer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }
        // Soft delete by updating subscription status
        const updatedCustomer = await prisma.customer.update({
            where: { id },
            data: {
                subscriptionStatus: 'INACTIVE',
                subscriptionEndDate: new Date(),
                updatedAt: new Date()
            }
        });
        // Log the action
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'DELETE',
                resource: 'CUSTOMER',
                resourceId: id,
                details: `Customer deactivated: ${updatedCustomer.name} (${updatedCustomer.email})`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Customer deactivated successfully',
            data: { customer: updatedCustomer }
        });
    }
    catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete customer'
        });
    }
});
exports.default = router;
//# sourceMappingURL=customer.js.map