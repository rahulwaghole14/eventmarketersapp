"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const content_1 = __importDefault(require("./routes/content"));
const mobile_1 = __importDefault(require("./routes/mobile"));
const customer_1 = __importDefault(require("./routes/customer"));
const mobileSubscription_1 = __importDefault(require("./routes/mobileSubscription"));
const installedUsers_1 = __importDefault(require("./routes/installedUsers"));
const businessProfile_1 = __importDefault(require("./routes/businessProfile"));
const mobileApiAliases_1 = __importDefault(require("./routes/mobileApiAliases"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const search_1 = __importDefault(require("./routes/search"));
const fileManagement_1 = __importDefault(require("./routes/fileManagement"));
const contentSync_1 = __importDefault(require("./routes/contentSync"));
// Import mobile app routes
const home_1 = __importDefault(require("./routes/mobile/home"));
const auth_2 = __importDefault(require("./routes/mobile/auth"));
const templates_1 = __importDefault(require("./routes/mobile/templates"));
const greetings_1 = __importDefault(require("./routes/mobile/greetings"));
const subscriptions_1 = __importDefault(require("./routes/mobile/subscriptions"));
const businessProfile_2 = __importDefault(require("./routes/mobile/businessProfile"));
const content_2 = __importDefault(require("./routes/mobile/content"));
const users_1 = __importDefault(require("./routes/mobile/users"));
const transactions_1 = __importDefault(require("./routes/mobile/transactions"));
const downloads_1 = __importDefault(require("./routes/mobile/downloads"));
const likes_1 = __importDefault(require("./routes/mobile/likes"));
const posters_1 = __importDefault(require("./routes/mobile/posters")); // Added posters routes
const calendar_1 = __importDefault(require("./routes/mobile/calendar")); // Added calendar routes
const subscription_1 = require("./middleware/subscription"); // Added subscription middleware
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
// ============================================
// MIDDLEWARE SETUP
// ============================================
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'https://your-frontend-domain.com',
            'https://eventmarketers-frontend.onrender.com', // Add your frontend domain
            'https://eventmarketers.vercel.app', // Add Vercel domain if using
            'https://eventmarketers.netlify.app', // Add Netlify domain if using
            process.env.CORS_ORIGIN
        ].filter(Boolean); // Remove undefined values
        // For now, allow all origins to fix CORS issues
        // TODO: Restrict this in production with proper domain configuration
        console.log('CORS request from origin:', origin);
        return callback(null, true);
        // Original restrictive logic (commented out for now)
        // if (allowedOrigins.includes(origin)) {
        //   callback(null, true);
        // } else {
        //   console.log('CORS blocked origin:', origin);
        //   callback(new Error('Not allowed by CORS'));
        // }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
};
app.use((0, cors_1.default)(corsOptions));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Apply subscription check middleware to all mobile API routes
app.use('/api/mobile', subscription_1.checkSubscription);
// Logging middleware
app.use((0, morgan_1.default)('combined'));
// Compression middleware
app.use((0, compression_1.default)());
// Serve static files (uploaded content)
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ============================================
// API ROUTES
// ============================================
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        message: 'EventMarketers Backend API is running'
    });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/admin/customers', customer_1.default);
