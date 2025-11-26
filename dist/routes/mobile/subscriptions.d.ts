declare const router: import("express-serve-static-core").Router;
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}
export default router;
//# sourceMappingURL=subscriptions.d.ts.map