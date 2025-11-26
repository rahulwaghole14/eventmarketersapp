declare const router: import("express-serve-static-core").Router;
declare global {
    namespace Express {
        interface Request {
            mobileUserId?: string;
        }
    }
}
export default router;
//# sourceMappingURL=mobileSubscription.d.ts.map