# 📱 Mobile API Implementation Plan

## 🎯 Goal
Implement 60+ mobile APIs from documentation without affecting existing Web APIs

---

## ✅ Current Status

### Working Endpoints (15/60):
1. ✅ POST /api/mobile/auth/register (with JWT)
2. ✅ POST /api/mobile/auth/login (with JWT)
3. ✅ GET /api/mobile/home/stats
4. ✅ GET /api/mobile/home/featured
5. ✅ GET /api/mobile/templates
6. ✅ GET /api/mobile/greetings
7. ✅ GET /api/mobile/posters
8. ✅ GET /api/mobile/posters/categories
9. ✅ GET /api/mobile/posters/category/:name
10. ✅ GET /api/mobile/greetings/categories
11. ✅ GET /api/mobile/templates/categories
12. ✅ GET /api/mobile/subscriptions/plans
13. ✅ GET /api/mobile/subscriptions/status (JWT auth)
14. ✅ GET /api/mobile/subscriptions/history (JWT auth)
15. ✅ GET /api/mobile/users/:id

**Progress: 25% Complete (15/60 endpoints)**

---

## 📊 Gap Analysis

### Authentication APIs (5 missing):
- ❌ POST /api/mobile/auth/google (Google OAuth)
- ❌ GET /api/mobile/auth/me (Get current user profile)
- ❌ PUT /api/mobile/auth/profile (Update profile)
- ❌ POST /api/mobile/auth/logout
- ❌ POST /api/mobile/auth/forgot-password
- ❌ POST /api/mobile/auth/reset-password
- ❌ POST /api/mobile/auth/verify-email

### User Management APIs (2 missing):
- ❌ POST /api/mobile/activity (Track user activity)
- ❌ GET /api/mobile/users/:id/stats (User statistics)

