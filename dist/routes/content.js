"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const cuid2_1 = require("@paralleldrive/cuid2");
const cloudinaryService_1 = require("../services/cloudinaryService");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Helper function to generate audit log ID
const generateAuditLogId = () => `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
// Apply authentication to all content routes
router.use(auth_1.authenticateToken);
router.use(auth_1.requireStaff);
// ============================================
// CLOUDINARY FILE UPLOAD CONFIGURATION
// ============================================
// Cloudinary upload middleware (already configured in cloudinaryService.ts)
// imageUpload and videoUpload are imported from cloudinaryService.ts
// Legacy directory paths for fallback scenarios
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const imagesDir = path_1.default.join(uploadDir, 'images');
const videosDir = path_1.default.join(uploadDir, 'videos');
const thumbnailsDir = path_1.default.join(uploadDir, 'thumbnails');
// Legacy multer configuration for fallback (if needed)
const legacyStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        try {
            const uploadDir = process.env.UPLOAD_DIR || 'uploads';
            const imagesDir = path_1.default.join(uploadDir, 'images');
            const videosDir = path_1.default.join(uploadDir, 'videos');
            // Create directories if they don't exist
            [uploadDir, imagesDir, videosDir].forEach(dir => {
                if (!fs_1.default.existsSync(dir)) {
                    fs_1.default.mkdirSync(dir, { recursive: true });
                }
            });
            if (file.mimetype.startsWith('image/')) {
                cb(null, imagesDir);
            }
            else if (file.mimetype.startsWith('video/')) {
                cb(null, videosDir);
            }
            else {
                cb(new Error('Invalid file type'), '');
            }
        }
        catch (error) {
            console.error('❌ Multer destination error:', error);
            cb(error, '');
        }
    },
    filename: (req, file, cb) => {
        try {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
        }
        catch (error) {
            console.error('❌ Multer filename error:', error);
            cb(error, '');
        }
    }
});
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = (process.env.ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,webp,gif').split(',');
    const allowedVideoTypes = (process.env.ALLOWED_VIDEO_TYPES || 'mp4,mov,avi,mkv').split(',');
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase().substring(1);
    if (file.mimetype.startsWith('image/') && allowedImageTypes.includes(fileExtension)) {
        cb(null, true);
    }
    else if (file.mimetype.startsWith('video/') && allowedVideoTypes.includes(fileExtension)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type'), false);
    }
};
// Legacy upload for fallback scenarios
const legacyUpload = (0, multer_1.default)({
    storage: legacyStorage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000') // 50MB default
    }
});
// ============================================
// IMAGE MANAGEMENT
// ============================================
// Get images with filtering
router.get('/images', async (req, res) => {
    try {
        const { category, businessCategory, status } = req.query;
        const where = {};
        if (category)
            where.category = category;
        if (businessCategory)
            where.businessCategoryId = businessCategory;
        if (status)
            where.approvalStatus = status;
        const images = await prisma.image.findMany({
            where,
            include: {
                business_categories: {
                    select: { name: true, icon: true }
                },
                admins: {
                    select: { name: true, email: true }
                },
                subadmins: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Transform images to include flattened business category name
        const transformedImages = images.map(image => ({
            ...image,
            businessCategoryName: image.business_categories?.name || null,
            businessCategoryIcon: image.business_categories?.icon || null,
            uploaderName: image.admins?.name || image.subadmins?.name || null,
            uploaderEmail: image.admins?.email || image.subadmins?.email || null
        }));
        res.json({
            success: true,
            images: transformedImages
        });
    }
    catch (error) {
        console.error('Get images error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch images'
        });
    }
});
// Upload image
router.post('/images/upload', cloudinaryService_1.imageUpload.single('image'), [
    (0, express_validator_1.body)('title').isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
    (0, express_validator_1.body)('category').isIn(['BUSINESS', 'FESTIVAL', 'GENERAL']).withMessage('Invalid category'),
], async (req, res) => {
    try {
        console.log('📤 Image upload request received');
        console.log('📁 File info:', req.file ? {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: req.file.path
        } : 'No file');
        console.log('📝 Body data:', req.body);
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        if (!req.file) {
            console.log('❌ No file provided');
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
            });
        }
        const { title, description, category, businessCategoryId, tags } = req.body;
        // Upload to Cloudinary
        let cloudinaryResult;
        try {
            cloudinaryResult = await cloudinaryService_1.CloudinaryService.uploadImage(req.file);
            if (!cloudinaryResult.success) {
                console.error('❌ Cloudinary upload failed:', cloudinaryResult.error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to upload image to Cloudinary',
                    details: cloudinaryResult.error
                });
            }
            console.log('✅ Image uploaded to Cloudinary successfully');
        }
        catch (cloudinaryError) {
            console.error('❌ Cloudinary upload error:', cloudinaryError);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload image to Cloudinary'
            });
        }
        // Initialize image data with Cloudinary information
        const imageData = {
            title,
            description,
            url: cloudinaryResult.data.secure_url,
            thumbnailUrl: cloudinaryService_1.CloudinaryService.getTransformedImageUrl(cloudinaryResult.data.public_id, {
                width: 300,
                height: 300,
                crop: 'fill',
                quality: 'auto',
                format: 'auto'
            }),
            category,
            businessCategoryId: businessCategoryId || null, // Set businessCategoryId if provided, regardless of main category
            tags: tags ? JSON.stringify(tags.split(',').map((tag) => tag.trim())) : null,
            fileSize: cloudinaryResult.data.bytes,
            dimensions: `${cloudinaryResult.data.width}x${cloudinaryResult.data.height}`,
            approvalStatus: req.user.userType === 'ADMIN' ? 'APPROVED' : 'PENDING'
        };
        // Set uploader based on user type
        if (req.user.userType === 'ADMIN') {
            imageData.adminUploaderId = req.user.id;
        }
        else {
            imageData.subadminUploaderId = req.user.id;
        }
        const image = await prisma.image.create({
            data: imageData,
            include: {
                business_categories: {
                    select: { name: true, icon: true }
                }
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'UPLOAD',
                resource: 'IMAGE',
                resourceId: image.id,
                details: `Uploaded image: ${image.title}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Image uploaded successfully',
            image: {
                ...image,
                businessCategoryName: image.business_categories?.name || null,
                businessCategoryIcon: image.business_categories?.icon || null
            }
        });
    }
    catch (error) {
        console.error('❌ Upload image error:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            file: req.file ? req.file.filename : 'No file'
        });
        // Clean up uploaded file on error
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            try {
                fs_1.default.unlinkSync(req.file.path);
                console.log('✅ Cleaned up uploaded file');
            }
            catch (cleanupError) {
                console.error('❌ Error cleaning up file:', cleanupError);
            }
        }
        res.status(500).json({
            success: false,
            error: 'Failed to upload image',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// Simple image upload without processing (for testing)
router.post('/images/upload-simple', cloudinaryService_1.imageUpload.single('image'), [
    (0, express_validator_1.body)('title').isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
    (0, express_validator_1.body)('category').isIn(['BUSINESS', 'FESTIVAL', 'GENERAL']).withMessage('Invalid category'),
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
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
            });
        }
        const { title, description, category, businessCategoryId, tags } = req.body;
        // Create image record without processing
        const imageData = {
            title,
            description,
            url: `/uploads/images/${req.file.filename}`,
            thumbnailUrl: null, // No thumbnail for simple upload
            category,
            businessCategoryId: businessCategoryId || null, // Set businessCategoryId if provided, regardless of main category
            tags: tags ? JSON.stringify(tags.split(',').map((tag) => tag.trim())) : null,
            fileSize: req.file.size,
            dimensions: null, // No dimensions for simple upload
            approvalStatus: req.user.userType === 'ADMIN' ? 'APPROVED' : 'PENDING'
        };
        // Set uploader based on user type
        if (req.user.userType === 'ADMIN') {
            imageData.adminUploaderId = req.user.id;
        }
        else {
            imageData.subadminUploaderId = req.user.id;
        }
        const image = await prisma.image.create({
            data: imageData,
            include: {
                business_categories: {
                    select: { name: true, icon: true }
                }
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'UPLOAD',
                resource: 'IMAGE',
                resourceId: image.id,
                details: `Uploaded image (simple): ${image.title}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Image uploaded successfully (simple mode)',
            image
        });
    }
    catch (error) {
        console.error('Simple upload image error:', error);
        // Clean up uploaded file on error
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: 'Failed to upload image'
        });
    }
});
// Bulk upload images
router.post('/images/bulk-upload', cloudinaryService_1.imageUpload.array('images', 50), [
    (0, express_validator_1.body)('category').isIn(['BUSINESS', 'FESTIVAL', 'GENERAL']).withMessage('Invalid category'),
    (0, express_validator_1.body)('businessCategoryId').optional().isString().withMessage('Business category ID must be a string'),
    (0, express_validator_1.body)('tags').optional().isString().withMessage('Tags must be a string'),
    (0, express_validator_1.body)('defaultDescription').optional().isString().withMessage('Default description must be a string'),
], async (req, res) => {
    try {
        console.log('📤 Bulk image upload request received');
        console.log('📁 Files count:', req.files ? req.files.length : 0);
        console.log('📝 Body data:', req.body);
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const files = req.files;
        if (!files || files.length === 0) {
            console.log('❌ No files provided');
            return res.status(400).json({
                success: false,
                error: 'At least one image file is required'
            });
        }
        const { category, businessCategoryId, tags, defaultDescription } = req.body;
        // Process tags
        const processedTags = tags ? JSON.stringify(tags.split(',').map((tag) => tag.trim())) : null;
        const uploadResults = {
            successful: [],
            failed: [],
            total: files.length
        };
        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`📤 Processing file ${i + 1}/${files.length}: ${file.originalname}`);
            try {
                // Generate title from filename if not provided in body
                const title = req.body[`title_${i}`] || file.originalname.replace(path_1.default.extname(file.originalname), '');
                const description = req.body[`description_${i}`] || defaultDescription || '';
                // Upload to Cloudinary
                let cloudinaryResult;
                try {
                    cloudinaryResult = await cloudinaryService_1.CloudinaryService.uploadImage(file);
                    if (!cloudinaryResult.success) {
                        console.error(`❌ Cloudinary upload failed for ${file.originalname}:`, cloudinaryResult.error);
                        uploadResults.failed.push({
                            filename: file.originalname,
                            error: `Cloudinary upload failed: ${cloudinaryResult.error}`
                        });
                        continue;
                    }
                    console.log(`✅ Image uploaded to Cloudinary successfully: ${file.originalname}`);
                }
                catch (cloudinaryError) {
                    console.error(`❌ Cloudinary upload error for ${file.originalname}:`, cloudinaryError);
                    uploadResults.failed.push({
                        filename: file.originalname,
                        error: `Cloudinary upload error: ${cloudinaryError.message}`
                    });
                    continue;
                }
                // Initialize image data with Cloudinary information
                const imageData = {
                    title,
                    description,
                    url: cloudinaryResult.data.secure_url,
                    thumbnailUrl: cloudinaryService_1.CloudinaryService.getTransformedImageUrl(cloudinaryResult.data.public_id, {
                        width: 300,
                        height: 300,
                        crop: 'fill',
                        quality: 'auto',
                        format: 'auto'
                    }),
                    category,
                    businessCategoryId: businessCategoryId || null, // Set businessCategoryId if provided, regardless of main category
                    tags: processedTags,
                    fileSize: cloudinaryResult.data.bytes,
                    dimensions: `${cloudinaryResult.data.width}x${cloudinaryResult.data.height}`,
                    approvalStatus: req.user.userType === 'ADMIN' ? 'APPROVED' : 'PENDING'
                };
                // Set uploader based on user type
                if (req.user.userType === 'ADMIN') {
                    imageData.adminUploaderId = req.user.id;
                }
                else {
                    imageData.subadminUploaderId = req.user.id;
                }
                // Create image record
                const image = await prisma.image.create({
                    data: imageData,
                    include: {
                        business_categories: {
                            select: { name: true, icon: true }
                        }
                    }
                });
                // Log activity
                await prisma.auditLog.create({
                    data: {
                        id: (0, cuid2_1.createId)(),
                        adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                        subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                        userType: req.user.userType,
                        action: 'BULK_UPLOAD',
                        resource: 'IMAGE',
                        resourceId: image.id,
                        details: `Bulk uploaded image: ${image.title}`,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        status: 'SUCCESS'
                    }
                });
                uploadResults.successful.push({
                    id: image.id,
                    title: image.title,
                    filename: file.originalname,
                    url: image.url,
                    thumbnailUrl: image.thumbnailUrl,
                    businessCategoryId: image.businessCategoryId,
                    businessCategoryName: image.business_categories?.name || null,
                    businessCategoryIcon: image.business_categories?.icon || null
                });
                console.log(`✅ Successfully uploaded: ${file.originalname}`);
            }
            catch (fileError) {
                console.error(`❌ Error processing file ${file.originalname}:`, fileError);
                // Clean up uploaded file on error
                if (fs_1.default.existsSync(file.path)) {
                    try {
                        fs_1.default.unlinkSync(file.path);
                        console.log(`✅ Cleaned up failed file: ${file.originalname}`);
                    }
                    catch (cleanupError) {
                        console.error(`❌ Error cleaning up file ${file.originalname}:`, cleanupError);
                    }
                }
                uploadResults.failed.push({
                    filename: file.originalname,
                    error: fileError.message
                });
            }
        }
        // Create bulk upload summary log
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'BULK_UPLOAD',
                resource: 'BULK_OPERATION',
                resourceId: 'bulk-upload-summary',
                details: `Bulk upload completed: ${uploadResults.successful.length} successful, ${uploadResults.failed.length} failed out of ${uploadResults.total} files`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: uploadResults.failed.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS'
            }
        });
        const response = {
            success: true,
            message: `Bulk upload completed: ${uploadResults.successful.length} successful, ${uploadResults.failed.length} failed`,
            summary: {
                total: uploadResults.total,
                successful: uploadResults.successful.length,
                failed: uploadResults.failed.length,
                successRate: `${Math.round((uploadResults.successful.length / uploadResults.total) * 100)}%`
            },
            results: {
                successful: uploadResults.successful,
                failed: uploadResults.failed
            }
        };
        // Return appropriate status code based on results
        if (uploadResults.failed.length === 0) {
            res.status(201).json(response);
        }
        else if (uploadResults.successful.length > 0) {
            res.status(207).json(response); // 207 Multi-Status for partial success
        }
        else {
            res.status(400).json({
                success: false,
                error: 'All uploads failed',
                details: uploadResults.failed
            });
        }
    }
    catch (error) {
        console.error('❌ Bulk upload error:', error);
        // Clean up all uploaded files on error
        const files = req.files;
        if (files) {
            files.forEach(file => {
                if (fs_1.default.existsSync(file.path)) {
                    try {
                        fs_1.default.unlinkSync(file.path);
                        console.log(`✅ Cleaned up file on error: ${file.originalname}`);
                    }
                    catch (cleanupError) {
                        console.error(`❌ Error cleaning up file ${file.originalname}:`, cleanupError);
                    }
                }
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to process bulk upload',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// Update image metadata
router.put('/images/:id', [
    (0, express_validator_1.body)('title').optional().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1-200 characters'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
    (0, express_validator_1.body)('category').optional().isIn(['BUSINESS', 'FESTIVAL', 'GENERAL']).withMessage('Invalid category'),
    (0, express_validator_1.body)('businessCategoryId').optional().isString().withMessage('Business category ID must be a string'),
    (0, express_validator_1.body)('tags').optional().isString().withMessage('Tags must be a string'),
], async (req, res) => {
    try {
        console.log('🔄 Update image request received');
        console.log('📝 Image ID:', req.params.id);
        console.log('📝 Update data:', req.body);
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Invalid request body',
                details: errors.array()
            });
        }
        const { id } = req.params;
        const { title, description, category, businessCategoryId, tags } = req.body;
        // Check if at least one field is provided
        if (!title && !description && !category && !businessCategoryId && !tags) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'At least one field must be provided for update'
            });
        }
        // Check if image exists
        const existingImage = await prisma.image.findUnique({
            where: { id },
            include: {
                business_categories: { select: { name: true, icon: true } }
            }
        });
        if (!existingImage) {
            return res.status(404).json({
                success: false,
                error: 'Image not found',
                message: `Image with ID ${id} does not exist`
            });
        }
        // Authorization check: Admin can update any image, Subadmin can only update their own
        if (req.user.userType === 'SUBADMIN') {
            if (existingImage.subadminUploaderId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'Forbidden',
                    message: 'You do not have permission to update this image'
                });
            }
        }
        // Build update data
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (category !== undefined) {
            updateData.category = category;
            // If category is changed to non-BUSINESS, clear businessCategoryId
            if (category !== 'BUSINESS') {
                updateData.businessCategoryId = null;
            }
        }
        if (businessCategoryId !== undefined) {
            // Only allow businessCategoryId if category is BUSINESS
            if (existingImage.category === 'BUSINESS' || category === 'BUSINESS') {
                updateData.businessCategoryId = businessCategoryId;
            }
        }
        if (tags !== undefined) {
            // Validate tags format
            try {
                // If tags is already a JSON string, validate it
                if (typeof tags === 'string' && tags.startsWith('[')) {
                    JSON.parse(tags);
                    updateData.tags = tags;
                }
                else if (typeof tags === 'string') {
                    // If tags is comma-separated, convert to JSON array
                    const tagArray = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
                    updateData.tags = JSON.stringify(tagArray);
                }
            }
            catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'Tags must be a valid JSON string or comma-separated values'
                });
            }
        }
        // Update the image
        const updatedImage = await prisma.image.update({
            where: { id },
            data: updateData,
            include: {
                business_categories: {
                    select: { name: true, icon: true }
                },
                admins: {
                    select: { name: true, email: true }
                },
                subadmins: {
                    select: { name: true, email: true }
                }
            }
        });
        // Log activity
        const changedFields = Object.keys(updateData).join(', ');
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'UPDATE',
                resource: 'IMAGE',
                resourceId: id,
                details: `Updated image: ${updatedImage.title} - Changed fields: ${changedFields}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        console.log('✅ Image updated successfully');
        res.json({
            success: true,
            message: 'Image updated successfully',
            data: {
                id: updatedImage.id,
                title: updatedImage.title,
                description: updatedImage.description,
                tags: updatedImage.tags,
                url: updatedImage.url,
                thumbnailUrl: updatedImage.thumbnailUrl,
                category: updatedImage.category,
                businessCategoryId: updatedImage.businessCategoryId,
                businessCategoryName: updatedImage.business_categories?.name,
                uploadedBy: updatedImage.adminUploaderId || updatedImage.subadminUploaderId,
                createdAt: updatedImage.createdAt,
                updatedAt: updatedImage.updatedAt,
                approvalStatus: updatedImage.approvalStatus,
                downloads: updatedImage.downloads,
                views: updatedImage.views,
                isActive: updatedImage.isActive
            }
        });
    }
    catch (error) {
        console.error('❌ Update image error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'An error occurred while updating the image'
        });
    }
});
// Approve/Reject content (Admin only)
router.put('/images/:id/approval', [
    (0, express_validator_1.body)('status').isIn(['APPROVED', 'REJECTED']).withMessage('Status must be APPROVED or REJECTED'),
    (0, express_validator_1.body)('reason').optional().isLength({ max: 500 }).withMessage('Reason too long'),
], async (req, res) => {
    try {
        if (req.user.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Only admins can approve content'
            });
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { id } = req.params;
        const { status, reason } = req.body;
        const image = await prisma.image.update({
            where: { id },
            data: {
                approvalStatus: status
            },
            include: {
                subadmins: {
                    select: { name: true, email: true }
                }
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
                resource: 'IMAGE',
                resourceId: id,
                details: `${status} image: ${image.title}${reason ? ` - ${reason}` : ''}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: `Image ${status.toLowerCase()} successfully`,
            image
        });
    }
    catch (error) {
        console.error('Approve image error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update image approval status'
        });
    }
});
// ============================================
// VIDEO MANAGEMENT
// ============================================
// Get videos with filtering
router.get('/videos', async (req, res) => {
    try {
        const { category, businessCategory, status } = req.query;
        const where = {};
        if (category)
            where.category = category;
        if (businessCategory)
            where.businessCategoryId = businessCategory;
        if (status)
            where.approvalStatus = status;
        const videos = await prisma.video.findMany({
            where,
            include: {
                business_categories: {
                    select: { name: true, icon: true }
                },
                admins: {
                    select: { name: true, email: true }
                },
                subadmins: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Transform videos to include flattened business category name
        const transformedVideos = videos.map(video => ({
            ...video,
            businessCategoryName: video.business_categories?.name || null,
            businessCategoryIcon: video.business_categories?.icon || null,
            uploaderName: video.admins?.name || video.subadmins?.name || null,
            uploaderEmail: video.admins?.email || video.subadmins?.email || null
        }));
        res.json({
            success: true,
            videos: transformedVideos
        });
    }
    catch (error) {
        console.error('Get videos error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch videos'
        });
    }
});
// Upload video
router.post('/videos/upload', cloudinaryService_1.videoUpload.single('video'), [
    (0, express_validator_1.body)('title').isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
    (0, express_validator_1.body)('category').isIn(['BUSINESS', 'FESTIVAL', 'GENERAL']).withMessage('Invalid category'),
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
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Video file is required'
            });
        }
        const { title, description, category, businessCategoryId, tags, duration } = req.body;
        // Upload to Cloudinary
        let cloudinaryResult;
        try {
            cloudinaryResult = await cloudinaryService_1.CloudinaryService.uploadVideo(req.file);
            if (!cloudinaryResult.success) {
                console.error('❌ Cloudinary video upload failed:', cloudinaryResult.error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to upload video to Cloudinary',
                    details: cloudinaryResult.error
                });
            }
            console.log('✅ Video uploaded to Cloudinary successfully');
        }
        catch (cloudinaryError) {
            console.error('❌ Cloudinary video upload error:', cloudinaryError);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload video to Cloudinary'
            });
        }
        // Create video record with Cloudinary information
        const videoData = {
            title,
            description,
            url: cloudinaryResult.data.secure_url,
            videoUrl: cloudinaryResult.data.secure_url, // Cloudinary URL for video
            thumbnailUrl: cloudinaryService_1.CloudinaryService.getVideoThumbnailUrl(cloudinaryResult.data.public_id),
            category,
            businessCategoryId: businessCategoryId || null, // Set businessCategoryId if provided, regardless of main category
            tags: tags ? JSON.stringify(tags.split(',').map((tag) => tag.trim())) : null,
            fileSize: cloudinaryResult.data.bytes,
            duration: cloudinaryResult.data.duration || (duration ? parseInt(duration) : null),
            approvalStatus: req.user.userType === 'ADMIN' ? 'APPROVED' : 'PENDING'
        };
        // Set uploader based on user type
        if (req.user.userType === 'ADMIN') {
            videoData.adminUploaderId = req.user.id;
        }
        else {
            videoData.subadminUploaderId = req.user.id;
        }
        const video = await prisma.video.create({
            data: videoData,
            include: {
                business_categories: {
                    select: { name: true, icon: true }
                }
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'UPLOAD',
                resource: 'VIDEO',
                resourceId: video.id,
                details: `Uploaded video: ${video.title}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully',
            video
        });
    }
    catch (error) {
        console.error('Upload video error:', error);
        // Clean up uploaded file on error
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: 'Failed to upload video'
        });
    }
});
// Simple video upload without processing (for testing)
router.post('/videos/upload-simple', cloudinaryService_1.videoUpload.single('video'), [
    (0, express_validator_1.body)('title').isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
    (0, express_validator_1.body)('category').isIn(['BUSINESS', 'FESTIVAL', 'GENERAL']).withMessage('Invalid category'),
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
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Video file is required'
            });
        }
        const { title, description, category, businessCategoryId, tags, duration } = req.body;
        // Create video record without processing
        const videoData = {
            title,
            description,
            url: `/uploads/videos/${req.file.filename}`,
            category,
            businessCategoryId: businessCategoryId || null, // Set businessCategoryId if provided, regardless of main category
            tags: tags ? JSON.stringify(tags.split(',').map((tag) => tag.trim())) : null,
            fileSize: req.file.size,
            duration: duration ? parseInt(duration) : null,
            approvalStatus: req.user.userType === 'ADMIN' ? 'APPROVED' : 'PENDING'
        };
        // Set uploader based on user type
        if (req.user.userType === 'ADMIN') {
            videoData.adminUploaderId = req.user.id;
        }
        else {
            videoData.subadminUploaderId = req.user.id;
        }
        const video = await prisma.video.create({
            data: videoData,
            include: {
                business_categories: {
                    select: { name: true, icon: true }
                }
            }
        });
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'UPLOAD',
                resource: 'VIDEO',
                resourceId: video.id,
                details: `Uploaded video (simple): ${video.title}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully (simple mode)',
            video
        });
    }
    catch (error) {
        console.error('Simple upload video error:', error);
        // Clean up uploaded file on error
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: 'Failed to upload video'
        });
    }
});
// Get pending approvals (Admin only)
router.get('/pending-approvals', async (req, res) => {
    try {
        if (req.user.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const [pendingImages, pendingVideos] = await Promise.all([
            prisma.image.findMany({
                where: { approvalStatus: 'PENDING' },
                include: {
                    business_categories: { select: { name: true } },
                    subadmins: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.video.findMany({
                where: { approvalStatus: 'PENDING' },
                include: {
                    business_categories: { select: { name: true } },
                    subadmins: { select: { name: true, email: true } }
                },
                orderBy: { createdAt: 'asc' }
            })
        ]);
        res.json({
            success: true,
            pendingContent: {
                images: pendingImages,
                videos: pendingVideos,
                total: pendingImages.length + pendingVideos.length
            }
        });
    }
    catch (error) {
        console.error('Get pending approvals error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch pending approvals'
        });
    }
});
// Bulk approve/reject content
router.post('/bulk-approval', [
    (0, express_validator_1.body)('contentIds').isArray().withMessage('Content IDs must be an array'),
    (0, express_validator_1.body)('contentType').isIn(['IMAGE', 'VIDEO']).withMessage('Content type must be IMAGE or VIDEO'),
    (0, express_validator_1.body)('action').isIn(['APPROVED', 'REJECTED']).withMessage('Action must be APPROVED or REJECTED'),
], async (req, res) => {
    try {
        if (req.user.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { contentIds, contentType, action, reason } = req.body;
        let updatedCount = 0;
        if (contentType === 'IMAGE') {
            const result = await prisma.image.updateMany({
                where: {
                    id: { in: contentIds },
                    approvalStatus: 'PENDING'
                },
                data: {
                    approvalStatus: action
                }
            });
            updatedCount = result.count;
        }
        else {
            const result = await prisma.video.updateMany({
                where: {
                    id: { in: contentIds },
                    approvalStatus: 'PENDING'
                },
                data: {
                    approvalStatus: action
                }
            });
            updatedCount = result.count;
        }
        // Log bulk activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.id,
                userType: 'ADMIN',
                action: `BULK_${action}`,
                resource: contentType,
                details: `Bulk ${action.toLowerCase()} ${updatedCount} ${contentType.toLowerCase()}(s)${reason ? ` - ${reason}` : ''}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: `Successfully ${action.toLowerCase()} ${updatedCount} ${contentType.toLowerCase()}(s)`,
            updatedCount
        });
    }
    catch (error) {
        console.error('Bulk approval error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process bulk approval'
        });
    }
});
// Bulk delete images
router.delete('/images/bulk', [
    (0, express_validator_1.body)('imageIds').isArray({ min: 1 }).withMessage('imageIds must be a non-empty array'),
    (0, express_validator_1.body)('imageIds.*').isString().withMessage('Each image ID must be a string'),
    (0, express_validator_1.body)('category').optional().isIn(['BUSINESS', 'FESTIVAL', 'GENERAL']).withMessage('Invalid category'),
    (0, express_validator_1.body)('tenantId').optional().isString().withMessage('tenantId must be a string'),
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
        const { imageIds, category, tenantId } = req.body;
        if (imageIds.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 imageIds allowed per request'
            });
        }
        const summary = {
            total: imageIds.length,
            deleted: 0,
            failed: 0
        };
        const results = {
            successful: [],
            failed: []
        };
        const images = await prisma.image.findMany({
            where: { id: { in: imageIds } }
        });
        const imagesMap = new Map(images.map(image => [image.id, image]));
        for (const imageId of imageIds) {
            const image = imagesMap.get(imageId);
            if (!image) {
                results.failed.push({ id: imageId, error: 'NOT_FOUND' });
                summary.failed++;
                continue;
            }
            if (category && image.category !== category) {
                results.failed.push({ id: imageId, error: 'PERMISSION_DENIED' });
                summary.failed++;
                continue;
            }
            // TODO: Validate tenant ownership when tenant data is available
            // if (tenantId && image.tenantId !== tenantId) ...
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.image.delete({ where: { id: imageId } });
                    const filePath = path_1.default.join(imagesDir, path_1.default.basename(image.url));
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                });
                results.successful.push({ id: imageId });
                summary.deleted++;
            }
            catch (error) {
                console.error(`Bulk image delete error (${imageId}):`, error);
                results.failed.push({ id: imageId, error: 'DELETE_FAILED' });
                summary.failed++;
            }
        }
        // Audit log
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'BULK_DELETE',
                resource: 'IMAGE',
                details: `Bulk image delete: ${summary.deleted} succeeded, ${summary.failed} failed out of ${summary.total}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: summary.failed === 0 ? 'SUCCESS' : (summary.deleted > 0 ? 'PARTIAL_SUCCESS' : 'FAILED')
            }
        });
        if (summary.deleted === 0 && summary.failed === summary.total) {
            return res.status(400).json({
                success: false,
                error: 'All deletions failed',
                results
            });
        }
        res.json({
            success: true,
            message: 'Bulk delete completed',
            summary,
            results
        });
    }
    catch (error) {
        console.error('Bulk image delete error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete images'
        });
    }
});
// Bulk delete videos
router.delete('/videos/bulk', [
    (0, express_validator_1.body)('videoIds').isArray({ min: 1 }).withMessage('videoIds must be a non-empty array'),
    (0, express_validator_1.body)('videoIds.*').isString().withMessage('Each video ID must be a string'),
    (0, express_validator_1.body)('category').optional().isIn(['BUSINESS', 'FESTIVAL', 'GENERAL']).withMessage('Invalid category'),
    (0, express_validator_1.body)('tenantId').optional().isString().withMessage('tenantId must be a string'),
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
        const { videoIds, category, tenantId } = req.body;
        if (videoIds.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 videoIds allowed per request'
            });
        }
        const summary = {
            total: videoIds.length,
            deleted: 0,
            failed: 0
        };
        const results = {
            successful: [],
            failed: []
        };
        const videos = await prisma.video.findMany({
            where: { id: { in: videoIds } }
        });
        const videosMap = new Map(videos.map(video => [video.id, video]));
        for (const videoId of videoIds) {
            const video = videosMap.get(videoId);
            if (!video) {
                results.failed.push({ id: videoId, error: 'NOT_FOUND' });
                summary.failed++;
                continue;
            }
            if (category && video.category !== category) {
                results.failed.push({ id: videoId, error: 'PERMISSION_DENIED' });
                summary.failed++;
                continue;
            }
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.video.delete({ where: { id: videoId } });
                    const filePath = path_1.default.join(videosDir, path_1.default.basename(video.url));
                    if (fs_1.default.existsSync(filePath)) {
                        fs_1.default.unlinkSync(filePath);
                    }
                });
                results.successful.push({ id: videoId });
                summary.deleted++;
            }
            catch (error) {
                console.error(`Bulk video delete error (${videoId}):`, error);
                results.failed.push({ id: videoId, error: 'DELETE_FAILED' });
                summary.failed++;
            }
        }
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'BULK_DELETE',
                resource: 'VIDEO',
                details: `Bulk video delete: ${summary.deleted} succeeded, ${summary.failed} failed out of ${summary.total}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: summary.failed === 0 ? 'SUCCESS' : (summary.deleted > 0 ? 'PARTIAL_SUCCESS' : 'FAILED')
            }
        });
        if (summary.deleted === 0 && summary.failed === summary.total) {
            return res.status(400).json({
                success: false,
                error: 'All deletions failed',
                results
            });
        }
        res.json({
            success: true,
            message: 'Bulk delete completed',
            summary,
            results
        });
    }
    catch (error) {
        console.error('Bulk video delete error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete videos'
        });
    }
});
// Delete content
router.delete('/:contentType/:id', async (req, res) => {
    try {
        const { contentType, id } = req.params;
        if (!['images', 'videos'].includes(contentType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid content type'
            });
        }
        let content = null;
        let filePath = '';
        if (contentType === 'images') {
            content = await prisma.image.findUnique({ where: { id } });
            if (content) {
                filePath = path_1.default.join(imagesDir, path_1.default.basename(content.url));
                await prisma.image.delete({ where: { id } });
            }
        }
        else {
            content = await prisma.video.findUnique({ where: { id } });
            if (content) {
                filePath = path_1.default.join(videosDir, path_1.default.basename(content.url));
                await prisma.video.delete({ where: { id } });
            }
        }
        if (!content) {
            return res.status(404).json({
                success: false,
                error: 'Content not found'
            });
        }
        // Delete physical file
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Delete thumbnail if exists
        if (content.thumbnailUrl) {
            const thumbnailPath = path_1.default.join(thumbnailsDir, path_1.default.basename(content.thumbnailUrl));
            if (fs_1.default.existsSync(thumbnailPath)) {
                fs_1.default.unlinkSync(thumbnailPath);
            }
        }
        // Log activity
        await prisma.auditLog.create({
            data: {
                id: (0, cuid2_1.createId)(),
                adminId: req.user.userType === 'ADMIN' ? req.user.id : undefined,
                subadminId: req.user.userType === 'SUBADMIN' ? req.user.id : undefined,
                userType: req.user.userType,
                action: 'DELETE',
                resource: contentType.toUpperCase().slice(0, -1), // Remove 's' from 'images'/'videos'
                resourceId: id,
                details: `Deleted ${contentType.slice(0, -1)}: ${content.title}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: `${contentType.slice(0, -1)} deleted successfully`
        });
    }
    catch (error) {
        console.error('Delete content error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete content'
        });
    }
});
exports.default = router;
//# sourceMappingURL=content.js.map