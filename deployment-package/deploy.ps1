# EventMarketers Backend - Deployment Script (PowerShell)

Write-Host "🚀 EventMarketers Backend - Deployment Script" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm is installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

# Push database schema
Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
npx prisma db push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to setup database" -ForegroundColor Red
    exit 1
}

# Test the deployment server
Write-Host "🧪 Testing deployment server..." -ForegroundColor Yellow
node test_deployment_server.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 Deployment setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 To start the server:" -ForegroundColor Cyan
    Write-Host "   npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 To start in development mode:" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "📱 Server will be available at:" -ForegroundColor Cyan
    Write-Host "   http://localhost:3001" -ForegroundColor White
    Write-Host ""
    Write-Host "❤️  Health check:" -ForegroundColor Cyan
    Write-Host "   http://localhost:3001/health" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Ready for production deployment!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment setup failed. Please check the errors above." -ForegroundColor Red
    exit 1
}
