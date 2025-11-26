"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = exports.logoUpload = exports.videoUpload = exports.imageUpload = exports.logoStorage = exports.videoStorage = exports.imageStorage = exports.videoUploadConfig = exports.imageUploadConfig = void 0;
exports.isValidLogoUrl = isValidLogoUrl;
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dv949x1mt',
    api_key: process.env.CLOUDINARY_API_KEY || '832779239522536',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'aypOzVJTpUs14HIhoLE3FI8r5qw',
    secure: true
});
// Image upload configuration
exports.imageUploadConfig = {
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dv949x1mt',
        api_key: process.env.CLOUDINARY_API_KEY || '832779239522536',
        api_secret: process.env.CLOUDINARY_API_SECRET || 'aypOzVJTpUs14HIhoLE3FI8r5qw',
        folder: 'eventmarketers/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: {
            width: 1200,
            height: 1200,
            crop: 'limit',
            quality: 'auto',
            format: 'auto'
        }
    }
};
// Video upload configuration
exports.videoUploadConfig = {
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dv949x1mt',
        api_key: process.env.CLOUDINARY_API_KEY || '832779239522536',
        api_secret: process.env.CLOUDINARY_API_SECRET || 'aypOzVJTpUs14HIhoLE3FI8r5qw',
        folder: 'eventmarketers/videos',
        allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
        resource_type: 'video',
        transformation: {
            width: 1280,
            height: 720,
            crop: 'limit',
            quality: 'auto',
            format: 'mp4'
        }
    }
};
// Create storage configurations
exports.imageStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'eventmarketers/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: {
            width: 1200,
            height: 1200,
            crop: 'limit',
            quality: 'auto',
            format: 'auto'
        }
    }
});
exports.videoStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'eventmarketers/videos',
        allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
        resource_type: 'video',
        transformation: {
            width: 1280,
            height: 720,
            crop: 'limit',
            quality: 'auto',
            format: 'mp4'
        }
    }
});
// Logo upload configuration for user profile logos
exports.logoStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'eventmarketers/user-logos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: {
            width: 400,
            height: 400,
            crop: 'limit',
            quality: 'auto',
            format: 'auto'
        }
    }
});
// Create multer upload middleware
exports.imageUpload = (0, multer_1.default)({
    storage: exports.imageStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});
exports.videoUpload = (0, multer_1.default)({
    storage: exports.videoStorage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});
exports.logoUpload = (0, multer_1.default)({
    storage: exports.logoStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only images allowed.'), false);
        }
    }
});
// Utility functions for Cloudinary operations
class CloudinaryService {
    /**
     * Upload image to Cloudinary
     */
    static async uploadImage(file, options) {
        try {
            const result = await cloudinary_1.v2.uploader.upload(file.path, {
                folder: 'eventmarketers/images',
                transformation: {
                    width: 1200,
                    height: 1200,
                    crop: 'limit',
                    quality: 'auto',
                    format: 'auto'
                },
                ...options
            });
            return {
                success: true,
                data: {
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    bytes: result.bytes
                }
            };
        }
        catch (error) {
            console.error('Cloudinary image upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Upload video to Cloudinary
     */
    static async uploadVideo(file, options) {
        try {
            const result = await cloudinary_1.v2.uploader.upload(file.path, {
                folder: 'eventmarketers/videos',
                resource_type: 'video',
                transformation: {
                    width: 1280,
                    height: 720,
                    crop: 'limit',
                    quality: 'auto',
                    format: 'mp4'
                },
                ...options
            });
            return {
                success: true,
                data: {
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    bytes: result.bytes,
                    duration: result.duration
                }
            };
        }
        catch (error) {
            console.error('Cloudinary video upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Generate thumbnail for video
     */
    static async generateVideoThumbnail(publicId) {
        try {
            const thumbnailUrl = cloudinary_1.v2.url(publicId, {
                resource_type: 'video',
                transformation: {
                    width: 300,
                    height: 200,
                    crop: 'fill',
                    quality: 'auto',
                    format: 'jpg'
                }
            });
            return {
                success: true,
                thumbnailUrl
            };
        }
        catch (error) {
            console.error('Cloudinary thumbnail generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Delete file from Cloudinary
     */
    static async deleteFile(publicId, resourceType = 'image') {
        try {
            const result = await cloudinary_1.v2.uploader.destroy(publicId, {
                resource_type: resourceType
            });
            return {
                success: result.result === 'ok',
                data: result
            };
        }
        catch (error) {
            console.error('Cloudinary delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Transform image URL
     */
    static getTransformedImageUrl(publicId, transformations) {
        return cloudinary_1.v2.url(publicId, {
            transformation: {
                width: 1200,
                height: 1200,
                crop: 'limit',
                quality: 'auto',
                format: 'auto',
                ...transformations
            }
        });
    }
    /**
     * Get video thumbnail URL
     */
    static getVideoThumbnailUrl(publicId, transformations) {
        return cloudinary_1.v2.url(publicId, {
            resource_type: 'video',
            transformation: {
                width: 300,
                height: 200,
                crop: 'fill',
                quality: 'auto',
                format: 'jpg',
                ...transformations
            }
        });
    }
    /**
     * Get logo thumbnail URL (200x200px)
     */
    static getLogoThumbnailUrl(publicId) {
        return cloudinary_1.v2.url(publicId, {
            transformation: {
                width: 200,
                height: 200,
                crop: 'fill',
                quality: 'auto',
                format: 'auto'
            }
        });
    }
}
exports.CloudinaryService = CloudinaryService;
/**
 * Validate logo URL - rejects local file paths, only accepts HTTPS URLs
 */
function isValidLogoUrl(url) {
    // Allow empty/null (to remove logo)
    if (!url || url === '')
        return true;
    // Reject local file paths
    const invalidPatterns = [
        'file://',
        'content://',
        '/storage/',
        '\\' // Windows paths
    ];
    if (invalidPatterns.some(pattern => url.includes(pattern))) {
        return false;
    }
    // Must be HTTPS URL
    return url.startsWith('https://');
}
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinaryService.js.map