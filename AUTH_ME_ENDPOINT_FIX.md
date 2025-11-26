# Fix: /api/mobile/auth/me Endpoint Consistency Issue

## Problem
The `/api/mobile/auth/me` endpoint was returning stale values for `website` and `address` fields even after updating via `/api/mobile/users/:id`. The update API correctly returned the new values, but `/me` still showed old values.

## Root Causes

### 1. **BusinessProfile Selection Mismatch**
- **PUT `/api/mobile/users/:id`**: Updated the **latest** BusinessProfile (`orderBy: { createdAt: 'desc' }`)
- **GET `/api/mobile/auth/me`**: Retrieved from the **oldest** BusinessProfile (`orderBy: { createdAt: 'asc' }`)

This caused a mismatch where updates affected one profile, but `/me` read from a different (older) profile.

### 2. **Null Value Handling**
- `/me` endpoint was converting `null` values to empty strings (`|| ''`)
- PUT endpoint correctly returned `null` values
- This caused inconsistency when explicitly setting fields to `null`

## Solution Implemented

### 1. Fixed Profile Selection
**Changed `/api/mobile/auth/me` to use latest profile (matching update endpoint):**

```javascript
// BEFORE: Get oldest business profile
orderBy: { createdAt: 'asc' }

// AFTER: Get latest business profile (matches update endpoint)
orderBy: { createdAt: 'desc' }
```

### 2. Fixed Null Value Handling
**Changed `/me` endpoint to preserve null values:**

```javascript
// BEFORE: Convert null to empty string
address: businessProfile?.businessAddress || '',
website: businessProfile?.businessWebsite || '',

// AFTER: Preserve null values (matches PUT endpoint)
address: businessProfile?.businessAddress ?? null,
website: businessProfile?.businessWebsite ?? null,
```

### 3. Improved Update Logic
**Enhanced PUT endpoint to properly handle null values:**

- Explicitly handles `null` values (not just undefined)
- Updates existing BusinessProfile even when setting to null
- Ensures database is actually updated with null values

## Test Results

All tests passing:

```
✅ Registration: PASS
✅ /me endpoint (initial): PASS
✅ PUT endpoint (update): PASS
✅ /me endpoint (after update): PASS
✅ VALUES MATCH between PUT and /me endpoints!
✅ PUT endpoint (null update): PASS
✅ /me endpoint (after null): PASS
✅ NULL VALUE MATCHES between PUT and /me endpoints!
```

## Files Modified

- `deployment_server.js`
  - Updated `GET /api/mobile/auth/me` (line ~946)
    - Changed to use latest BusinessProfile (`desc` instead of `asc`)
    - Fixed null value handling (`?? null` instead of `|| ''`)
  - Enhanced `PUT /api/mobile/users/:id` (line ~6267)
    - Improved null value handling logic
    - Ensures updates persist correctly

## Verification

The fix ensures:
1. ✅ Both endpoints read/write from the same BusinessProfile (latest)
2. ✅ Null values are correctly preserved and returned
3. ✅ Updates are immediately reflected in `/me` endpoint
4. ✅ Database updates correctly persist null values

## Status

✅ **FIXED** - Both endpoints now return consistent values immediately after updates.


