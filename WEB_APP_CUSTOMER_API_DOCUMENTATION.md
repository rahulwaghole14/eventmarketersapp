# 🌐 Web App Customer Management API Documentation

## 📋 **Overview**
This API collection provides comprehensive customer management functionality for the EventMarketers Web Application (Admin Dashboard). It allows admins to create, view, update, and manage customers directly from the web interface.

---

## 🔐 **Authentication**

### **Base URL:** `https://eventmarketersbackend.onrender.com`

### **Admin Login Required:**
All customer management endpoints require admin authentication. Use the admin login endpoint first:

```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@eventmarketers.com",
  "password": "Admin123!@#"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cmg0hb4fc0000dw4c23szexi1",
    "email": "admin@eventmarketers.com",
    "name": "System Administrator",
    "role": "ADMIN",
    "userType": "ADMIN"
  }
}
```

---

## 👥 **Customer Management APIs**

### **1. Create Customer**
Create a new customer with business profile and optional subscription activation.

```http
POST /api/admin/customers
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "businessName": "John's Event Planning",
  "businessEmail": "business@johnsevents.com",
  "businessPhone": "+1234567891",
  "businessWebsite": "https://johnsevents.com",
  "businessAddress": "123 Main St, New York, NY",
  "businessDescription": "Professional event planning services",
  "businessCategory": "Event Planners",
  "subscriptionPlan": "YEARLY",
  "subscriptionAmount": 299.99,
  "paymentMethod": "CREDIT_CARD",
  "autoActivateSubscription": true,
  "notes": "Premium customer - VIP treatment"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "customer": {
      "id": "cmg0i34y500022s12acb4qjc9",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "businessName": "John's Event Planning",
      "businessEmail": "business@johnsevents.com",
      "businessPhone": "+1234567891",
      "businessWebsite": "https://johnsevents.com",
      "businessAddress": "123 Main St, New York, NY",
      "businessDescription": "Professional event planning services",
      "businessCategory": "Event Planners",
      "businessLogo": null,
      "subscriptionStatus": "ACTIVE",
      "subscriptionStartDate": "2025-09-26T07:08:26.954Z",
      "subscriptionEndDate": "2026-09-26T07:08:26.954Z",
      "subscriptionAmount": 299.99,
      "paymentMethod": "CREDIT_CARD",
      "createdAt": "2025-09-26T07:08:26.954Z",
      "selectedBusinessCategory": null,
      "subscriptions": []
    },
    "subscription": {
      "id": "cmg0i36l700042s12sdlncd2z",
      "plan": "YEARLY",
      "status": "ACTIVE",
      "amount": 299.99,
      "startDate": "2025-09-26T07:08:26.954Z",
      "endDate": "2026-09-26T07:08:26.954Z",
      "paymentMethod": "CREDIT_CARD"
    }
  }
}
```

### **2. Get All Customers**
Retrieve all customers with pagination and filtering options.

```http
GET /api/admin/customers?page=1&limit=10&search=john&status=ACTIVE&category=Event Planners
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in name, email, business name, or category
- `status` (optional): Filter by subscription status (ACTIVE, INACTIVE)
- `category` (optional): Filter by business category

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": {
    "customers": [
      {
        "id": "cmg0i34y500022s12acb4qjc9",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "businessName": "John's Event Planning",
        "businessEmail": "business@johnsevents.com",
        "businessPhone": "+1234567891",
        "businessWebsite": "https://johnsevents.com",
        "businessAddress": "123 Main St, New York, NY",
        "businessDescription": "Professional event planning services",
        "businessCategory": "Event Planners",
        "subscriptionStatus": "ACTIVE",
        "subscriptionStartDate": "2025-09-26T07:08:26.954Z",
        "subscriptionEndDate": "2026-09-26T07:08:26.954Z",
        "subscriptionAmount": 299.99,
        "paymentMethod": "CREDIT_CARD",
        "createdAt": "2025-09-26T07:08:26.954Z",
        "selectedBusinessCategory": null,
        "subscriptions": [
          {
            "id": "cmg0i36l700042s12sdlncd2z",
            "plan": "YEARLY",
            "status": "ACTIVE",
            "amount": 299.99,
            "startDate": "2025-09-26T07:08:26.954Z",
            "endDate": "2026-09-26T07:08:26.954Z",
            "paymentMethod": "CREDIT_CARD"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "pages": 1
    }
  }
}
```

### **3. Get Customer by ID**
Retrieve a specific customer by their ID.

```http
GET /api/admin/customers/{customer_id}
Authorization: Bearer {admin_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer fetched successfully",
  "data": {
    "customer": {
      "id": "cmg0i34y500022s12acb4qjc9",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "businessName": "John's Event Planning",
      "businessEmail": "business@johnsevents.com",
      "businessPhone": "+1234567891",
      "businessWebsite": "https://johnsevents.com",
      "businessAddress": "123 Main St, New York, NY",
      "businessDescription": "Professional event planning services",
      "businessCategory": "Event Planners",
      "subscriptionStatus": "ACTIVE",
      "subscriptionStartDate": "2025-09-26T07:08:26.954Z",
      "subscriptionEndDate": "2026-09-26T07:08:26.954Z",
      "subscriptionAmount": 299.99,
      "paymentMethod": "CREDIT_CARD",
      "createdAt": "2025-09-26T07:08:26.954Z",
      "selectedBusinessCategory": null,
      "subscriptions": [
        {
          "id": "cmg0i36l700042s12sdlncd2z",
          "plan": "YEARLY",
          "status": "ACTIVE",
          "amount": 299.99,
          "startDate": "2025-09-26T07:08:26.954Z",
          "endDate": "2026-09-26T07:08:26.954Z",
          "paymentMethod": "CREDIT_CARD"
        }
      ]
    }
  }
}
```

