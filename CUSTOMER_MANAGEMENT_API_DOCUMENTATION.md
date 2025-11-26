# Customer Management API Documentation
## Web App Customer CRUD Operations

This document provides comprehensive documentation for all Customer Management APIs in the EventMarketers backend system. These APIs are designed for web application administrators to manage customer accounts, subscriptions, and business profiles.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Customer CRUD Operations](#customer-crud-operations)
3. [Subscription Management](#subscription-management)
4. [Error Handling](#error-handling)
5. [Response Formats](#response-formats)
6. [Business Categories](#business-categories)
7. [Examples](#examples)

---

## Authentication

All customer management endpoints require admin authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Admin Credentials
- **Email**: `admin@eventmarketers.com`
- **Password**: `admin123`

---

## Customer CRUD Operations

### 1. Create Customer

#### POST `/api/admin/customers`

Create a new customer account with business details and optional subscription activation.

**Content-Type**: `application/json`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | String | Yes | Customer's full name |
| `email` | String | Yes | Customer's email address (must be unique) |
| `phone` | String | No | Customer's phone number (international format: +1234567890) |
| `businessName` | String | Yes | Business name |
| `businessEmail` | String | No | Business email (defaults to customer email) |
| `businessPhone` | String | No | Business phone number |
| `businessWebsite` | String | No | Business website URL (must include http:// or https://) |
| `businessAddress` | String | Yes | Business address |
| `businessDescription` | String | No | Business description |
| `selectedBusinessCategory` | String | No | Business sub-category (see [Business Categories](#business-categories)) |
| `subscriptionPlan` | String | No | Subscription plan: `MONTHLY` or `YEARLY` |
| `subscriptionAmount` | Number | No | Subscription amount (0-1000000) |
| `paymentMethod` | String | No | Payment method: `CREDIT_CARD`, `DEBIT_CARD`, `NET_BANKING`, `UPI`, `WALLET` |
| `autoActivateSubscription` | Boolean | No | Auto-activate subscription (default: true) |

**Response**:
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "customer": {
      "id": "cmganyak1000elzl6nzft2x4p",
      "email": "testcustomer@example.com",
      "password": "password123",
      "name": "Test Customer",
      "phone": "+1234567890",
      "businessName": "Test Business",
      "businessPhone": "+1234567891",
      "businessEmail": "business@example.com",
      "businessWebsite": "https://testbusiness.com",
      "businessAddress": "123 Test Street, Test City, TC 12345",
      "businessLogo": null,
      "businessDescription": "A test business for API testing",
      "selectedBusinessCategory": "Event Planners",
      "selectedBusinessCategoryId": null,
      "subscriptionStatus": "ACTIVE",
      "subscriptionAmount": 99.99,
      "subscriptionStartDate": "2025-10-03T09:49:10.730Z",
      "subscriptionEndDate": "2025-11-02T09:49:10.730Z",
      "paymentMethod": "CREDIT_CARD",
      "totalDownloads": 0,
      "isActive": true,
      "lastActiveAt": "2025-10-03T09:49:10.727Z",
      "createdAt": "2025-10-03T09:49:10.730Z",
      "updatedAt": "2025-10-03T09:49:10.730Z"
    },
    "subscription": {
      "id": "cmganwugs0003lzl6awvpah17",
      "customerId": "cmganyak1000elzl6nzft2x4p",
      "plan": "MONTHLY",
      "planId": "monthly-plan",
      "status": "ACTIVE",
      "startDate": "2025-10-03T09:49:12.887Z",
      "endDate": "2025-11-02T09:49:12.887Z",
      "createdAt": "2025-10-03T09:49:12.892Z",
      "updatedAt": "2025-10-03T09:49:12.892Z"
    }
  }
}
```

### 2. Get All Customers

#### GET `/api/admin/customers`

Retrieve all customers with pagination and filtering options.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Items per page (default: 10) |
| `search` | String | No | Search in name, email, business name, or business category |
| `status` | String | No | Filter by subscription status: `ACTIVE`, `INACTIVE` |
| `category` | String | No | Filter by business category |

**Response**:
```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "cmganyak1000elzl6nzft2x4p",
        "email": "testcustomer@example.com",
        "name": "Test Customer",
        "phone": "+1234567890",
        "businessName": "Test Business",
        "businessEmail": "business@example.com",
        "businessPhone": "+1234567891",
        "businessWebsite": "https://testbusiness.com",
        "businessAddress": "123 Test Street, Test City, TC 12345",
        "businessDescription": "A test business for API testing",
        "selectedBusinessCategory": "Event Planners",
        "subscriptionStatus": "ACTIVE",
        "subscriptionAmount": 99.99,
        "subscriptionStartDate": "2025-10-03T09:49:10.730Z",
        "subscriptionEndDate": "2025-11-02T09:49:10.730Z",
        "paymentMethod": "CREDIT_CARD",
        "totalDownloads": 0,
        "isActive": true,
        "lastActiveAt": "2025-10-03T09:49:10.727Z",
        "createdAt": "2025-10-03T09:49:10.730Z",
        "updatedAt": "2025-10-03T09:49:10.730Z",
        "subscriptions": [
          {
            "id": "cmganwugs0003lzl6awvpah17",
            "plan": "MONTHLY",
            "status": "ACTIVE",
            "startDate": "2025-10-03T09:49:12.887Z",
            "endDate": "2025-11-02T09:49:12.887Z"
          }
        ]
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

### 3. Get Customer by ID

#### GET `/api/admin/customers/:id`

Retrieve a specific customer by their ID.

**Response**:
```json
{
  "success": true,
  "message": "Customer fetched successfully",
  "data": {
    "customer": {
      "id": "cmganyak1000elzl6nzft2x4p",
      "email": "testcustomer@example.com",
      "password": "password123",
      "name": "Test Customer",
      "phone": "+1234567890",
      "businessName": "Test Business",
      "businessPhone": "+1234567891",
      "businessEmail": "business@example.com",
      "businessWebsite": "https://testbusiness.com",
      "businessAddress": "123 Test Street, Test City, TC 12345",
      "businessLogo": null,
      "businessDescription": "A test business for API testing",
      "selectedBusinessCategory": "Event Planners",
      "selectedBusinessCategoryId": null,
      "subscriptionStatus": "ACTIVE",
      "subscriptionAmount": 99.99,
      "subscriptionStartDate": "2025-10-03T09:49:10.730Z",
      "subscriptionEndDate": "2025-11-02T09:49:10.730Z",
      "paymentMethod": "CREDIT_CARD",
      "totalDownloads": 0,
      "isActive": true,
      "lastActiveAt": "2025-10-03T09:49:10.727Z",
      "createdAt": "2025-10-03T09:49:10.730Z",
      "updatedAt": "2025-10-03T09:49:10.730Z",
      "subscriptions": [
        {
          "id": "cmganwugs0003lzl6awvpah17",
          "customerId": "cmganyak1000elzl6nzft2x4p",
          "plan": "MONTHLY",
          "planId": "monthly-plan",
          "status": "ACTIVE",
          "startDate": "2025-10-03T09:49:12.887Z",
          "endDate": "2025-11-02T09:49:12.887Z",
          "createdAt": "2025-10-03T09:49:12.892Z",
          "updatedAt": "2025-10-03T09:49:12.892Z"
        }
      ]
    }
  }
}
```

### 4. Update Customer

#### PUT `/api/admin/customers/:id`

Update customer details and business information.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | String | No | Customer's full name (min 2 characters) |
| `email` | String | No | Customer's email address (must be unique) |
| `phone` | String | No | Customer's phone number (min 10 characters) |
| `businessName` | String | No | Business name (min 2 characters) |
| `businessEmail` | String | No | Business email (valid email format) |
| `businessPhone` | String | No | Business phone number (min 10 characters) |
| `businessWebsite` | String | No | Business website URL (valid URL format) |
| `businessAddress` | String | No | Business address |
| `businessDescription` | String | No | Business description |
| `selectedBusinessCategory` | String | No | Business sub-category (min 2 characters) |

**Response**:
```json
{
  "success": true,
  "message": "Customer updated successfully",
  "data": {
    "customer": {
      "id": "cmganyak1000elzl6nzft2x4p",
      "email": "testcustomer@example.com",
      "name": "Updated Test Customer",
      "phone": "+1234567890",
      "businessName": "Updated Test Business",
      "businessPhone": "+1234567891",
      "businessEmail": "business@example.com",
      "businessWebsite": "https://testbusiness.com",
      "businessAddress": "123 Test Street, Test City, TC 12345",
      "businessDescription": "Updated business description for API testing",
      "selectedBusinessCategory": "Wedding Planner",
      "subscriptionStatus": "ACTIVE",
      "subscriptionAmount": 99.99,
      "subscriptionStartDate": "2025-10-03T09:49:10.730Z",
      "subscriptionEndDate": "2025-11-02T09:49:10.730Z",
      "paymentMethod": "CREDIT_CARD",
      "totalDownloads": 0,
      "isActive": true,
      "lastActiveAt": "2025-10-03T09:49:10.727Z",
      "createdAt": "2025-10-03T09:49:10.730Z",
      "updatedAt": "2025-10-03T09:49:55.991Z",
      "subscriptions": [
        {
          "id": "cmganwugs0003lzl6awvpah17",
          "plan": "MONTHLY",
          "status": "ACTIVE",
          "startDate": "2025-10-03T09:49:12.887Z",
          "endDate": "2025-11-02T09:49:12.887Z"
        }
      ]
    }
  }
}
```

### 5. Delete Customer (Soft Delete)

#### DELETE `/api/admin/customers/:id`

Deactivate a customer account (soft delete by setting subscription status to INACTIVE).

**Response**:
```json
{
  "success": true,
  "message": "Customer deactivated successfully",
  "data": {
    "customer": {
      "id": "cmganyak1000elzl6nzft2x4p",
      "email": "testcustomer@example.com",
      "name": "Updated Test Customer",
      "subscriptionStatus": "INACTIVE",
      "subscriptionEndDate": "2025-10-03T09:50:35.533Z",
      "updatedAt": "2025-10-03T09:50:35.533Z"
    }
  }
}
```

---

## Subscription Management

### 1. Get Customer Subscription

#### GET `/api/admin/customers/:id/subscription`

Retrieve customer subscription details and history.

**Response**:
```json
{
  "success": true,
  "customer": {
    "id": "cmganyak1000elzl6nzft2x4p",
    "name": "Updated Test Customer",
    "email": "testcustomer@example.com",
    "subscriptionStatus": "ACTIVE",
    "subscriptionStartDate": "2025-10-03T09:49:10.730Z",
    "subscriptionEndDate": "2025-11-02T09:49:10.730Z",
    "subscriptionAmount": 99.99,
    "currentSubscription": {
      "id": "cmganwugs0003lzl6awvpah17",
      "customerId": "cmganyak1000elzl6nzft2x4p",
      "plan": "MONTHLY",
      "planId": "monthly-plan",
      "status": "ACTIVE",
      "startDate": "2025-10-03T09:49:12.887Z",
      "endDate": "2025-11-02T09:49:12.887Z",
      "createdAt": "2025-10-03T09:49:12.892Z",
      "updatedAt": "2025-10-03T09:49:12.892Z"
    }
  }
}
```

### 2. Activate Customer Subscription

#### POST `/api/admin/customers/:id/activate-subscription`

Activate or reactivate a customer's subscription.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plan` | String | Yes | Subscription plan: `MONTHLY` or `YEARLY` |
| `amount` | Number | Yes | Subscription amount (positive number) |
| `currency` | String | No | Currency code (default: USD) |

**Response**:
```json
{
  "success": true,
  "message": "Customer subscription activated successfully",
  "subscription": {
    "id": "cmganx4me0007lzl6575n4v2s",
    "customerId": "cmganyak1000elzl6nzft2x4p",
    "plan": "YEARLY",
    "planId": "yearly-plan",
    "status": "ACTIVE",
    "startDate": "2025-10-03T09:49:25.526Z",
    "endDate": "2026-10-03T09:49:25.526Z",
    "createdAt": "2025-10-03T09:49:26.055Z",
    "updatedAt": "2025-10-03T09:49:26.055Z"
  }
}
```

### 3. Deactivate Customer Subscription

#### POST `/api/admin/customers/:id/deactivate-subscription`

Deactivate a customer's subscription.

**Response**:
```json
{
  "success": true,
  "message": "Customer subscription deactivated successfully"
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields: name, email, businessName, businessAddress"
}
```

#### 400 Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Name must be at least 2 characters",
      "path": "name",
      "location": "body"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Access denied. No token provided."
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Admin access required"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Customer not found"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "message": "Customer with this email already exists"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Detailed error message"
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

## Business Categories

The business categories are organized in a hierarchical structure with main categories and sub-categories:

### Main Categories

| Main Category | Description | Icon |
|---------------|-------------|------|
| `BUSINESS` | Main business category for all business-related sub-categories | 🏢 |
| `GENERAL` | Main general category for all general-related sub-categories | 📋 |
| `FESTIVAL` | Main festival category for all festival-related sub-categories | 🎊 |

### Business Sub-Categories (under BUSINESS main category)

| Sub-Category | Description | Icon |
|--------------|-------------|------|
| `Event Planners` | Professional event planning services | 🎉 |
| `Decorators` | Event decoration and design services | 🎨 |
| `Sound Suppliers` | Audio equipment and sound system providers | 🔊 |
| `Light Suppliers` | Lighting equipment and setup services | 💡 |
| `Mandap` | Traditional wedding mandap providers | 🏛️ |
| `Generators` | Power generation and backup services | ⚡ |
| `Automotive` | Car Services | 🚗 |
| `Beauty & Wellness` | Salon & Spa | 💄 |
| `Education` | Schools & Training | 🎓 |
| `Healthcare` | Medical & Health | 🏥 |
| `Retail` | Shopping & Retail | 🛍️ |
| `Technology` | IT & Software | 💻 |

### General Sub-Categories (under GENERAL main category)

| Sub-Category | Description | Icon |
|--------------|-------------|------|
| `Good Morning` | Good Morning greetings and content | 🌅 |
| `Good Evening` | Good Evening greetings and content | 🌆 |
| `Good Night` | Good Night greetings and content | 🌙 |
| `Thank You` | Thank you messages and content | 🙏 |
| `Congratulations` | Congratulations messages and content | 🎉 |
| `Welcome` | Welcome messages and content | 👋 |
| `Farewell` | Farewell messages and content | 👋 |
| `Motivational` | Motivational quotes and content | 💪 |
| `Inspirational` | Inspirational quotes and content | ✨ |
| `Seasonal` | Seasonal greetings and content | 🍂 |

### Festival Sub-Categories (under FESTIVAL main category)

| Sub-Category | Description | Icon |
|--------------|-------------|------|
| `Rakhi` | Rakhi festival celebrations | 🎀 |
| `Diwali` | Diwali festival celebrations | 🪔 |
| `Holi` | Holi festival celebrations | 🎨 |
| `Eid` | Eid festival celebrations | 🌙 |
| `Christmas` | Christmas celebrations | 🎄 |
| `New Year` | New Year celebrations | 🎆 |
| `Wedding` | Wedding celebrations and ceremonies | 💒 |
| `Birthday` | Birthday celebrations | 🎂 |
| `Anniversary` | Anniversary celebrations | 💝 |
| `Graduation` | Graduation ceremonies | 🎓 |
| `Baby Shower` | Baby shower celebrations | 👶 |
| `House Warming` | House warming ceremonies | 🏠 |

### Category Structure Usage

When creating or updating customers, you can use any of the sub-category names listed above. The system will automatically associate them with their respective main categories:

- **Business Categories**: Use sub-category names like "Event Planners", "Decorators", "Automotive", "Healthcare", etc.
- **General Categories**: Use sub-category names like "Good Morning", "Thank You", "Congratulations", "Motivational", etc.
- **Festival Categories**: Use sub-category names like "Rakhi", "Diwali", "Wedding", "Birthday", "Christmas", etc.

### Category Examples for Customer Creation

**Business Customer Examples:**
- `selectedBusinessCategory: "Event Planners"` - For event planning businesses
- `selectedBusinessCategory: "Healthcare"` - For medical and health services
- `selectedBusinessCategory: "Technology"` - For IT and software companies

**General Customer Examples:**
- `selectedBusinessCategory: "Good Morning"` - For greeting card businesses
- `selectedBusinessCategory: "Motivational"` - For motivational content creators

**Festival Customer Examples:**
- `selectedBusinessCategory: "Wedding"` - For wedding planners and services
- `selectedBusinessCategory: "Birthday"` - For birthday party organizers
- `selectedBusinessCategory: "Diwali"` - For festival celebration services

---

## Examples

### Example 1: Create a New Customer

```bash
curl -X POST http://localhost:3001/api/admin/customers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "businessName": "Johns Event Planning",
    "businessEmail": "business@johnsevents.com",
    "businessPhone": "+1234567891",
    "businessWebsite": "https://johnsevents.com",
    "businessAddress": "123 Event Street, City, State 12345",
    "businessDescription": "Professional event planning services",
    "selectedBusinessCategory": "Event Planners",
    "subscriptionPlan": "MONTHLY",
    "subscriptionAmount": 99.99,
    "paymentMethod": "CREDIT_CARD",
    "autoActivateSubscription": true
  }'
```

### Example 2: Get All Customers with Pagination

```bash
curl -X GET "http://localhost:3001/api/admin/customers?page=1&limit=10&status=ACTIVE" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 3: Update Customer Details

```bash
curl -X PUT http://localhost:3001/api/admin/customers/cmganyak1000elzl6nzft2x4p \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "businessName": "Smith Event Solutions",
    "selectedBusinessCategory": "Wedding Planner",
    "businessDescription": "Updated business description"
  }'
```

### Example 4: Activate Customer Subscription

```bash
curl -X POST http://localhost:3001/api/admin/customers/cmganyak1000elzl6nzft2x4p/activate-subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "YEARLY",
    "amount": 999.99,
    "currency": "USD"
  }'
```

### Example 5: Deactivate Customer Subscription

```bash
curl -X POST http://localhost:3001/api/admin/customers/cmganyak1000elzl6nzft2x4p/deactivate-subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 6: Get Customer by ID

```bash
curl -X GET http://localhost:3001/api/admin/customers/cmganyak1000elzl6nzft2x4p \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 7: Search Customers

```bash
curl -X GET "http://localhost:3001/api/admin/customers?search=event&category=Event%20Planners" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 8: Deactivate Customer (Soft Delete)

```bash
curl -X DELETE http://localhost:3001/api/admin/customers/cmganyak1000elzl6nzft2x4p \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Permission System

### Admin Permissions
- ✅ Create, read, update, delete any customer
- ✅ Activate/deactivate customer subscriptions
- ✅ Access all customer data and subscription history
- ✅ Manage customer business profiles
- ✅ View customer download statistics

---

## Data Validation

### Email Validation
- Must be a valid email format
- Must be unique across all customers
- Case-insensitive

### Phone Number Validation
- Must be in international format (+1234567890)
- Minimum 10 characters
- Optional field

### Website Validation
- Must include http:// or https://
- Must be a valid URL format
- Optional field

### Business Category Validation
- Must be one of the supported categories
- Case-sensitive
- Optional field (defaults to "General")

### Subscription Validation
- Plan must be "MONTHLY" or "YEARLY"
- Amount must be between 0 and 1,000,000
- Payment method must be one of the supported options

---

## Audit Logging

All customer management operations are logged in the audit system with:
- Admin information (ID, email)
- Action performed (CREATE, UPDATE, DELETE, ACTIVATE_SUBSCRIPTION, DEACTIVATE_SUBSCRIPTION)
- Resource type (CUSTOMER, SUBSCRIPTION)
- Resource ID
- Timestamp
- IP address and user agent
- Success/failure status

---

## Rate Limiting

Currently no rate limiting is implemented, but it's recommended to:
- Implement client-side validation before API calls
- Monitor usage patterns for potential abuse
- Consider implementing rate limiting for production use

---

## Support

For technical support or questions about the Customer Management API:
- Check the server logs for detailed error information
- Verify authentication tokens are valid and not expired
- Ensure all required fields are provided for customer creation
- Contact the development team for additional assistance

---

*Last updated: October 3, 2025*
*API Version: 1.0*
