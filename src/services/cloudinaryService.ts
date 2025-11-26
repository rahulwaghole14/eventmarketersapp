import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dv949x1mt',
  api_key: process.env.CLOUDINARY_API_KEY || '832779239522536',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'aypOzVJTpUs14HIhoLE3FI8r5qw',
  secure: true
});

// Image upload configuration
export const imageUploadConfig = {
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
export const videoUploadConfig = {
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
export const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
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
  } as any
});

export const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
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
  } as any
});

// Logo upload configuration for user profile logos
export const logoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
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
  } as any
});

// Create multer upload middleware
export const imageUpload = multer({ 
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export const videoUpload = multer({ 
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

export const logoUpload = multer({ 
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images allowed.') as any, false);
    }
  }
});

// Utility functions for Cloudinary operations
export class CloudinaryService {
  /**
   * Upload image to Cloudinary
   */
  static async uploadImage(file: Express.Multer.File, options?: any) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
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
    } catch (error) {
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
  static async uploadVideo(file: Express.Multer.File, options?: any) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
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
    } catch (error) {
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
  static async generateVideoThumbnail(publicId: string) {
    try {
      const thumbnailUrl = cloudinary.url(publicId, {
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
    } catch (error) {
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
  static async deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });

      return {
        success: result.result === 'ok',
        data: result
      };
    } catch (error) {
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
  static getTransformedImageUrl(publicId: string, transformations?: any) {
    return cloudinary.url(publicId, {
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
  static getVideoThumbnailUrl(publicId: string, transformations?: any) {
    return cloudinary.url(publicId, {
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
  static getLogoThumbnailUrl(publicId: string) {
    return cloudinary.url(publicId, {
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

/**
 * Validate logo URL - rejects local file paths, only accepts HTTPS URLs
 */
export function isValidLogoUrl(url: string | null | undefined): boolean {
  // Allow empty/null (to remove logo)
  if (!url || url === '') return true;
  
  // Reject local file paths
  const invalidPatterns = [
    'file://',
    'content://',
    '/storage/',
    '\\'  // Windows paths
  ];
  
  if (invalidPatterns.some(pattern => url.includes(pattern))) {
    return false;
  }
  
  // Must be HTTPS URL
  return url.startsWith('https://');
}

export default cloudinary;
