export declare class ContentSyncService {
    /**
     * Sync approved images to mobile templates
     */
    static syncApprovedImages(): Promise<{
        syncedCount: number;
        errorCount: number;
        total: number;
    }>;
    /**
     * Sync approved videos to mobile videos
     */
    static syncApprovedVideos(): Promise<{
        syncedCount: number;
        errorCount: number;
        total: number;
    }>;
    /**
     * Sync all approved content (images + videos)
     */
    static syncAllApprovedContent(): Promise<{
        images: {
            syncedCount: number;
            errorCount: number;
            total: number;
        };
        videos: {
            syncedCount: number;
            errorCount: number;
            total: number;
        };
        total: {
            synced: number;
            errors: number;
            content: number;
        };
    }>;
    /**
     * Manual sync trigger for specific image
     */
    static syncSpecificImage(imageId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        thumbnailUrl: string | null;
        type: string | null;
        title: string;
        category: string;
        tags: string | null;
        downloads: number;
        mobileSyncAt: Date | null;
        language: string | null;
        imageUrl: string;
        likes: number;
        fileUrl: string | null;
        isPremium: boolean;
    }>;
    /**
     * Manual sync trigger for specific video
     */
    static syncSpecificVideo(videoId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        thumbnailUrl: string | null;
        duration: number;
        title: string;
        category: string;
        tags: string | null;
        downloads: number;
        mobileSyncAt: Date | null;
        videoUrl: string;
        language: string | null;
        likes: number;
        isPremium: boolean;
    }>;
    /**
     * Get sync status and statistics
     */
    static getSyncStatus(): Promise<{
        images: {
            total: number;
            synced: number;
            pending: number;
            syncPercentage: number;
        };
        videos: {
            total: number;
            synced: number;
            pending: number;
            syncPercentage: number;
        };
        mobile: {
            templates: number;
            videos: number;
        };
    }>;
    private static mapImageCategoryToTemplateCategory;
    private static mapImageCategoryToTemplateType;
    private static mapVideoCategoryToVideoCategory;
    private static mapVideoCategoryToVideoType;
}
export default ContentSyncService;
//# sourceMappingURL=contentSyncService.d.ts.map