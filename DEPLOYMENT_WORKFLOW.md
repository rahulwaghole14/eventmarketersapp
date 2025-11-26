# 📋 Event Marketers Backend - Deployment Workflow

**Current Deployment Setup Documentation**

---

## 🏗️ **Current Architecture**

### **Technology Stack:**
- **Backend:** Node.js + Express.js + TypeScript
- **Database:** PostgreSQL (Free Tier - Aiven/Neon)
- **ORM:** Prisma
- **Hosting:** Render
- **Repository:** GitHub

### **Deployment Method:**
- **Build:** Manual (local TypeScript compilation)
- **Deploy:** Git push to main branch
- **Render:** Uses pre-compiled `dist/` folder (NO auto-rebuild)

---

## 📂 **Project Structure**

```
backend/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Main TypeScript entry
│   ├── routes/                   # Route definitions (TS)
│   └── middleware/               # Middleware (TS)
│
├── dist/                         # Compiled JavaScript (USED IN PRODUCTION)
│   ├── index.js                  # Compiled from src/
│   ├── routes/                   # Compiled routes
│   └── ...
│
├── deployment_server.js          # Main production server (JavaScript)
├── seed-admin-production.js      # Database seeding script
├── prisma/
│   └── schema.prisma             # Database schema
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
└── .env                          # Environment variables
```

---

## 🔄 **Current Deployment Workflow**

### **Step-by-Step Process:**

#### **1. Make Code Changes**
```bash
# Edit TypeScript files in src/
# Example: src/routes/auth.ts, src/routes/content.ts
```

#### **2. Compile TypeScript to JavaScript**
```bash
npm run build
# This runs: tsc
# Compiles src/ → dist/
```

⚠️ **CRITICAL:** You MUST run this before every deployment!

#### **3. Test Locally (Optional but Recommended)**
```bash
npm start
# Runs: node deployment_server.js
# Test on: http://localhost:3000
```

#### **4. Commit Changes**
```bash
git add .
git commit -m "Your commit message"
```

⚠️ **IMPORTANT:** Make sure `dist/` folder is included in commit!

#### **5. Push to GitHub**
```bash
git push origin main
```

#### **6. Render Auto-Deploys**
- Detects Git push
- Pulls latest code
- Runs: `npm install` (if package.json changed)
- Runs: `npm run prestart` → `node seed-admin-production.js`
- Runs: `npm start` → `node deployment_server.js`
- ✅ Deployment complete (~2-3 minutes)

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: Old Code Running After Deployment**

**Symptom:** Changes not reflecting on live server

**Cause:** Forgot to run `npm run build` before commit

**Solution:**
```bash
# Always rebuild before deploying:
npm run build
git add .
git commit -m "Update with rebuild"
git push origin main
```

---

### **Issue 2: Database Reset Weekly**

**Symptom:** All data lost (users, profiles, images)

**Cause:** Free PostgreSQL deletes data after 7-30 days

**Current Workaround:**
- `prestart` script auto-seeds admin users on each deployment
- Data still lost, but admin credentials recreated

**Permanent Solution:** Upgrade to paid database (see Option B below)

---

### **Issue 3: TypeScript Errors Not Caught**

**Symptom:** Server crashes after deployment

**Cause:** TypeScript compiled with errors locally

**Solution:**
```bash
# Check for TypeScript errors before building:
npm run build

# If errors appear, fix them before deploying
```

---

### **Issue 4: Prisma Schema Changes Not Applied**

**Symptom:** Database errors after schema changes

**Solution:**
```bash
# After changing schema.prisma:
npx prisma generate          # Regenerate Prisma client
npx prisma db push          # Update database schema (if needed)
npm run build               # Rebuild TypeScript
git add .
git commit -m "Update schema"
git push origin main
```

---

## 📋 **Pre-Deployment Checklist**

Before every deployment, verify:

- [ ] Made code changes in `src/` (TypeScript)
- [ ] Ran `npm run build` successfully
- [ ] Checked `dist/` folder has updated files
- [ ] Tested locally (optional)
- [ ] Committed ALL changes including `dist/`
- [ ] Pushed to GitHub
- [ ] Monitored Render deployment logs

---

## 🔐 **Environment Variables**

### **Required on Render:**

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# JWT Secret
JWT_SECRET=your-secret-key

# Node Environment
NODE_ENV=production

