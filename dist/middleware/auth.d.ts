import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                role: string;
                userType: 'ADMIN' | 'SUBADMIN' | 'CUSTOMER';
                permissions?: string;
                assignedCategories?: string;
                selectedBusinessCategory?: string;
                subscriptionStatus?: string;
                subscriptionExpiry?: Date;
            };
        }
    }
}
export declare const generateToken: (payload: any) => string;
export declare const verifyToken: (token: string) => any;
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireSubadmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireStaff: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requirePermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const authenticateCustomer: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.d.ts.map