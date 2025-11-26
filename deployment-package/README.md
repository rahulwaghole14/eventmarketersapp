# EventMarketers Backend - Production Deployment

## 🚀 Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Start Server:**
   ```bash
   npm start
   ```

4. **Test Deployment:**
   ```bash
   npm test
   ```

## 📱 Available APIs

- **Health Check:** `GET /health`
- **Mobile Home Stats:** `GET /api/mobile/home/stats`
- **Mobile Templates:** `GET /api/mobile/templates`
- **Mobile Greetings:** `GET /api/mobile/greetings`
- **Mobile Posters:** `GET /api/mobile/posters`
- **Mobile User Registration:** `POST /api/mobile/auth/register`
- **Mobile User Login:** `POST /api/mobile/auth/login`
- **Mobile Subscription Status:** `GET /api/mobile/subscriptions/status`

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=file:./prisma/dev.db
```

## 📖 Documentation

- [DEPLOYMENT_README.md](./DEPLOYMENT_README.md) - Detailed deployment guide
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Production deployment options

## ✅ Test Results

**12/13 Tests Passed** - Ready for production deployment!

---

**🎉 Ready for Production!**
