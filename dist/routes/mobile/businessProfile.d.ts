declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=businessProfile.d.ts.map