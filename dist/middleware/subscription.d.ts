import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            subscriptionStatus?: {
                isActive: boolean;
                planId?: string;
                planName?: string;
                expiryDate?: Date;
                status: string;
            };
        }
    }
}
/**
 * Middleware to check if user has active subscription
 * This middleware should be used for premium features
 */
export declare const requireSubscription: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
/**
 * Middleware to check subscription status without blocking
 * This middleware adds subscription info to request but doesn't block access
 */
export declare const checkSubscription: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Helper function to check if user has premium access
 */
export declare const hasPremiumAccess: (subscriptionStatus: any) => boolean;
declare const _default: {
    requireSubscription: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    checkSubscription: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    hasPremiumAccess: (subscriptionStatus: any) => boolean;
};
export default _default;
//# sourceMappingURL=subscription.d.ts.map