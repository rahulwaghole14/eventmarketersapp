"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// Import existing mobile routes
const mobileAuth_1 = __importDefault(require("./mobileAuth"));
const mobileContent_1 = __importDefault(require("./mobileContent"));
const mobileSubscription_1 = __importDefault(require("./mobileSubscription"));
const businessProfile_1 = __importDefault(require("./businessProfile"));
const installedUsers_1 = __importDefault(require("./installedUsers"));
const businessProfile_2 = __importDefault(require("./mobile/businessProfile"));
const router = express_1.default.Router();
// ============================================
// MOBILE API ALIASES FOR CLEANER PATHS
// ============================================
// Authentication aliases (cleaner paths for mobile app)
router.use('/auth', mobileAuth_1.default);
// User management aliases
router.use('/user', mobileAuth_1.default); // Profile endpoints
router.use('/business', businessProfile_1.default); // Business profile
router.use('/business-profiles', businessProfile_2.default); // Mobile business profiles (plural)
// Content aliases
router.use('/content', mobileContent_1.default);
// Subscription aliases  
router.use('/subscription', mobileSubscription_1.default);
// Analytics aliases
router.use('/analytics', installedUsers_1.default);
// Health check for mobile app
router.get('/health', (req, res) => {
    res.json({
        status: true,
        message: 'Mobile API is healthy',
        data: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: 'connected',
                file_storage: 'available',
                payment_gateway: 'mock_ready'
            }
        }
    });
});
exports.default = router;
//# sourceMappingURL=mobileApiAliases.js.map