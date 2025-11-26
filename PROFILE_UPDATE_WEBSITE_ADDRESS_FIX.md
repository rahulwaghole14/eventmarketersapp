# Profile Update - Website & Address Fields Fix

## Issue
The `/api/mobile/users/:id` endpoint (PUT) was not returning `website` and `address` fields in the response, even though they could be provided in the request body.

## Root Cause
- `website` and `address` fields are stored in the `BusinessProfile` table, not directly in the `MobileUser` table
- The endpoint was only updating/reading from the `MobileUser` table
- The response didn't include these fields

## Solution Implemented

### 1. Updated PUT `/api/mobile/users/:id` Endpoint

**Changes:**
- ✅ Accepts `website` and `address` in request body
- ✅ Updates or creates `BusinessProfile` for the user when these fields are provided
- ✅ Fetches existing `BusinessProfile` even if not updating, to include in response
- ✅ Response now includes `website` and `address` fields

**Request Body:**
```json
{
  "name": "Rsl",
  "email": "test@test.com",
  "phone": "9876544321",
  "alternatePhone": "0000000000",
  "website": "https://example.com",  // NEW
  "address": "123 Main Street, City"  // NEW
}
```

**Response:**
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "user": {
      "id": "cmgexfzpg0000gjwd97azss8v",
      "name": "Rsl",
      "email": "test@test.com",
      "phone": "9876544321",
      "alternatePhone": "0000000000",
      "deviceId": null,
      "isActive": true,
      "lastActiveAt": "2025-10-31T05:05:29.755Z",
      "joinedDate": "2025-10-06T09:27:07.396Z",
      "updatedAt": "2025-10-31T05:05:29.756Z",
      "website": "https://example.com",  // ✅ NOW INCLUDED
      "address": "123 Main Street, City",  // ✅ NOW INCLUDED
      "stats": {
        "totalSubscriptions": 3,
        "totalDownloads": 9,
        "totalLikes": 2
      }
    }
  }
}
```

### 2. Updated GET `/api/mobile/users/:id` Endpoint

**Changes:**
- ✅ Fetches `BusinessProfile` to get website and address
- ✅ Response now includes `website` and `address` fields
- ✅ Also added `alternatePhone` and `updatedAt` to match PUT response

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmgexfzpg0000gjwd97azss8v",
      "name": "Rsl",
      "email": "test@test.com",
      "phone": "9876544321",
      "alternatePhone": "0000000000",
      "deviceId": null,
      "isActive": true,
      "lastActiveAt": "2025-10-31T05:05:29.755Z",
      "joinedDate": "2025-10-06T09:27:07.396Z",
      "updatedAt": "2025-10-31T05:05:29.756Z",
      "website": "https://example.com",  // ✅ NOW INCLUDED
      "address": "123 Main Street, City",  // ✅ NOW INCLUDED
      "stats": {
        "totalSubscriptions": 3,
        "totalDownloads": 9,
        "totalLikes": 2
      }
    }
  }
}
```

## Implementation Details

### BusinessProfile Handling Logic

1. **When updating website/address:**
   - Finds existing `BusinessProfile` for the user (by `mobileUserId`)
   - If exists: Updates the existing profile
   - If doesn't exist: Creates a new profile with user's basic info

2. **When fetching profile:**
   - Always fetches the latest `BusinessProfile` for the user
   - Includes `website` and `address` in response (null if not set)

### Database Schema Reference

**BusinessProfile Table:**
- `businessWebsite` → mapped to `website` in API response
- `businessAddress` → mapped to `address` in API response
- Linked via `mobileUserId` to `MobileUser` table

## Testing

### Test Update Endpoint with Website and Address

```bash
curl -X PUT http://localhost:3001/api/mobile/users/{userId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Rsl",
    "website": "https://example.com",
    "address": "123 Main Street, City"
  }'
```

### Expected Response
Should now include `website` and `address` fields in the response.

## Files Modified

- `deployment_server.js`
  - Updated `PUT /api/mobile/users/:id` endpoint (lines ~6267-6450)
  - Updated `GET /api/mobile/users/:id` endpoint (lines ~6202-6278)

## Status

✅ **FIXED** - Both endpoints now properly handle and return `website` and `address` fields.