app.use('/api/content', content_1.default);
app.use('/api/mobile', mobile_1.default);
// Mobile app specific routes (old) - REMOVED to avoid conflicts
// app.use('/api/mobile/auth', mobileAuthRoutes); // Removed - using new mobile auth routes
app.use('/api/mobile/content', content_2.default);
app.use('/api/mobile/subscription', mobileSubscription_1.default);
// New user flow routes
app.use('/api/installed-users', installedUsers_1.default);
app.use('/api/business-profile', businessProfile_1.default);
// Analytics routes
app.use('/api/analytics', analytics_1.default);
// Search routes
app.use('/api/search', search_1.default);
// File management routes
app.use('/api/file-management', fileManagement_1.default);
// Content sync routes
app.use('/api/content-sync', contentSync_1.default);
// Mobile app routes
app.use('/api/mobile/home', home_1.default);
app.use('/api/mobile/auth', auth_2.default);
app.use('/api/mobile/templates', templates_1.default);
app.use('/api/mobile/greetings', greetings_1.default);
app.use('/api/mobile/subscriptions', subscriptions_1.default);
app.use('/api/mobile/business-profile', businessProfile_2.default);
app.use('/api/mobile/business-profiles', businessProfile_2.default); // Alias for plural form
app.use('/api/mobile/content', content_2.default);
app.use('/api/mobile/users', users_1.default);
app.use('/api/mobile/transactions', transactions_1.default);
app.use('/api/mobile/downloads', downloads_1.default);
app.use('/api/mobile/likes', likes_1.default); // Added likes route
app.use('/api/mobile/posters', posters_1.default); // Added posters route
app.use('/api/mobile/calendar', calendar_1.default); // Added calendar route
// Mobile API aliases (cleaner paths for mobile app)
app.use('/api/v1', mobileApiAliases_1.default);
// Temporary API endpoints for testing
app.get('/api/admin/subadmins', (req, res) => {
    res.json({
        success: true,
        subadmins: [
            {
                id: '1',
                name: 'Priya Sharma',
                email: 'priya@marketbrand.com',
                password: 'Priya@123',
                role: 'Content Manager',
                status: 'active',
                permissions: ['Images', 'Videos', 'Categories'],
                assignedCategories: ['Restaurant'],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            }
        ]
    });
});
app.get('/api/mobile/business-categories', (req, res) => {
    res.json({
        success: true,
        categories: [
            { id: '1', name: 'Restaurant', description: 'Food and dining business content', icon: '🍽️' },
            { id: '2', name: 'Wedding Planning', description: 'Wedding and event planning content', icon: '💒' },
            { id: '3', name: 'Electronics', description: 'Electronic products and gadgets', icon: '📱' }
        ]
    });
});
// Legacy routes (for compatibility)
app.get('/api/marketing/campaigns', (req, res) => {
    res.json({
        campaigns: [
            {
                id: 1,
                name: 'Summer Sale 2024',
                description: 'Promotional campaign for summer products',
                status: 'active',
                startDate: '2024-06-01',
                endDate: '2024-08-31',
                budget: 10000,
                targetAudience: 'Adults 25-45',
                impressions: 50000,
                clicks: 1200,
                conversions: 60,
                revenue: 15000
            }
        ]
    });
});
app.get('/api/dashboard/metrics', (req, res) => {
    res.json({
        totalCampaigns: 12,
        activeCampaigns: 8,
        totalImpressions: 125000,
        totalClicks: 3200,
        totalConversions: 180,
        totalRevenue: 45000
    });
});
app.get('/api/analytics', (req, res) => {
    const { range } = req.query;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const analytics = {
        impressions: [],
        clicks: [],
        conversions: [],
        revenue: [],
        labels: []
    };
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        analytics.labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        analytics.impressions.push(Math.floor(Math.random() * 5000) + 2000);
        analytics.clicks.push(Math.floor(Math.random() * 200) + 50);
        analytics.conversions.push(Math.floor(Math.random() * 20) + 5);
        analytics.revenue.push(Math.floor(Math.random() * 2000) + 500);
    }
    res.json(analytics);
});
// ============================================
// ERROR HANDLING
// ============================================
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
// ============================================
// SERVER STARTUP
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Business Marketing Platform API`);
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
    console.log(`📱 Android access: http://192.168.0.106:${PORT}/api`);
    console.log(`📁 Static files: http://localhost:${PORT}/uploads`);
    if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔐 Admin Login: POST /api/auth/admin/login`);
        console.log(`👥 Subadmin Login: POST /api/auth/subadmin/login`);
        console.log(`📱 Mobile Registration: POST /api/mobile/register`);
        console.log(`📄 API Documentation: http://localhost:${PORT}/api`);
    }
});
exports.default = app;
//# sourceMappingURL=index.js.map