### Business Profile APIs (6 missing):
- ❌ POST /api/mobile/business-profile (Create profile)
- ❌ GET /api/mobile/business-profile (Get all profiles)
- ❌ GET /api/mobile/business-profile/:userId (User's profiles)
- ❌ PUT /api/mobile/business-profile/:id (Update profile)
- ❌ DELETE /api/mobile/business-profile/:id (Delete profile)
- ❌ POST /api/mobile/business-profile/:id/upload (Upload image)

### Home Screen APIs (4 missing):
- ❌ GET /api/mobile/home/upcoming-events
- ❌ GET /api/mobile/home/templates (different from /api/mobile/templates)
- ❌ GET /api/mobile/home/video-content
- ❌ GET /api/mobile/home/search

### Templates APIs (5 missing):
- ❌ GET /api/mobile/templates/:id (Get specific template)
- ❌ GET /api/mobile/templates/languages
- ❌ GET /api/mobile/templates/search
- ❌ POST /api/mobile/templates/:id/like
- ❌ DELETE /api/mobile/templates/:id/like
- ❌ POST /api/mobile/templates/:id/download

### Greeting Templates APIs (5 missing):
- ❌ GET /api/mobile/greetings/templates
- ❌ GET /api/mobile/greetings/templates/search
- ❌ GET /api/mobile/greetings/templates/:id
- ❌ GET /api/mobile/greetings/stickers
- ❌ GET /api/mobile/greetings/emojis
- ❌ POST /api/mobile/greetings/templates/:id/like
- ❌ DELETE /api/mobile/greetings/templates/:id/like
- ❌ POST /api/mobile/greetings/templates/:id/download

### Subscription APIs (2 missing):
- ❌ POST /api/mobile/subscriptions/subscribe
- ❌ POST /api/mobile/subscriptions/renew
- ❌ POST /api/mobile/subscriptions/cancel

### Likes APIs (6 missing):
- ❌ POST /api/mobile/likes (Generic like)
- ❌ DELETE /api/mobile/likes (Generic unlike)
- ❌ GET /api/mobile/likes/user/:userId (User's likes)
- ❌ GET /api/mobile/likes/check (Check if liked)
- ❌ GET /api/mobile/likes (All likes)

### Downloads APIs (1 missing):
- ❌ POST /api/mobile/downloads/track

### Content Management APIs (3 missing):
- ❌ POST /api/content/images (Upload image)
- ❌ POST /api/content/videos (Upload video)
- ❌ GET /api/content/pending-approvals (Admin only)

---

## 🛡️ Safety Strategy - Why This Won't Affect Web APIs

### 1. **Complete Isolation**
```
Web APIs:     /api/auth/*
              /api/admin/*
              /api/content/*
              /api/admin/customers/*

Mobile APIs:  /api/mobile/*     ← Completely separate namespace
```

✅ **Zero Conflict** - Different URL paths = No overlap

### 2. **Separate Route Files**
- Web APIs use: `src/routes/auth.ts`, `src/routes/admin.ts`, etc.
- Mobile APIs use: `deployment_server.js` (isolated implementation)
- No shared code = No risk of breaking Web APIs

### 3. **Database Isolation**
- Web APIs use: Customer, User, Admin tables
- Mobile APIs use: MobileUser, MobileSubscription, MobileLike, etc.
- Separate tables = No data conflicts

---

## 🎯 Recommended Implementation Approach

### **Option 1: Gradual Addition to deployment_server.js** ⭐ RECOMMENDED
**Pros:**
- ✅ Safe - tested approach (we just did this successfully)
- ✅ No conflicts with Web APIs
- ✅ Easy to test and debug
- ✅ Works with current deployment setup
- ✅ Production-ready immediately

**Cons:**
- ⏰ Takes more time (but safer)
- 📝 More manual coding

**Implementation Plan:**
```
Phase 1 (Week 1): Core APIs - 15 endpoints
  - Complete authentication (5 endpoints)
  - User management (3 endpoints)
  - Subscription management (3 endpoints)
  - Business profiles (4 endpoints)

Phase 2 (Week 2): Content APIs - 20 endpoints
  - Templates (8 endpoints)
  - Greetings (7 endpoints)
  - Home screen (5 endpoints)

Phase 3 (Week 3): Engagement APIs - 10 endpoints
  - Likes (6 endpoints)
  - Downloads (2 endpoints)
  - Activity tracking (2 endpoints)

Phase 4 (Final): Advanced Features - 15 endpoints
  - Content management (3 endpoints)
  - Search & filtering (5 endpoints)
  - Analytics (7 endpoints)
```

### **Option 2: Use TypeScript Routes + Fix Schema Issues**
**Pros:**
- ✅ All 96+ endpoints available immediately
- ✅ Code already exists
- ✅ Full feature set

**Cons:**
- ❌ Prisma schema mismatches (we saw errors)
- ❌ Needs debugging of all endpoints
- ❌ Risky - might break existing functionality
- ❌ Requires TypeScript compilation in production

**Risk Level:** 🔴 HIGH

---

## 🚀 Recommended Approach (Option 1 - Detailed)

### **Phase 1: Core Mobile APIs** (Priority: CRITICAL)
**Timeline:** 2-3 days  
**Endpoints to Add:** 15

#### 1.1 Authentication (5 endpoints)
```javascript
✅ POST /api/mobile/auth/register (DONE)
✅ POST /api/mobile/auth/login (DONE)
❌ GET /api/mobile/auth/me
❌ PUT /api/mobile/auth/profile
❌ POST /api/mobile/auth/logout
```

#### 1.2 Business Profile (4 endpoints)
```javascript
❌ POST /api/mobile/business-profile
❌ GET /api/mobile/business-profile
❌ GET /api/mobile/business-profile/:userId
❌ PUT /api/mobile/business-profile/:id
```

#### 1.3 Subscriptions (3 endpoints)
```javascript
✅ GET /api/mobile/subscriptions/plans (DONE)
✅ GET /api/mobile/subscriptions/status (DONE)
❌ POST /api/mobile/subscriptions/subscribe
```

#### 1.4 User Management (3 endpoints)
```javascript
✅ GET /api/mobile/users/:id (DONE)
❌ GET /api/mobile/users/:id/stats
❌ POST /api/mobile/activity
```

**After Phase 1:** 30 endpoints working (50% complete)

---

### **Phase 2: Content & Discovery** (Priority: HIGH)
**Timeline:** 3-4 days  
**Endpoints to Add:** 18

#### 2.1 Templates (6 endpoints)
```javascript
✅ GET /api/mobile/templates (DONE)
✅ GET /api/mobile/templates/categories (DONE)
❌ GET /api/mobile/templates/:id
❌ GET /api/mobile/templates/languages
❌ GET /api/mobile/templates/search
❌ POST /api/mobile/templates/:id/download
```

#### 2.2 Greetings (7 endpoints)
```javascript
✅ GET /api/mobile/greetings (DONE)
✅ GET /api/mobile/greetings/categories (DONE)
❌ GET /api/mobile/greetings/templates
❌ GET /api/mobile/greetings/templates/search
❌ GET /api/mobile/greetings/templates/:id
❌ GET /api/mobile/greetings/stickers
❌ GET /api/mobile/greetings/emojis
```

#### 2.3 Home Screen (5 endpoints)
```javascript
✅ GET /api/mobile/home/featured (DONE)
❌ GET /api/mobile/home/upcoming-events
❌ GET /api/mobile/home/templates
❌ GET /api/mobile/home/video-content
❌ GET /api/mobile/home/search
```

**After Phase 2:** 48 endpoints working (80% complete)

---

### **Phase 3: Engagement Features** (Priority: MEDIUM)
**Timeline:** 2-3 days  
**Endpoints to Add:** 9

#### 3.1 Likes (6 endpoints)
```javascript
❌ POST /api/mobile/likes
❌ DELETE /api/mobile/likes
❌ GET /api/mobile/likes/user/:userId
❌ GET /api/mobile/likes/check
❌ POST /api/mobile/templates/:id/like
❌ DELETE /api/mobile/templates/:id/like
```

#### 3.2 Downloads (2 endpoints)
```javascript
❌ POST /api/mobile/downloads/track
❌ GET /api/mobile/downloads/user/:userId
```

#### 3.3 Business Categories (1 endpoint)
```javascript
❌ GET /api/mobile/business-categories
```

**After Phase 3:** 57 endpoints working (95% complete)

---

### **Phase 4: Advanced Features** (Priority: LOW)
**Timeline:** 1-2 days  
**Endpoints to Add:** 3

```javascript
❌ POST /api/content/images (Admin feature)
❌ POST /api/content/videos (Admin feature)
❌ GET /api/content/pending-approvals (Admin feature)
```

**After Phase 4:** 60 endpoints working (100% complete)

---

## 🔧 Implementation Strategy

### **Step-by-Step Process:**

1. **For Each Endpoint:**
   ```
   a. Read endpoint specification from documentation
   b. Write endpoint code in deployment_server.js
   c. Test locally with test script
   d. Fix any issues
   e. Commit with descriptive message
   f. Move to next endpoint
   ```

2. **After Each Phase:**
   ```
   a. Run comprehensive test suite
   b. Verify all existing endpoints still work
   c. Push batch to production
   d. Test on live server
   e. Document what was added
   ```

3. **Safety Checks:**
   ```
   a. Always keep Web APIs in separate namespace (/api/admin, /api/auth, etc.)
   b. Never modify existing Web route files
   c. Only add to deployment_server.js
   d. Test Web APIs after each phase to ensure no regression
   ```

---

## 🛡️ Risk Mitigation

### **How to Ensure Web APIs Stay Safe:**

1. **Namespace Isolation**
   ```javascript
   // Web APIs (NEVER TOUCH)
   app.use('/api/auth', authRoutes);           // Admin/Web login
   app.use('/api/admin', adminRoutes);         // Admin panel
   app.use('/api/content', contentRoutes);     // Content management
   
   // Mobile APIs (ADD HERE)
   app.use('/api/mobile/*', mobileRoutes);     // All mobile endpoints
   ```

2. **Separate Data Models**
   - Web uses: `Customer`, `User`, `Admin`
   - Mobile uses: `MobileUser`, `MobileSubscription`, `MobileLike`
   - No overlap = No conflicts

3. **Different Authentication**
   - Web: Session-based or different JWT structure
   - Mobile: JWT with `userType: 'MOBILE_USER'`
   - Middleware checks userType before processing

4. **Testing Protocol**
   ```
   After EVERY change:
   1. Test the new mobile endpoint ✅
   2. Test existing Web APIs ✅
   3. Only commit if both work ✅
   ```

---

## 📋 Detailed Phase 1 Plan (Next Steps)

### **Immediate Action Items:**

#### **Batch 1: Authentication Completion** (2-3 hours)
```javascript
1. GET /api/mobile/auth/me
   - Extract userId from JWT
   - Return user profile
   - Test: 15 min

2. PUT /api/mobile/auth/profile  
   - Extract userId from JWT
   - Update user fields
   - Test: 15 min

3. POST /api/mobile/auth/logout
   - Invalidate token (client-side mostly)
   - Log activity
   - Test: 10 min
```

#### **Batch 2: Business Profiles** (3-4 hours)
```javascript
4. POST /api/mobile/business-profile
   - Create business profile
   - Link to mobileUser
   - Test: 20 min

5. GET /api/mobile/business-profile
   - List all profiles with pagination
   - Test: 15 min

6. GET /api/mobile/business-profile/:userId
   - Get user's profiles
   - Test: 15 min

7. PUT /api/mobile/business-profile/:id
   - Update profile
   - Test: 15 min
```

#### **Batch 3: Subscriptions** (1-2 hours)
```javascript
8. POST /api/mobile/subscriptions/subscribe
   - Create subscription
   - Process payment (mock)
   - Test: 20 min

9. POST /api/mobile/subscriptions/renew
   - Extend subscription
   - Test: 15 min

10. POST /api/mobile/subscriptions/cancel
    - Cancel subscription
    - Test: 15 min
```

**Total for Phase 1: 6-9 hours**

---

## 🎯 My Recommended Approach

### **Best Strategy: Hybrid Approach**

1. **Keep What Works** ✅
   - Current 15 endpoints in deployment_server.js
   - Don't touch Web APIs at all

2. **Add Missing Endpoints in Batches** 📦
   - Add 5-10 endpoints per batch
   - Test thoroughly after each batch
   - Commit and push each batch

3. **Use Mock Data Initially** 🎭
   - Return mock data for complex endpoints
   - Replace with real database queries later
   - Ensures mobile app can proceed with UI development

4. **Incremental Deployment** 🚀
   - Deploy to production after each phase
   - Mobile team can start testing immediately
   - Lower risk of breaking changes

---

## 📝 Implementation Code Structure

### **Template for Adding New Endpoint:**

```javascript
// ============================================
// ENDPOINT NAME: [Description]
// ============================================
app.[method]('/api/mobile/[path]', async (req, res) => {
  try {
    // 1. Extract auth if needed
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
    }

    // 2. Validate input
    const { param1, param2 } = req.body || req.query;
    if (!param1) {
      return res.status(400).json({
        success: false,
        error: 'param1 is required'
      });
    }

    // 3. Database query or mock data
    const data = await prisma.model.findMany({ ... });

    // 4. Return response
    res.json({
      success: true,
      data: data,
      message: 'Success message'
    });

  } catch (error) {
    console.error('[Endpoint name] error:', error);
    res.status(500).json({
      success: false,
      error: 'Error message'
    });
  }
});
```

---

## ✅ Next Immediate Steps

### **What I'll Do Now:**

1. **Start with Batch 1** (5 authentication endpoints)
   - Add to deployment_server.js
   - Test each one
   - Ensure existing endpoints still work

2. **Then Proceed to:**
   - Batch 2: Business profiles
   - Batch 3: Subscriptions  
   - Batch 4: Templates & Greetings
   - And so on...

3. **After Each Batch:**
   - Run comprehensive test
   - Commit changes
   - Push to production
   - Verify on live server

---

## 🎯 Expected Timeline

| Phase | Duration | Endpoints Added | Total Progress |
|-------|----------|----------------|----------------|
| **Current** | - | 15 | 25% |
| **Phase 1** | 1-2 days | +15 | 50% |
| **Phase 2** | 2-3 days | +18 | 80% |
| **Phase 3** | 1-2 days | +9 | 95% |
| **Phase 4** | 1 day | +3 | 100% |
| **TOTAL** | **5-8 days** | **+45** | **100%** |

---

## 🚨 Important Notes

1. **Web APIs Will NOT Be Affected Because:**
   - Different URL namespace (`/api/mobile/*` vs `/api/auth/*`, `/api/admin/*`)
   - Different database models (MobileUser vs Customer/User)
   - Separate middleware and authentication
   - No shared route files

2. **Deployment:**
   - Each batch can be deployed independently
   - No need to deploy everything at once
   - Mobile team can start using APIs as they become available

3. **Testing:**
   - Test script for each new endpoint
   - Regression test for existing endpoints
   - Both local and production testing

---

## 💡 Final Recommendation

**Start with Phase 1 - Add the next 10 critical endpoints in 3 batches:**

1. **Batch 1:** Authentication completion (3 endpoints) - 1 hour
2. **Batch 2:** Business profiles (4 endpoints) - 2 hours  
3. **Batch 3:** Subscription actions (3 endpoints) - 1 hour

**This will bring you to 25 endpoints (42% complete) in about 4 hours of work.**

---

Would you like me to:
1. ✅ **Start implementing Phase 1 Batch 1 now** (3 authentication endpoints)?
2. ⏸️ **Review the plan first** and adjust priorities?
3. 🎯 **Focus on specific endpoints** your mobile team needs urgently?

