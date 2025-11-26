# 🔐 Production Admin Setup Instructions

## ⚠️ **Issue Identified**

The local Prisma client is configured for SQLite, which prevents us from directly connecting to the production PostgreSQL database from local scripts.

---

## ✅ **SOLUTION OPTIONS**

### **Option 1: Manual Database Access (RECOMMENDED)**

You need to access the production database directly and run this SQL:

#### **1. Connect to Production Database:**

**Database Details:**
```
Host:     dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com
Database: eventmarketers_db
User:     eventmarketers_user
Password: XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G
Port:     5432
```

**Connection String:**
```
postgresql://eventmarketers_user:XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G@dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com/eventmarketers_db
```

#### **2. Run This SQL to Create Admin:**

```sql
-- First, check if admin exists
SELECT * FROM admins WHERE email = 'admin@eventmarketers.com';

-- If not exists, insert the admin user
-- Password: EventMarketers2024! (already hashed with bcrypt)
INSERT INTO admins (
  id,
  email,
  name,
  password,
  role,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'admin@eventmarketers.com',
  'EventMarketers Admin',
  '$2a$12$xyz...', -- You'll need to generate this hash
  'ADMIN',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  "isActive" = true,
  "updatedAt" = NOW();
```

**Note:** The password needs to be hashed first. See Option 2 for hash generation.

---

### **Option 2: Generate Password Hash (EASIEST)**

I'll create a simple script to generate the bcrypt hash that you can use in SQL:

```bash
node generate_password_hash.js
```

This will give you the hashed password to use in the SQL above.

---

### **Option 3: Via Render Dashboard**

1. Go to your Render dashboard
2. Navigate to your PostgreSQL database
3. Click "Connect" → "External Connection"
4. Use a SQL client (pgAdmin, DBeaver, etc.) to connect
5. Run the SQL from Option 1

---

### **Option 4: Via Render Shell**

1. Go to Render dashboard
2. Open your backend service
3. Click "Shell" to access the server shell
4. Run:
```bash
cd /app
node create_admin_user.js
```

This will work because the production server has the correct Prisma configuration.

---

## 🎯 **CURRENT ADMIN CREDENTIALS (To Be Created)**

```
Email:    admin@eventmarketers.com
Password: EventMarketers2024!
Name:     EventMarketers Admin
Role:     ADMIN
Status:   Active
```

---

## 🧪 **After Creating Admin - Test Login**

Once you've created the admin user, test with:

```bash
node test_admin_credentials.js
```

Or manually test:

```bash
curl -X POST https://eventmarketersbackend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eventmarketers.com",
    "password": "EventMarketers2024!"
  }'
```

---

## 📋 **Quick Steps Summary**

1. ✅ Access Render Dashboard
2. ✅ Go to your backend service Shell
3. ✅ Run: `node create_admin_user.js`
4. ✅ Test with: `node test_admin_credentials.js` (locally)
5. ✅ Save the working credentials

---

## 🔧 **Alternative: Deploy Script to Production**

If the above doesn't work, I can help you:
1. Add an admin setup endpoint to the API
2. Deploy it to production
3. Call it once to create the admin
4. Remove the endpoint after use

---

**Which option would you like to proceed with?**






