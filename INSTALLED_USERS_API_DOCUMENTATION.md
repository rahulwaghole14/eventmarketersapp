# Installed Users Management API Documentation
## Mobile App User Registration and Management

This document provides comprehensive documentation for all Installed Users Management APIs in the EventMarketers backend system. These APIs are designed for mobile app users who have installed the app but haven't subscribed yet.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Installed User Registration](#installed-user-registration)
4. [User Profile Management](#user-profile-management)
5. [Content Tracking](#content-tracking)
6. [Customer Conversion](#customer-conversion)
7. [Error Handling](#error-handling)
8. [Response Formats](#response-formats)
9. [Examples](#examples)

---

## Overview

Installed Users are mobile app users who have downloaded and installed the EventMarketers app but haven't subscribed to a paid plan yet. They can browse content but have limited access to downloads. The system tracks their usage and provides conversion opportunities to paid customers.

### Key Features:
- **User Registration**: Register new app installations
- **Profile Management**: Update user information
- **Content Tracking**: Track views and download attempts
- **Conversion Tracking**: Convert to paid customers
- **Analytics**: Monitor user engagement

---

## Authentication

Installed Users APIs do not require authentication tokens. They use device IDs for identification and tracking.

### Device ID Format:
- Must be unique per device installation
- Recommended format: `device-{timestamp}-{random}` or UUID
- Example: `device-1759486941022-abc123`

---

## Installed User Registration

### 1. Register New Installed User

#### POST `/api/installed-users/register`

Register a new app installation or update existing user information.

**Content-Type**: `application/json`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | String | Yes | Unique device identifier |
| `name` | String | No | User's name (min 2 characters) |
| `email` | String | No | User's email address (valid email format) |
| `phone` | String | No | User's phone number (min 10 characters) |
| `appVersion` | String | No | App version string |

**Response (New User)**:
```json
{
  "success": true,
  "message": "Installed user registered successfully",
  "data": {
    "user": {
      "id": "cmgap3gyo000zlzl6b8e5gzla",
      "deviceId": "test-device-1759486941022",
      "name": "Test User",
      "email": "testuser@example.com",
      "phone": "+1234567890",
      "appVersion": "1.0.0",
      "totalViews": 0,
      "downloadAttempts": 0,
      "isConverted": false,
      "isActive": true,
      "lastActiveAt": "2025-10-03T10:02:21.022Z",
      "createdAt": "2025-10-03T10:02:21.022Z",
      "updatedAt": "2025-10-03T10:02:21.022Z"
    }
  }
}
```

**Response (Existing User)**:
```json
{
  "success": true,
  "message": "User already registered, updated info",
  "data": {
    "user": {
      "id": "cmgap3gyo000zlzl6b8e5gzla",
      "deviceId": "test-device-1759486941022",
      "name": "Updated Test User",
      "email": "testuser@example.com",
      "phone": "+1234567891",
      "appVersion": "1.0.1",
      "totalViews": 0,
      "downloadAttempts": 0,
      "isConverted": false,
      "isActive": true,
      "lastActiveAt": "2025-10-03T10:02:21.022Z",
      "createdAt": "2025-10-03T10:02:21.022Z",
      "updatedAt": "2025-10-03T10:02:21.022Z"
    }
  }
}
```

---

## User Profile Management

### 1. Get Installed Users List

#### GET `/api/installed-users/list`

Retrieve all installed users with pagination.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Items per page (default: 10) |
| `search` | String | No | Search in name, email, or device ID |
| `isConverted` | Boolean | No | Filter by conversion status |

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "cmgap3gyo000zlzl6b8e5gzla",
        "deviceId": "test-device-1759486941022",
        "name": "Test User",
        "email": "testuser@example.com",
        "phone": "+1234567890",
        "appVersion": "1.0.0",
        "totalViews": 0,
        "downloadAttempts": 0,
        "isConverted": false,
        "isActive": true,
        "lastActiveAt": "2025-10-03T10:02:21.022Z",
        "createdAt": "2025-10-03T10:02:21.022Z",
        "updatedAt": "2025-10-03T10:02:21.022Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### 2. Get User Profile by Device ID

#### GET `/api/installed-users/profile/:deviceId`

Retrieve a specific user's profile by their device ID.

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmgap3gyo000zlzl6b8e5gzla",
      "deviceId": "test-device-1759486941022",
      "name": "Test User",
      "email": "testuser@example.com",
      "phone": "+1234567890",
      "appVersion": "1.0.0",
      "totalViews": 0,
      "downloadAttempts": 0,
      "isConverted": false,
      "isActive": true,
      "lastActiveAt": "2025-10-03T10:02:21.022Z",
      "createdAt": "2025-10-03T10:02:21.022Z",
      "updatedAt": "2025-10-03T10:02:21.022Z"
    }
  }
}
```

### 3. Update User Profile

#### PUT `/api/installed-users/profile/:deviceId`

Update user profile information.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | String | No | User's name (min 2 characters) |
| `email` | String | No | User's email address (valid email format) |
| `phone` | String | No | User's phone number (min 10 characters) |
| `appVersion` | String | No | App version string |

**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "cmgap3gyo000zlzl6b8e5gzla",
      "deviceId": "test-device-1759486941022",
      "name": "Updated Profile User",
      "email": "testuser@example.com",
      "phone": "+1234567892",
      "appVersion": "1.0.2",
      "totalViews": 0,
      "downloadAttempts": 0,
      "isConverted": false,
      "isActive": true,
      "lastActiveAt": "2025-10-03T10:02:21.022Z",
      "createdAt": "2025-10-03T10:02:21.022Z",
      "updatedAt": "2025-10-03T10:02:21.022Z"
    }
  }
}
```

---

## Content Tracking

### 1. Track Content View

#### POST `/api/installed-users/track-view`

Track when a user views content (images or videos).

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | String | Yes | User's device ID |
| `contentId` | String | Yes | Content ID (image or video ID) |
| `contentType` | String | Yes | Content type: `IMAGE` or `VIDEO` |

**Response**:
```json
{
  "success": true,
  "message": "View tracked successfully"
}
```

### 2. Track Download Attempt

#### POST `/api/installed-users/track-download-attempt`

Track when a user attempts to download content (triggers subscription prompt).

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | String | Yes | User's device ID |
| `contentId` | String | Yes | Content ID (image or video ID) |
| `contentType` | String | Yes | Content type: `IMAGE` or `VIDEO` |

**Response**:
```json
{
  "success": false,
  "error": "SUBSCRIPTION_REQUIRED",
  "message": "Subscription required to download content",
  "data": {
    "downloadAttempts": 1,
    "showSubscriptionPrompt": true,
    "subscriptionPlans": [
      {
        "id": "yearly_pro",
        "name": "Yearly Pro",
        "price": 1999,
        "period": "year",
        "savings": "67% OFF"
      }
    ]
  }
}
```

---

## Customer Conversion

### 1. Convert to Customer

#### POST `/api/installed-users/convert-to-customer`

Convert an installed user to a paid customer after subscription.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceId` | String | Yes | User's device ID |
| `subscriptionData` | Object | Yes | Subscription information |
| `subscriptionData.plan` | String | Yes | Subscription plan: `MONTHLY` or `YEARLY` |
| `subscriptionData.amount` | Number | Yes | Subscription amount |
| `subscriptionData.paymentMethod` | String | Yes | Payment method |
| `businessProfile` | Object | Yes | Business profile information |
| `businessProfile.businessName` | String | Yes | Business name |
| `businessProfile.businessEmail` | String | Yes | Business email |
| `businessProfile.businessPhone` | String | Yes | Business phone |
| `businessProfile.businessAddress` | String | Yes | Business address |
| `businessProfile.selectedBusinessCategory` | String | Yes | Business category |

**Response**:
```json
{
  "success": true,
  "message": "User converted to customer successfully",
  "data": {
    "customer": {
      "id": "cmgap4abc123def456",
      "email": "testuser@example.com",
      "name": "Test User",
      "businessName": "Test Business",
      "subscriptionStatus": "ACTIVE",
      "subscriptionAmount": 99.99,
      "subscriptionStartDate": "2025-10-03T10:02:21.022Z",
      "subscriptionEndDate": "2025-11-02T10:02:21.022Z",
      "createdAt": "2025-10-03T10:02:21.022Z"
    },
    "subscription": {
      "id": "cmgap4def456ghi789",
      "plan": "MONTHLY",
      "status": "ACTIVE",
      "startDate": "2025-10-03T10:02:21.022Z",
      "endDate": "2025-11-02T10:02:21.022Z"
    }
  }
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Device ID is required",
      "path": "deviceId",
      "location": "body"
    }
  ]
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Installed user not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to track view"
}
```

---

## Response Formats

### Success Response
All successful operations return:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
All failed operations return:
```json
{
  "success": false,
  "error": "Error description",
  "details": [ ... ] // Optional validation details
}
```

---

## Examples

### Example 1: Register New User

```bash
curl -X POST http://localhost:3001/api/installed-users/register \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-1759486941022-abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "appVersion": "1.0.0"
  }'
