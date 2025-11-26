import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
export declare const imageUploadConfig: {
    cloudinary: {
        cloud_name: string;
        api_key: string;
        api_secret: string;
        folder: string;
        allowed_formats: string[];
        transformation: {
            width: number;
            height: number;
            crop: string;
            quality: string;
            format: string;
        };
    };
};
export declare const videoUploadConfig: {
    cloudinary: {
        cloud_name: string;
        api_key: string;
        api_secret: string;
        folder: string;
        allowed_formats: string[];
        resource_type: string;
        transformation: {
            width: number;
            height: number;
            crop: string;
            quality: string;
            format: string;
        };
    };
};
export declare const imageStorage: CloudinaryStorage;
export declare const videoStorage: CloudinaryStorage;
export declare const logoStorage: CloudinaryStorage;
export declare const imageUpload: multer.Multer;
export declare const videoUpload: multer.Multer;
export declare const logoUpload: multer.Multer;
export declare class CloudinaryService {
    /**
     * Upload image to Cloudinary
     */
    static uploadImage(file: Express.Multer.File, options?: any): Promise<{
        success: boolean;
        data: {
            public_id: string;
            secure_url: string;
            width: number;
            height: number;
            format: string;
            bytes: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    /**
     * Upload video to Cloudinary
     */
    static uploadVideo(file: Express.Multer.File, options?: any): Promise<{
        success: boolean;
        data: {
            public_id: string;
            secure_url: string;
            width: number;
            height: number;
            format: string;
            bytes: number;
            duration: any;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    /**
     * Generate thumbnail for video
     */
    static generateVideoThumbnail(publicId: string): Promise<{
        success: boolean;
        thumbnailUrl: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        thumbnailUrl?: undefined;
    }>;
    /**
     * Delete file from Cloudinary
     */
    static deleteFile(publicId: string, resourceType?: 'image' | 'video'): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    /**
     * Transform image URL
     */
    static getTransformedImageUrl(publicId: string, transformations?: any): string;
    /**
     * Get video thumbnail URL
     */
    static getVideoThumbnailUrl(publicId: string, transformations?: any): string;
    /**
     * Get logo thumbnail URL (200x200px)
     */
    static getLogoThumbnailUrl(publicId: string): string;
}
/**
 * Validate logo URL - rejects local file paths, only accepts HTTPS URLs
 */
export declare function isValidLogoUrl(url: string | null | undefined): boolean;
export default cloudinary;
//# sourceMappingURL=cloudinaryService.d.ts.map