### **4. Update Customer**
Update customer information.

```http
PUT /api/admin/customers/{customer_id}
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "phone": "+1234567890",
  "businessName": "John's Updated Event Planning",
  "businessEmail": "updated@johnsevents.com",
  "businessPhone": "+1234567891",
  "businessWebsite": "https://updated-johnsevents.com",
  "businessAddress": "456 Updated St, New York, NY",
  "businessDescription": "Updated professional event planning services",
  "businessCategory": "Event Planners"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer updated successfully",
  "data": {
    "customer": {
      "id": "cmg0i34y500022s12acb4qjc9",
      "name": "John Doe Updated",
      "email": "john.updated@example.com",
      "phone": "+1234567890",
      "businessName": "John's Updated Event Planning",
      "businessEmail": "updated@johnsevents.com",
      "businessPhone": "+1234567891",
      "businessWebsite": "https://updated-johnsevents.com",
      "businessAddress": "456 Updated St, New York, NY",
      "businessDescription": "Updated professional event planning services",
      "businessCategory": "Event Planners",
      "subscriptionStatus": "ACTIVE",
      "subscriptionStartDate": "2025-09-26T07:08:26.954Z",
      "subscriptionEndDate": "2026-09-26T07:08:26.954Z",
      "subscriptionAmount": 299.99,
      "paymentMethod": "CREDIT_CARD",
      "createdAt": "2025-09-26T07:08:26.954Z",
      "updatedAt": "2025-09-26T07:15:30.123Z",
      "selectedBusinessCategory": null,
      "subscriptions": []
    }
  }
}
```

### **5. Delete Customer (Soft Delete)**
Deactivate a customer (soft delete by setting subscription status to INACTIVE).

```http
DELETE /api/admin/customers/{customer_id}
Authorization: Bearer {admin_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customer deactivated successfully",
  "data": {
    "customer": {
      "id": "cmg0i34y500022s12acb4qjc9",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "subscriptionStatus": "INACTIVE",
      "subscriptionEndDate": "2025-09-26T07:20:15.456Z",
      "updatedAt": "2025-09-26T07:20:15.456Z"
    }
  }
}
```

---

## 📝 **Field Descriptions**

### **Required Fields:**
- `name`: Customer's full name (min 2 characters)
- `email`: Valid email address (must be unique)

### **Optional Fields:**
- `phone`: Phone number (min 10 characters)
- `businessName`: Business name (min 2 characters)
- `businessEmail`: Business email (valid email)
- `businessPhone`: Business phone (min 10 characters)
- `businessWebsite`: Business website (valid URL)
- `businessAddress`: Business address
- `businessDescription`: Business description
- `businessCategory`: Business category
- `businessLogo`: Business logo URL

### **Subscription Fields:**
- `subscriptionPlan`: "MONTHLY" or "YEARLY" (default: "YEARLY")
- `subscriptionAmount`: Subscription amount (positive number)
- `paymentMethod`: "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "CASH", "OTHER"
- `autoActivateSubscription`: Boolean (default: false)

---

## 🔍 **Error Responses**

### **400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "value": "invalid-email",
      "msg": "Valid email is required",
      "path": "email",
      "location": "body"
    }
  ]
}
```

### **401 Unauthorized:**
```json
{
  "success": false,
  "error": "Access token is required"
}
```

### **409 Conflict - Email Exists:**
```json
{
  "success": false,
  "error": "Customer already exists with this email"
}
```

### **404 Not Found:**
```json
{
  "success": false,
  "error": "Customer not found"
}
```

### **500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to create customer"
}
```

---

## 🎯 **Use Cases**

### **1. Admin Dashboard Customer Management**
- Create new customers from web interface
- View all customers with pagination and search
- Update customer information
- Manage customer subscriptions

### **2. Customer Onboarding**
- Create customers with complete business profiles
- Activate subscriptions immediately
- Set up payment methods and billing

### **3. Customer Support**
- View customer details and subscription status
- Update customer information
- Deactivate problematic customers

### **4. Business Analytics**
- Filter customers by status and category
- Search customers by name, email, or business
- Track customer creation and updates

---

## 🚀 **Getting Started**

1. **Login as Admin:**
   ```bash
   curl -X POST https://eventmarketersbackend.onrender.com/api/auth/admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@eventmarketers.com","password":"Admin123!@#"}'
   ```

2. **Create Your First Customer:**
   ```bash
   curl -X POST https://eventmarketersbackend.onrender.com/api/admin/customers \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"name":"Test Customer","email":"test@example.com"}'
   ```

3. **Get All Customers:**
   ```bash
   curl -X GET https://eventmarketersbackend.onrender.com/api/admin/customers \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## ✅ **Success!**

The Web App Customer Management API is now fully functional and ready for production use! 🎉

**Key Features Implemented:**
- ✅ Complete CRUD operations for customers
- ✅ Business profile management
- ✅ Subscription activation and management
- ✅ Comprehensive validation
- ✅ Pagination and search functionality
- ✅ Admin authentication and authorization
- ✅ Audit logging for all operations
- ✅ Error handling and validation
- ✅ Full testing completed

**Ready for frontend integration!** 🚀