# Port (Render auto-assigns)
PORT=3000
```

### **How to Update on Render:**
1. Go to Render Dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add/Update variables
5. Save (triggers auto-redeploy)

---

## 📊 **Current Database Limitations**

### **Free PostgreSQL Restrictions:**
- ✅ Storage: 512MB - 1GB
- ❌ Data Retention: 7-30 days only
- ❌ Automatic deletion after inactivity
- ❌ No backups/restore
- ❌ Limited connections
- ❌ Shared resources (slower)

### **Impact:**
- Database resets weekly/monthly
- All user data lost
- Admin accounts recreated via seed script
- NOT suitable for production

---

## 🛠️ **Maintenance Tasks**

### **Weekly:**
- Monitor database status
- Check if data reset occurred
- Verify admin seeding worked

### **Monthly:**
- Review Render logs
- Check for performance issues
- Update dependencies if needed

### **As Needed:**
- Update environment variables
- Apply schema migrations
- Deploy code changes

---

## 📝 **Important Scripts**

### **package.json scripts:**

```json
{
  "scripts": {
    "start": "node deployment_server.js",        // Production start
    "build": "tsc",                               // Compile TypeScript
    "prestart": "node seed-admin-production.js",  // Seed admin before start
    "dev": "ts-node-dev src/index.ts",           // Development server
    "prisma:generate": "prisma generate",         // Generate Prisma client
    "prisma:push": "prisma db push"              // Push schema changes
  }
}
```

### **Usage:**

```bash
# Build TypeScript
npm run build

# Start production server locally
npm start

# Development mode (with auto-reload)
npm run dev

# Update Prisma client
npm run prisma:generate

# Push schema changes to database
npm run prisma:push
```

---

## 🔍 **Debugging Deployments**

### **Check Render Logs:**
1. Go to Render Dashboard
2. Select backend service
3. Click "Logs" tab
4. Look for errors

### **Common Log Messages:**

```bash
# Success
✅ Starting Event Marketers Backend
✅ Connected to database
✅ Server listening on port 3000

# Errors
❌ Error connecting to database
❌ Module not found (missing npm install)
❌ Prisma Client not generated
```

### **Quick Fixes:**

```bash
# If Prisma client error:
npx prisma generate
npm run build
git add . && git commit -m "Fix Prisma" && git push

# If module not found:
npm install
npm run build
git add . && git commit -m "Update deps" && git push
```

---

## 📈 **Monitoring Endpoints**

### **Health Check:**
```bash
GET https://eventmarketersbackend.onrender.com/api/health
```

### **API Documentation:**
- Admin API: `/api/auth/admin/login`
- Mobile API: `/api/mobile/auth/register`
- Content API: `/api/content/images`

---

## ⚠️ **Known Limitations**

### **Current Setup:**
1. ❌ Manual TypeScript rebuild required
2. ❌ No CI/CD pipeline
3. ❌ Database resets weekly/monthly
4. ❌ No automated backups
5. ❌ No staging environment
6. ❌ Easy to forget rebuild step

### **Risks:**
- Deploying old/broken code
- Data loss from database resets
- No rollback mechanism

---

## 🚀 **Next Steps (Option B)**

To fix limitations and prevent database resets:
1. Upgrade to Render PostgreSQL ($7/mo)
2. Add auto-rebuild on deployment
3. Set up automated backups
4. Implement CI/CD pipeline

See: `UPGRADE_TO_PAID_DATABASE.md` for migration guide.

---

## 📞 **Support**

### **Quick Reference:**
- **Render Dashboard:** https://dashboard.render.com
- **GitHub Repo:** Your repository URL
- **Database Provider:** Aiven/Neon dashboard

### **Emergency Contacts:**
- Database reset: Re-run seed script
- Server down: Check Render logs
- Code issues: Check Git history, rollback if needed

---

## ✅ **Summary**

### **Current Workflow:**
1. Edit TypeScript in `src/`
2. Run `npm run build`
3. Commit including `dist/`
4. Push to GitHub
5. Render auto-deploys

### **Key Points:**
- ✅ Fast deployments (no build on server)
- ✅ Pre-compiled code used in production
- ❌ Manual rebuild required
- ❌ Database resets periodically
- ❌ Must remember build step

---

*Documentation Date: October 14, 2025*  
*Last Updated: Current deployment workflow with manual TypeScript compilation*

