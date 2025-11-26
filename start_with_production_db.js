#!/usr/bin/env node

/**
 * Start Server with Production Database Configuration
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

// Set the production DATABASE_URL
process.env.DATABASE_URL = "postgresql://eventmarketers_user:XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G@dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com/eventmarketers_db";
process.env.NODE_ENV = 'production'; // Ensure production environment is set

// Set all required environment variables
process.env.JWT_SECRET = 'business-marketing-platform-super-secret-jwt-key-2024';
process.env.JWT_EXPIRES_IN = '7d';
process.env.PORT = '3001';
process.env.UPLOAD_DIR = 'uploads';
process.env.MAX_FILE_SIZE = '50000000';
process.env.ALLOWED_IMAGE_TYPES = 'jpg,jpeg,png,webp,gif';
process.env.ALLOWED_VIDEO_TYPES = 'mp4,mov,avi,mkv';
process.env.BCRYPT_ROUNDS = '12';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

console.log('🔧 Starting server with production database configuration...');
console.log('📊 Database: PostgreSQL (Production)');
console.log('🌍 Environment: Production');

// Check if uploads directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
} else {
    console.log('✅ Directory exists: uploads');
}

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('✅ Created uploads/images directory');
} else {
    console.log('✅ Directory exists: uploads\\images');
}

if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log('✅ Created uploads/videos directory');
} else {
    console.log('✅ Directory exists: uploads\\videos');
}

if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
    console.log('✅ Created uploads/thumbnails directory');
} else {
    console.log('✅ Directory exists: uploads\\thumbnails');
}

// Start the deployment server
console.log('🚀 EventMarketers Backend - Deployment Server');
console.log('==============================================');

const serverProcess = spawn('node', ['deployment_server.js'], {
    stdio: 'inherit',
    env: { 
        ...process.env, 
        DATABASE_URL: process.env.DATABASE_URL, 
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
        PORT: process.env.PORT,
        UPLOAD_DIR: process.env.UPLOAD_DIR,
        MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
        ALLOWED_IMAGE_TYPES: process.env.ALLOWED_IMAGE_TYPES,
        ALLOWED_VIDEO_TYPES: process.env.ALLOWED_VIDEO_TYPES,
        BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS
    }
});

serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
});

serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
});