```

### Example 2: Get User Profile

```bash
curl -X GET http://localhost:3001/api/installed-users/profile/device-1759486941022-abc123
```

### Example 3: Track Content View

```bash
curl -X POST http://localhost:3001/api/installed-users/track-view \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-1759486941022-abc123",
    "contentId": "cmgap4abc123def456",
    "contentType": "IMAGE"
  }'
```

### Example 4: Track Download Attempt

```bash
curl -X POST http://localhost:3001/api/installed-users/track-download-attempt \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-1759486941022-abc123",
    "contentId": "cmgap4abc123def456",
    "contentType": "VIDEO"
  }'
```

### Example 5: Convert to Customer

```bash
curl -X POST http://localhost:3001/api/installed-users/convert-to-customer \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-1759486941022-abc123",
    "subscriptionData": {
      "plan": "MONTHLY",
      "amount": 99.99,
      "paymentMethod": "CREDIT_CARD"
    },
    "businessProfile": {
      "businessName": "Johns Event Planning",
      "businessEmail": "john@example.com",
      "businessPhone": "+1234567890",
      "businessAddress": "123 Event Street, City, State 12345",
      "selectedBusinessCategory": "Event Planners"
    }
  }'
```

### Example 6: Get Users List with Pagination

```bash
curl -X GET "http://localhost:3001/api/installed-users/list?page=1&limit=10&search=john"
```

### Example 7: Update User Profile

```bash
curl -X PUT http://localhost:3001/api/installed-users/profile/device-1759486941022-abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "johnsmith@example.com",
    "phone": "+1234567891",
    "appVersion": "1.0.1"
  }'
