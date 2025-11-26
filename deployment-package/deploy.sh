#!/bin/bash

echo "🚀 EventMarketers Backend - Deployment Script"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️  Setting up database..."
npx prisma db push

# Test the deployment server
echo "🧪 Testing deployment server..."
node test_deployment_server.js

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment setup completed successfully!"
    echo ""
    echo "🚀 To start the server:"
    echo "   npm start"
    echo ""
    echo "🔧 To start in development mode:"
    echo "   npm run dev"
    echo ""
    echo "📱 Server will be available at:"
    echo "   http://localhost:3001"
    echo ""
    echo "❤️  Health check:"
    echo "   http://localhost:3001/health"
    echo ""
    echo "✅ Ready for production deployment!"
else
    echo "❌ Deployment setup failed. Please check the errors above."
    exit 1
fi
