"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const cuid2_1 = require("@paralleldrive/cuid2");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Apply authentication to all admin routes
router.use(auth_1.authenticateToken);
// ============================================
// BUSINESS CATEGORY MANAGEMENT (accessible to both admin and subadmin)
// ============================================
// Get all business categories (accessible to both admin and subadmin)
router.get('/business-categories', auth_1.requireStaff, async (req, res) => {
    try {
        const { mainCategory } = req.query;
        const where = {};
        if (mainCategory) {
            where.mainCategory = mainCategory;
        }
        const categories = await prisma.businessCategory.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
            include: {
                admins: {
                    select: { name: true }
                },
                _count: {
                    select: {
                        images: true,
                        videos: true
                    }
                }
            }
        });
        res.json({
            success: true,
            categories
        });
    }
    catch (error) {
        console.error('Get business categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch business categories'
        });
    }
});
// Apply admin-only middleware to remaining routes
router.use(auth_1.requireAdmin);
// ============================================
// SUBADMIN MANAGEMENT
// ============================================
// Get all subadmins
router.get('/subadmins', async (req, res) => {
    try {
        const subadmins = await prisma.subadmin.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                permissions: true,
                status: true,
                assignedCategories: true,
                createdAt: true,
                lastLogin: true,
                isActive: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            subadmins
        });
    }
    catch (error) {
        console.error('Get subadmins error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch subadmins'
        });
    }
});
// Create new subadmin
router.post('/subadmins', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('role').notEmpty().withMessage('Role is required'),
    (0, express_validator_1.body)('permissions').isArray().withMessage('Permissions must be an array'),
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
        const { email, name, password, role, permissions, assignedBusinessCategories } = req.body;
        // Check if email already exists
        const existingSubadmin = await prisma.subadmin.findUnique({
            where: { email }
        });
        if (existingSubadmin) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create subadmin
        const subadmin = await prisma.subadmin.create({
            data: {
                id: (0, cuid2_1.createId)(),
                email,
                name,
                password: hashedPassword,
                role,
                permissions: JSON.stringify(permissions),
                assignedCategories: JSON.stringify(assignedBusinessCategories || []),
                createdBy: req.user.id,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                permissions: true,
                status: true,
                assignedCategories: true,
                createdAt: true
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'CREATE',
                resource: 'SUBADMIN',
                resourceId: subadmin.id,
                details: `Created subadmin: ${subadmin.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Subadmin created successfully',
            subadmin
        });
    }
    catch (error) {
        console.error('Create subadmin error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create subadmin'
        });
    }
});
// Update subadmin
router.put('/subadmins/:id', [
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
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
        const { email, name, password, role, permissions, assignedBusinessCategories, status } = req.body;
        // Check if subadmin exists
        const existingSubadmin = await prisma.subadmin.findUnique({
            where: { id }
        });
        if (!existingSubadmin) {
            return res.status(404).json({
                success: false,
                error: 'Subadmin not found'
            });
        }
        // Prepare update data
        const updateData = {};
        if (email)
            updateData.email = email;
        if (name)
            updateData.name = name;
        if (role)
            updateData.role = role;
        if (permissions)
            updateData.permissions = permissions;
        if (assignedBusinessCategories)
            updateData.assignedBusinessCategories = assignedBusinessCategories;
        if (status)
            updateData.status = status;
        // Hash password if provided
        if (password) {
            updateData.password = await bcryptjs_1.default.hash(password, 12);
        }
        // Update subadmin
        const updatedSubadmin = await prisma.subadmin.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                permissions: true,
                status: true,
                assignedCategories: true,
                updatedAt: true
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'UPDATE',
                resource: 'SUBADMIN',
                resourceId: id,
                details: `Updated subadmin: ${updatedSubadmin.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Subadmin updated successfully',
            subadmin: updatedSubadmin
        });
    }
    catch (error) {
        console.error('Update subadmin error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update subadmin'
        });
    }
});
// Delete subadmin
router.delete('/subadmins/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if subadmin exists
        const existingSubadmin = await prisma.subadmin.findUnique({
            where: { id },
            select: { id: true, name: true }
        });
        if (!existingSubadmin) {
            return res.status(404).json({
                success: false,
                error: 'Subadmin not found'
            });
        }
        // Delete subadmin
        await prisma.subadmin.delete({
            where: { id }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'DELETE',
                resource: 'SUBADMIN',
                resourceId: id,
                details: `Deleted subadmin: ${existingSubadmin.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Subadmin deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete subadmin error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete subadmin'
        });
    }
});
// ============================================
// BUSINESS CATEGORY MANAGEMENT (Admin Only)
// ============================================
// Create business category
router.post('/business-categories', [
    (0, express_validator_1.body)('name').isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
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
        const { name, description, icon, mainCategory, sortOrder } = req.body;
        // Check if category already exists
        const existingCategory = await prisma.businessCategory.findUnique({
            where: { name }
        });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'Category name already exists'
            });
        }
        // Create category
        const category = await prisma.businessCategory.create({
            data: {
                id: (0, cuid2_1.createId)(),
                name,
                description,
                icon,
                mainCategory: mainCategory || "BUSINESS", // Use provided or default to BUSINESS
                sortOrder: sortOrder || 0,
                createdBy: req.user.id,
                updatedAt: new Date()
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'CREATE',
                resource: 'BUSINESS_CATEGORY',
                resourceId: category.id,
                details: `Created business category: ${category.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Business category created successfully',
            category
        });
    }
    catch (error) {
        console.error('Create business category error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create business category'
        });
    }
});
// Update business category
router.put('/business-categories/:id', [
    (0, express_validator_1.body)('name').optional().isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
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
        const { name, description, icon, mainCategory, sortOrder, isActive } = req.body;
        // Check if category exists
        const existingCategory = await prisma.businessCategory.findUnique({
            where: { id }
        });
        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                error: 'Business category not found'
            });
        }
        // If name is being changed, check if new name already exists
        if (name && name !== existingCategory.name) {
            const duplicateName = await prisma.businessCategory.findUnique({
                where: { name }
            });
            if (duplicateName) {
                return res.status(400).json({
                    success: false,
                    error: 'Category name already exists'
                });
            }
        }
        // Update category
        const category = await prisma.businessCategory.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(icon && { icon }),
                ...(mainCategory && { mainCategory }),
                ...(sortOrder !== undefined && { sortOrder }),
                ...(isActive !== undefined && { isActive })
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'UPDATE',
                resource: 'BUSINESS_CATEGORY',
                resourceId: category.id,
                details: `Updated business category: ${category.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Business category updated successfully',
            category
        });
    }
    catch (error) {
        console.error('Update business category error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update business category'
        });
    }
});
// Delete business category
router.delete('/business-categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if category exists
        const category = await prisma.businessCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        images: true,
                        videos: true
                    }
                }
            }
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Business category not found'
            });
        }
        // Check if category has associated content
        const hasContent = category._count.images > 0 || category._count.videos > 0;
        if (hasContent) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete category. It has ${category._count.images} images and ${category._count.videos} videos.`,
                details: {
                    images: category._count.images,
                    videos: category._count.videos
                }
            });
        }
        // Delete category
        await prisma.businessCategory.delete({
            where: { id }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: 'DELETE',
                resource: 'BUSINESS_CATEGORY',
                resourceId: id,
                details: `Deleted business category: ${category.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Business category deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete business category error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete business category'
        });
    }
});
// ============================================
// CUSTOMER SUBSCRIPTION MANAGEMENT
// ============================================
// Activate customer subscription
router.post('/customers/:customerId/activate-subscription', [
    (0, express_validator_1.body)('plan').isIn(['MONTHLY', 'YEARLY']).withMessage('Plan must be MONTHLY or YEARLY'),
    (0, express_validator_1.body)('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    (0, express_validator_1.body)('currency').optional().isIn(['USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
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
        const { customerId } = req.params;
        const { plan, amount, currency = 'USD' } = req.body;
        // Check if customer exists
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        if (plan === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1);
        }
        else if (plan === 'YEARLY') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        // Update customer subscription status
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                subscriptionStatus: 'ACTIVE',
                subscriptionStartDate: startDate,
                subscriptionEndDate: endDate,
                subscriptionAmount: amount
            }
        });
        // Create subscription record
        const subscription = await prisma.subscriptions.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId,
                plan,
                planId: plan,
                status: 'ACTIVE',
                startDate,
                endDate,
                updatedAt: new Date()
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                customerId: customerId,
                userType: 'ADMIN',
                action: 'ACTIVATE_SUBSCRIPTION',
                resource: 'SUBSCRIPTION',
                resourceId: subscription.id,
                details: `Activated ${plan} subscription for customer: ${customer.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(200).json({
            success: true,
            message: 'Customer subscription activated successfully',
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
// Deactivate customer subscription
router.post('/customers/:customerId/deactivate-subscription', async (req, res) => {
    try {
        const { customerId } = req.params;
        // Check if customer exists
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }
        // Update customer subscription status
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                subscriptionStatus: 'INACTIVE'
            }
        });
        // Update active subscriptions
        await prisma.subscriptions.updateMany({
            where: {
                customerId,
                status: 'ACTIVE'
            },
            data: {
                status: 'CANCELLED'
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                customerId: customerId,
                userType: 'ADMIN',
                action: 'DEACTIVATE_SUBSCRIPTION',
                resource: 'SUBSCRIPTION',
                resourceId: customerId,
                details: `Deactivated subscription for customer: ${customer.name}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(200).json({
            success: true,
            message: 'Customer subscription deactivated successfully'
        });
    }
    catch (error) {
        console.error('Deactivate subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deactivate subscription'
        });
    }
});
// Get customer subscription details
router.get('/customers/:customerId/subscription', async (req, res) => {
    try {
        const { customerId } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            include: {
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
                subscriptionStatus: customer.subscriptionStatus,
                subscriptionStartDate: customer.subscriptionStartDate,
                subscriptionEndDate: customer.subscriptionEndDate,
                subscriptionAmount: customer.subscriptionAmount,
                currentSubscription: customer.subscriptions[0] || null
            }
        });
    }
    catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get subscription details'
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map