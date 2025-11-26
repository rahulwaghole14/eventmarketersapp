"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateCustomer = exports.requirePermission = exports.requireStaff = exports.requireSubadmin = exports.requireAdmin = exports.authenticateToken = exports.verifyToken = exports.generateToken = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// JWT Token utilities
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};
exports.verifyToken = verifyToken;
// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token is required'
            });
        }
        const decoded = (0, exports.verifyToken)(token);
        // Fetch user details based on user type
        let user = null;
        if (decoded.userType === 'ADMIN') {
            user = await prisma.admin.findUnique({
                where: { id: decoded.id },
                select: { id: true, email: true, name: true, role: true, isActive: true }
            });
            if (!user || !user.isActive) {
                return res.status(401).json({
                    success: false,
                    error: 'Admin account not found or inactive'
                });
            }
        }
        else if (decoded.userType === 'SUBADMIN') {
            user = await prisma.subadmin.findUnique({
                where: { id: decoded.id },
                select: { id: true, email: true, name: true, role: true, status: true, permissions: true }
            });
            if (!user || user.status !== 'ACTIVE') {
                return res.status(401).json({
                    success: false,
                    error: 'Subadmin account not found or inactive'
                });
            }
        }
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            userType: decoded.userType
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};
exports.authenticateToken = authenticateToken;
// Admin-only middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.userType !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
// Subadmin-only middleware
const requireSubadmin = (req, res, next) => {
    if (!req.user || req.user.userType !== 'SUBADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Subadmin access required'
        });
    }
    next();
};
exports.requireSubadmin = requireSubadmin;
// Admin or Subadmin middleware
const requireStaff = (req, res, next) => {
    if (!req.user || !['ADMIN', 'SUBADMIN'].includes(req.user.userType)) {
        return res.status(403).json({
            success: false,
            error: 'Staff access required'
        });
    }
    next();
};
exports.requireStaff = requireStaff;
// Permission-based middleware
const requirePermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Admins have all permissions
        if (req.user.userType === 'ADMIN') {
            return next();
        }
        // Check subadmin permissions
        if (req.user.userType === 'SUBADMIN') {
            const subadmin = await prisma.subadmin.findUnique({
                where: { id: req.user.id },
                select: { permissions: true }
            });
            if (!subadmin || !subadmin.permissions.includes(permission)) {
                return res.status(403).json({
                    success: false,
                    error: `Permission '${permission}' required`
                });
            }
        }
        next();
    };
};
exports.requirePermission = requirePermission;
// Middleware to authenticate customers (mobile app users)
const authenticateCustomer = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTH_REQUIRED',
                    message: 'Access denied. No token provided.'
                }
            });
        }
        const decoded = (0, exports.verifyToken)(token);
        if (decoded.userType !== 'CUSTOMER') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'PERMISSION_DENIED',
                    message: 'Access denied. Customer access required.'
                }
            });
        }
        const customer = await prisma.customer.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                name: true,
                selectedBusinessCategory: true,
                subscriptionStatus: true,
                subscriptionEndDate: true
            }
        });
        if (!customer) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid token. Customer not found.'
                }
            });
        }
        req.user = {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            role: 'CUSTOMER',
            userType: 'CUSTOMER',
            selectedBusinessCategory: customer.selectedBusinessCategory || undefined,
            subscriptionStatus: customer.subscriptionStatus,
            subscriptionExpiry: customer.subscriptionEndDate || undefined
        };
        next();
    }
    catch (error) {
        console.error('Customer authentication error:', error);
        res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid token.'
            }
        });
    }
};
exports.authenticateCustomer = authenticateCustomer;
//# sourceMappingURL=auth.js.map