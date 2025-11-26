"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackImageProcessor = exports.ImageProcessor = void 0;
exports.processImageWithFallback = processImageWithFallback;
exports.getImageDimensionsWithFallback = getImageDimensionsWithFallback;
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ImageProcessor {
    constructor() {
        this.sharpAvailable = false;
        this.initialized = false;
    }
    static getInstance() {
        if (!ImageProcessor.instance) {
            ImageProcessor.instance = new ImageProcessor();
        }
        return ImageProcessor.instance;
    }
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Test Sharp availability
            await (0, sharp_1.default)({
                create: {
                    width: 1,
                    height: 1,
                    channels: 3,
                    background: { r: 0, g: 0, b: 0 }
                }
            }).png().toBuffer();
            this.sharpAvailable = true;
            console.log('✅ Sharp library is available and working');
        }
        catch (error) {
            this.sharpAvailable = false;
            console.warn('⚠️ Sharp library is not available:', error);
        }
        this.initialized = true;
    }
    async processImage(inputPath, outputDir, filename) {
        await this.initialize();
        if (!this.sharpAvailable) {
            return {
                success: false,
                error: 'Sharp library is not available'
            };
        }
        try {
            const thumbnailFilename = 'thumb_' + filename;
            const thumbnailPath = path_1.default.join(outputDir, thumbnailFilename);
            // Generate thumbnail
            await (0, sharp_1.default)(inputPath)
                .resize(300, 300, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);
            // Get image dimensions
            const metadata = await (0, sharp_1.default)(inputPath).metadata();
            const dimensions = `${metadata.width}x${metadata.height}`;
            return {
                success: true,
                thumbnailUrl: `/uploads/thumbnails/${thumbnailFilename}`,
                dimensions
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Image processing failed: ${error}`
            };
        }
    }
    async getImageDimensions(inputPath) {
        await this.initialize();
        if (!this.sharpAvailable) {
            return {};
        }
        try {
            const metadata = await (0, sharp_1.default)(inputPath).metadata();
            return {
                width: metadata.width,
                height: metadata.height
            };
        }
        catch (error) {
            console.warn('Failed to get image dimensions:', error);
            return {};
        }
    }
    isSharpAvailable() {
        return this.sharpAvailable;
    }
}
exports.ImageProcessor = ImageProcessor;
// Alternative image processing using Node.js built-in modules
class FallbackImageProcessor {
    static async processImage(inputPath, outputDir, filename) {
        try {
            // For fallback, we'll just copy the original file as thumbnail
            // This is a simple fallback that doesn't require Sharp
            const thumbnailFilename = 'thumb_' + filename;
            const thumbnailPath = path_1.default.join(outputDir, thumbnailFilename);
            // Copy the original file as thumbnail (simple fallback)
            fs_1.default.copyFileSync(inputPath, thumbnailPath);
            // Try to get basic file info
            const stats = fs_1.default.statSync(inputPath);
            return {
                success: true,
                thumbnailUrl: `/uploads/thumbnails/${thumbnailFilename}`,
                dimensions: 'Unknown' // We can't get dimensions without Sharp
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Fallback processing failed: ${error}`
            };
        }
    }
    static async getImageDimensions(inputPath) {
        // Without Sharp, we can't get image dimensions
        return {};
    }
}
exports.FallbackImageProcessor = FallbackImageProcessor;
// Main image processing function with fallback
async function processImageWithFallback(inputPath, outputDir, filename) {
    const processor = ImageProcessor.getInstance();
    // Try Sharp first
    const result = await processor.processImage(inputPath, outputDir, filename);
    if (result.success) {
        return result;
    }
    // Fallback to simple processing
    console.log('🔄 Falling back to simple image processing');
    return await FallbackImageProcessor.processImage(inputPath, outputDir, filename);
}
// Get image dimensions with fallback
async function getImageDimensionsWithFallback(inputPath) {
    const processor = ImageProcessor.getInstance();
    if (processor.isSharpAvailable()) {
        return await processor.getImageDimensions(inputPath);
    }
    return await FallbackImageProcessor.getImageDimensions(inputPath);
}
