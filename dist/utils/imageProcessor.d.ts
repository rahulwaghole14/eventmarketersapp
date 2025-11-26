export interface ImageProcessingResult {
    success: boolean;
    thumbnailUrl?: string;
    dimensions?: string;
    error?: string;
}
export declare class ImageProcessor {
    private static instance;
    private sharpAvailable;
    private initialized;
    private constructor();
    static getInstance(): ImageProcessor;
    initialize(): Promise<void>;
    processImage(inputPath: string, outputDir: string, filename: string): Promise<ImageProcessingResult>;
    getImageDimensions(inputPath: string): Promise<{
        width?: number;
        height?: number;
    }>;
    isSharpAvailable(): boolean;
}
export declare class FallbackImageProcessor {
    static processImage(inputPath: string, outputDir: string, filename: string): Promise<ImageProcessingResult>;
    static getImageDimensions(inputPath: string): Promise<{
        width?: number;
        height?: number;
    }>;
}
export declare function processImageWithFallback(inputPath: string, outputDir: string, filename: string): Promise<ImageProcessingResult>;
export declare function getImageDimensionsWithFallback(inputPath: string): Promise<{
    width?: number;
    height?: number;
}>;
//# sourceMappingURL=imageProcessor.d.ts.map