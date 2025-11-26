# Admin Login Endpoint Fix

## Problem Identified
The admin login endpoint `/api/auth/admin/login` was returning a **500 Internal Server Error** because:

1. ❌ The `deployment_server.js` file (used in production) **did NOT include** the admin authentication endpoints
2. ✅ The endpoint existed in `src/routes/auth.ts` but was not part of the deployment package
3. ✅ The `package.json` shows: `"start": "node deployment_server.js"` - which only had mobile APIs

## Solution Implemented

### Changes Made to `deployment-package/deployment_server.js`:

1. **Added Required Dependencies:**
   ```javascript
   const bcrypt = require('bcryptjs');
   const jwt = require('jsonwebtoken');
   const JWT_SECRET = process.env.JWT_SECRET || 'eventmarketers-secret-key-2024';
   ```

2. **Added Admin Login Endpoint:** `POST /api/auth/admin/login`
   - Validates email and password
   - Queries `prisma.admins` table
   - Verifies password with bcrypt
   - Generates JWT token (7-day expiry)
   - Logs audit entry
   - Returns user info and token

3. **Added Subadmin Login Endpoint:** `POST /api/auth/subadmin/login`
   - Similar to admin login
   - Queries `prisma.subadmins` table
   - Includes permissions and assigned categories

## Database Requirements

The following admin accounts should exist (from seed script):

**Admin Account:**
- Email: `admin@eventmarketers.com`
- Password: `admin123` (bcrypt hashed)
- Role: `ADMIN`
- isActive: `true`

**Subadmin Account:**
- Email: `subadmin@eventmarketers.com`
- Password: `subadmin123` (bcrypt hashed)
- Role: `Content Manager`
- Status: `ACTIVE`

## API Endpoint Details

### Admin Login
**POST** `/api/auth/admin/login`

**Request Body:**
```json
{
  "email": "admin@eventmarketers.com",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin-id",
    "email": "admin@eventmarketers.com",
    "name": "System Administrator",
    "role": "ADMIN",
    "userType": "ADMIN"
  }
}
```

**Error Responses:**
- `400`: Missing email or password
- `401`: Invalid credentials or account inactive
- `500`: Internal server error

## Next Steps to Deploy

### Option 1: Commit and Push to Git (Recommended)
```bash
git add deployment-package/deployment_server.js
git commit -m "Add admin authentication endpoints to deployment server"
git push origin main
```

Then in Render dashboard:
1. Go to your backend service
2. Trigger a manual deploy or wait for auto-deploy
3. Monitor the deployment logs

### Option 2: Direct File Update on Render
If you have shell access to Render:
1. Upload the updated `deployment_server.js`
2. Restart the service

## Testing the Endpoint

### Using PowerShell:
```powershell
$body = @{email='admin@eventmarketers.com';password='admin123'} | ConvertTo-Json
Invoke-RestMethod -Uri 'https://eventmarketersbackend.onrender.com/api/auth/admin/login' -Method POST -ContentType 'application/json' -Body $body
```

### Using curl:
```bash
curl -X POST https://eventmarketersbackend.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eventmarketers.com","password":"admin123"}'
```

## Frontend Integration

The frontend at [https://eventmarketersbackend.onrender.com/login](https://eventmarketersfrontend.onrender.com/login) shows the demo credentials and should work once the backend is deployed.

## Dependencies

Both required packages are already in `package.json`:
- ✅ `bcryptjs: ^2.4.3`
- ✅ `jsonwebtoken: ^9.0.0`

## Files Modified

1. `deployment-package/deployment_server.js` - Added admin authentication endpoints

---

**Status:** ✅ Fixed locally, ready for deployment
**Date:** October 13, 2025

