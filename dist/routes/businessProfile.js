"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const cuid2_1 = require("@paralleldrive/cuid2");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Apply authentication to all business profile routes
router.use(auth_1.authenticateCustomer);
// ============================================
// BUSINESS PROFILE MANAGEMENT
// ============================================
// Multer configuration for logo uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const logoDir = path_1.default.join(process.env.UPLOAD_DIR || 'uploads', 'logos');
        if (!fs_1.default.existsSync(logoDir)) {
            fs_1.default.mkdirSync(logoDir, { recursive: true });
        }
        cb(null, logoDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `logo-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
// Get business profile
router.get('/profile', async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                businessName: true,
                businessPhone: true,
                businessEmail: true,
                businessWebsite: true,
                businessAddress: true,
                businessLogo: true,
                businessDescription: true,
                selectedBusinessCategory: true,
                selectedBusinessCategoryId: true
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
            profile: customer
        });
    }
    catch (error) {
        console.error('Get business profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get business profile'
        });
    }
});
// Update business profile
router.put('/profile', [
    (0, express_validator_1.body)('businessName').optional().isLength({ min: 2 }).withMessage('Business name must be at least 2 characters'),
    (0, express_validator_1.body)('businessPhone').optional().isLength({ min: 10 }).withMessage('Valid business phone required'),
    (0, express_validator_1.body)('businessEmail').optional().isEmail().withMessage('Valid business email required'),
    (0, express_validator_1.body)('businessWebsite').optional().isURL().withMessage('Valid website URL required'),
    (0, express_validator_1.body)('businessAddress').optional().isLength({ min: 5 }).withMessage('Business address must be at least 5 characters'),
    (0, express_validator_1.body)('businessDescription').optional().isLength({ max: 500 }).withMessage('Description too long'),
    (0, express_validator_1.body)('businessCategory').optional().isString(),
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
        const { businessName, businessPhone, businessEmail, businessWebsite, businessAddress, businessDescription, businessCategory } = req.body;
        const updatedCustomer = await prisma.customer.update({
            where: { id: req.user.id },
            data: {
                ...(businessName && { businessName }),
                ...(businessPhone && { businessPhone }),
                ...(businessEmail && { businessEmail }),
                ...(businessWebsite && { businessWebsite }),
                ...(businessAddress && { businessAddress }),
                ...(businessDescription && { businessDescription }),
                ...(businessCategory && { businessCategory }),
                updatedAt: new Date()
            },
            select: {
                id: true,
                businessName: true,
                businessPhone: true,
                businessEmail: true,
                businessWebsite: true,
                businessAddress: true,
                businessLogo: true,
                businessDescription: true,
                selectedBusinessCategory: true
            }
        });
        // Log profile update
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId: req.user.id,
                userType: 'CUSTOMER',
                action: 'UPDATE',
                resource: 'BUSINESS_PROFILE',
                details: `Updated business profile for ${businessName || 'business'}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Business profile updated successfully',
            profile: updatedCustomer
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
// Upload business logo
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Logo file is required'
            });
        }
        // Optimize and resize logo
        const optimizedPath = path_1.default.join(path_1.default.dirname(req.file.path), `optimized-${req.file.filename}`);
        await (0, sharp_1.default)(req.file.path)
            .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 90 })
            .toFile(optimizedPath);
        // Delete original file
        fs_1.default.unlinkSync(req.file.path);
        const logoUrl = `/uploads/logos/optimized-${req.file.filename}`;
        // Update customer with new logo
        const updatedCustomer = await prisma.customer.update({
            where: { id: req.user.id },
            data: { businessLogo: logoUrl },
            select: {
                id: true,
                businessName: true,
                businessLogo: true
            }
        });
        // Log logo upload
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId: req.user.id,
                userType: 'CUSTOMER',
                action: 'UPLOAD',
                resource: 'BUSINESS_LOGO',
                details: `Uploaded business logo`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Logo uploaded successfully',
            logoUrl,
            profile: updatedCustomer
        });
    }
    catch (error) {
        console.error('Upload logo error:', error);
        // Clean up uploaded file on error
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: 'Failed to upload logo'
        });
    }
});
// Delete business logo
router.delete('/logo', async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.user.id },
            select: { businessLogo: true }
        });
        if (!customer?.businessLogo) {
            return res.status(404).json({
                success: false,
                error: 'No logo found'
            });
        }
        // Delete physical file
        const logoPath = path_1.default.join(process.env.UPLOAD_DIR || 'uploads', customer.businessLogo.replace('/uploads/', ''));
        if (fs_1.default.existsSync(logoPath)) {
            fs_1.default.unlinkSync(logoPath);
        }
        // Update customer to remove logo
        await prisma.customer.update({
            where: { id: req.user.id },
            data: { businessLogo: null }
        });
        // Log logo deletion
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                customerId: req.user.id,
                userType: 'CUSTOMER',
                action: 'DELETE',
                resource: 'BUSINESS_LOGO',
                details: `Deleted business logo`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Logo deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete logo error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete logo'
        });
    }
});
// Generate business card preview (for frame integration)
router.post('/generate-preview', [
    (0, express_validator_1.body)('frameId').notEmpty().withMessage('Frame ID is required'),
    (0, express_validator_1.body)('templateId').notEmpty().withMessage('Template ID is required'),
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
        const { frameId, templateId } = req.body;
        // Get customer business profile
        const customer = await prisma.customer.findUnique({
            where: { id: req.user.id },
            select: {
                businessName: true,
                businessPhone: true,
                businessEmail: true,
                businessWebsite: true,
                businessAddress: true,
                businessLogo: true,
                businessDescription: true
            }
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }
        // Get template details
        const template = await prisma.image.findUnique({
            where: { id: templateId },
            select: {
                id: true,
                title: true,
                url: true,
                thumbnailUrl: true
            }
        });
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }
        // Return preview data (actual image generation would be done on mobile app)
        res.json({
            success: true,
            preview: {
                frameId,
                template,
                businessData: {
                    name: customer.businessName,
                    phone: customer.businessPhone,
                    email: customer.businessEmail,
                    website: customer.businessWebsite,
                    address: customer.businessAddress,
                    logo: customer.businessLogo,
                    description: customer.businessDescription
                },
                previewUrl: `${template.url}?frame=${frameId}&business=${req.user.id}` // Mock preview URL
            }
        });
    }
    catch (error) {
        console.error('Generate preview error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate preview'
        });
    }
});
exports.default = router;
//# sourceMappingURL=businessProfile.js.map