```

---

## Business Logic

### User Lifecycle

1. **Installation**: User downloads and installs the app
2. **Registration**: App registers the device with basic information
3. **Browsing**: User can browse content and view images/videos
4. **Download Attempt**: User tries to download content (blocked)
5. **Conversion**: User subscribes and becomes a paid customer

### Content Access Rules

- **Free Users (Installed Users)**:
  - ✅ Can browse all content
  - ✅ Can view images and videos
  - ❌ Cannot download content
  - ❌ Limited to basic features

- **Paid Customers**:
  - ✅ Full access to all content
  - ✅ Can download unlimited content
  - ✅ Access to premium features
  - ✅ Priority support

### Analytics Tracking

The system tracks:
- **User Engagement**: Views, time spent, content preferences
- **Conversion Funnel**: Registration → Browsing → Download Attempt → Conversion
- **Retention**: User activity patterns and app usage
- **Geographic Data**: Location-based analytics (if provided)

---

## Security Considerations

1. **Device ID Validation**: Ensure device IDs are unique and properly formatted
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Data Privacy**: Handle user data according to privacy regulations
4. **Input Validation**: Validate all input parameters
5. **Error Handling**: Don't expose sensitive information in error messages

---

## Support

For technical support or questions about the Installed Users API:
- Check the server logs for detailed error information
- Verify device IDs are unique and properly formatted
- Ensure all required fields are provided for each endpoint
- Contact the development team for additional assistance

---

*Last updated: October 3, 2025*
*API Version: 1.0*