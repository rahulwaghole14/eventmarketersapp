declare const router: import("express-serve-static-core").Router;
export interface BusinessCategoryPoster {
    id: string;
    title: string;
    description: string;
    category: string;
    thumbnail: string;
    imageUrl: string;
    downloadUrl: string;
    likes: number;
    downloads: number;
    isPremium: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}
export default router;
//# sourceMappingURL=posters.d.ts.map