# Production Database Setup Guide

## Issue Diagnosed
The admin login endpoint is returning **500 Internal Server Error** because the **admin user doesn't exist in the production database**.

## Solution: Seed the Admin User

### Option 1: Using Render Shell (Recommended) ✅

1. **Open Render Dashboard**
   - Go to https://dashboard.render.com
   - Select your **eventmarketersbackend** service

2. **Open Shell**
   - Click on **"Shell"** tab in the left sidebar
   - This opens a terminal connected to your production server

3. **Run the Seed Script**
   ```bash
   node seed-admin-production.js
   ```

4. **Expected Output:**
   ```
   🌱 Seeding admin users to production database...
   
   ✅ Admin user created successfully!
      Email: admin@eventmarketers.com
      ID: admin_xxxxx
   
   ✅ Subadmin user created successfully!
      Email: subadmin@eventmarketers.com
      ID: subadmin_xxxxx
   
   📋 Demo Credentials:
      Admin: admin@eventmarketers.com / admin123
      Subadmin: subadmin@eventmarketers.com / subadmin123
   ```

---

### Option 2: Add to Build Process

Modify `package.json` to run the seed automatically on deploy:

```json
{
  "scripts": {
    "build": "npm run db:push && node seed-admin-production.js",
    "start": "node deployment_server.js"
  }
}
```

**Note:** This will try to create the admin user on every deploy (safe - it checks if exists first).

---

### Option 3: Run Locally Against Production DB

If you have the production `DATABASE_URL`:

```bash
# Set the production database URL
$env:DATABASE_URL = "your-production-postgres-url"

# Run the seed script
node seed-admin-production.js
```

---

## After Seeding

Once the admin user is created, test the login:

```powershell
$body = '{"email":"admin@eventmarketers.com","password":"admin123"}'
Invoke-RestMethod -Uri 'https://eventmarketersbackend.onrender.com/api/auth/admin/login' -Method POST -ContentType 'application/json' -Body $body
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin_xxxxx",
    "email": "admin@eventmarketers.com",
    "name": "System Administrator",
    "role": "admin",
    "userType": "ADMIN"
  }
}
```

---

## Frontend Login

After successful seeding, the frontend login page will work:
- **URL:** https://eventmarketersfrontend.onrender.com/login
- **Admin:** `admin@eventmarketers.com` / `admin123`
- **Subadmin:** `subadmin@eventmarketers.com` / `subadmin123`

---

## Troubleshooting

### If you get "User already exists"
This is fine! The script detected an existing user. The login should work.

### If you get database connection errors
1. Check that `DATABASE_URL` environment variable is set in Render
2. Verify the PostgreSQL database is running
3. Check database credentials

### If login still fails after seeding
1. Verify the user was created:
   ```bash
   # In Render shell
   node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.admins.findMany().then(console.log).finally(() => p.$disconnect())"
   ```

2. Check the Render logs for error details:
   - Go to **Logs** tab in Render dashboard
   - Look for errors when the login endpoint is called

---

## Files to Commit

Don't forget to commit the seed script:

```bash
git add seed-admin-production.js PRODUCTION_SETUP.md
git commit -m "Add production admin user seed script"
git push origin main
```

---

**Next Step:** Use Render Shell to run `node seed-admin-production.js` 🚀

