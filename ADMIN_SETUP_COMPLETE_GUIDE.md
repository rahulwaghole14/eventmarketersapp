# 🔐 Complete Admin Setup Guide

## ✅ **Password Hashes Generated Successfully!**

---

## 📋 **READY TO USE - COPY THIS SQL**

### **SQL to Create Admin User on Production:**

```sql
-- Insert admin user with email: admin@eventmarketers.com
-- Password: EventMarketers2024!

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
  'admin-' || gen_random_uuid()::text,
  'admin@eventmarketers.com',
  'EventMarketers Admin',
  '$2a$12$oVMLwO2Fe13fLjJmvHrUgemHEkVtqqsUYSR4pM5AFRaYWJqD9g86i',
  'ADMIN',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = '$2a$12$oVMLwO2Fe13fLjJmvHrUgemHEkVtqqsUYSR4pM5AFRaYWJqD9g86i',
  "isActive" = true,
  "updatedAt" = NOW();
```

---

## 🔑 **Generated Password Hashes**

| Password | Bcrypt Hash |
|----------|-------------|
| `EventMarketers2024!` | `$2a$12$oVMLwO2Fe13fLjJmvHrUgemHEkVtqqsUYSR4pM5AFRaYWJqD9g86i` |
| `admin123` | `$2a$12$n/i1dwLlZwO.u011JIoar.ep51CIjHMSjZG0yFwKuwLyVdziwimVO` |
| `Admin@123` | `$2a$12$HL8F39.LnlnQx/DqZwz79ODixtTm24fvh.rep4SVTB.RSHmM6/enS` |

---

## 🚀 **HOW TO CREATE ADMIN USER**

### **Method 1: Via Render Shell (EASIEST ✅)**

1. Go to **Render Dashboard**
2. Navigate to your **backend service**
3. Click **"Shell"** tab
4. Run this command:
   ```bash
   node create_admin_user.js
   ```
5. Done! Admin will be created automatically

### **Method 2: Direct Database Access**

1. **Connect to PostgreSQL:**
   ```
   Host:     dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com
   Database: eventmarketers_db
   User:     eventmarketers_user
   Password: XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G
   Port:     5432
   ```

2. **Run the SQL above** (from "READY TO USE" section)

3. **Verify:**
   ```sql
   SELECT id, email, name, role, "isActive" 
   FROM admins 
   WHERE email = 'admin@eventmarketers.com';
   ```

### **Method 3: Using pgAdmin or DBeaver**

1. Install pgAdmin or DBeaver
2. Create new PostgreSQL connection with credentials above
3. Execute the SQL query
4. Verify the admin was created

---

## 🧪 **TEST THE ADMIN CREDENTIALS**

After creating the admin, test with the script:

```bash
node test_admin_credentials.js
```

Or test manually:

```bash
curl -X POST https://eventmarketersbackend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eventmarketers.com","password":"EventMarketers2024!"}'
```

---

## 📝 **FINAL ADMIN CREDENTIALS**

Once created, use these credentials:

```
📧 Email:    admin@eventmarketers.com
🔑 Password: EventMarketers2024!
👤 Name:     EventMarketers Admin
🎭 Role:     ADMIN
✅ Status:   Active
```

### **Login Endpoint:**
```
POST https://eventmarketersbackend.onrender.com/api/auth/admin/login
```

### **Request Body:**
```json
{
  "email": "admin@eventmarketers.com",
  "password": "EventMarketers2024!"
}
```

---

## 📦 **Scripts Available**

| Script | Purpose | Usage |
|--------|---------|-------|
| `test_admin_credentials.js` | Test which credentials work | `node test_admin_credentials.js` |
| `generate_password_hash.js` | Generate bcrypt hashes | `node generate_password_hash.js` |
| `setup_production_admin.js` | Create admin (needs Render) | Run on Render shell |
| `create_admin_user.js` | Create admin (exists) | Run on Render shell |

---

## ✅ **RECOMMENDED STEPS (In Order)**

1. **Create Admin User:**
   - Go to Render Dashboard → Backend Service → Shell
   - Run: `node create_admin_user.js`
   
2. **Test Login:**
   - Locally run: `node test_admin_credentials.js`
   
3. **Save Credentials:**
   - Email: `admin@eventmarketers.com`
   - Password: `EventMarketers2024!`
   
4. **Use in Frontend:**
   - Update your frontend login with these credentials

---

## 🔒 **Security Notes**

- ✅ Password is hashed with bcrypt (12 rounds)
- ✅ Strong password with special characters
- ✅ JWT tokens expire after 7 days
- ✅ Admin has full system access
- ✅ All API endpoints require authentication

---

## 📞 **Quick Reference**

### **Database Connection:**
```
postgresql://eventmarketers_user:XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G@dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com/eventmarketers_db
```

### **API Base URL:**
```
https://eventmarketersbackend.onrender.com
```

### **Admin Login:**
```
POST /api/auth/admin/login
Body: { "email": "admin@eventmarketers.com", "password": "EventMarketers2024!" }
```

---

## 🎯 **Next Steps After Admin Created**

1. ✅ Test login with `test_admin_credentials.js`
2. ✅ Get authentication token
3. ✅ Use token to access protected endpoints
4. ✅ Create subadmins if needed
5. ✅ Start content management

---

**Generated:** October 1, 2025, 11:09 AM  
**Status:** ✅ Password hashes generated  
**Ready:** ✅ SQL query ready to use  
**Next Step:** Create admin via Render Shell or SQL






