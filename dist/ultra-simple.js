"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Market Brand API - Ultra Simple Version',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.get('/api', (req, res) => {
    res.json({
        message: 'Market Brand API Documentation',
        version: '1.0.0',
        endpoints: [
            'GET / - API status',
            'GET /health - Health check',
            'GET /api - API documentation'
        ]
    });
});
// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 API docs: http://localhost:${PORT}/api`);
    console.log(`✅ Server started successfully!`);
});
// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error('Please kill the process using this port and try again.');
    }
    else {
        console.error('❌ Server error:', err);
    }
});
exports.default = app;
//# sourceMappingURL=ultra-simple.js.map