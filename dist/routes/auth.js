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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jwt = __importStar(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Validation middleware
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];
// Admin Login
router.post('/admin/login', loginValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { email, password } = req.body;
        // Find admin user
        const admin = await prisma.admin.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                isActive: true
            }
        });
        if (!admin || !admin.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials or account inactive'
            });
        }
        // Verify password
        const isPasswordValid = await bcryptjs_1.default.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Generate JWT token
        const token = (0, auth_1.generateToken)({
            id: admin.id,
            email: admin.email,
            userType: 'ADMIN'
        });
        // Log successful login
        await prisma.auditLog.create({
            data: {
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                adminId: admin.id,
                userType: 'ADMIN',
                action: 'LOGIN',
                resource: 'AUTH',
                details: 'Admin login successful',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                userType: 'ADMIN'
            }
        });
    }
    catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Subadmin Login
router.post('/subadmin/login', loginValidation, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        const { email, password } = req.body;
        // Find subadmin user
        const subadmin = await prisma.subadmin.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                role: true,
                status: true,
                permissions: true,
                assignedCategories: true
            }
        });
        if (!subadmin || subadmin.status !== 'ACTIVE') {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials or account inactive'
            });
        }
        // Verify password
        const isPasswordValid = await bcryptjs_1.default.compare(password, subadmin.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Update last login
        await prisma.subadmin.update({
            where: { id: subadmin.id },
            data: { lastLogin: new Date() }
        });
        // Generate JWT token
        const token = (0, auth_1.generateToken)({
            id: subadmin.id,
            email: subadmin.email,
            userType: 'SUBADMIN'
        });
        // Log successful login
        await prisma.auditLog.create({
            data: {
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                subadminId: subadmin.id,
                userType: 'SUBADMIN',
                action: 'LOGIN',
                resource: 'AUTH',
                details: 'Subadmin login successful',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                status: 'SUCCESS'
            }
        });
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: subadmin.id,
                email: subadmin.email,
                name: subadmin.name,
                role: subadmin.role,
                userType: 'SUBADMIN',
                permissions: subadmin.permissions,
                assignedCategories: subadmin.assignedCategories
            }
        });
    }
    catch (error) {
        console.error('Subadmin login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Logout (invalidate token - in real app, you'd maintain a blacklist)
router.post('/logout', async (req, res) => {
    try {
        // In a production app, you would:
        // 1. Add token to blacklist
        // 2. Clear session if using sessions
        // 3. Log the logout activity
        res.json({
            success: true,
            message: 'Logout successful'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// Get current user profile
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token is required'
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let user = null;
        if (decoded.userType === 'ADMIN') {
            user = await prisma.admin.findUnique({
                where: { id: decoded.id },
                select: { id: true, email: true, name: true, role: true, isActive: true }
            });
        }
        else if (decoded.userType === 'SUBADMIN') {
            user = await prisma.subadmin.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    status: true,
                    permissions: true,
                    assignedCategories: true
                }
            });
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            user: {
                ...user,
                userType: decoded.userType
            }
        });
    }
    catch (error) {
        console.error('Get user profile error:', error);
        res.status(403).json({
            success: false,
            error: 'Invalid token'
        });
    }
});
exports.default = router;
// Auto-rebuild test - 2025-10-14 13:20:45
//# sourceMappingURL=auth.js.map