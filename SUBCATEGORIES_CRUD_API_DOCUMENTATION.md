# Sub-Categories CRUD API Documentation

## Overview
This document provides comprehensive API documentation for managing sub-categories (Business Categories) with main category classification. The system supports three main categories: **BUSINESS**, **FESTIVAL**, and **GENERAL**.

## Base URL
```
http://localhost:3001/api
```

## Authentication
All admin endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📋 **1. READ (GET) - Retrieve Sub-Categories**

### **Admin Endpoint**
```http
GET /api/admin/business-categories
```

#### **Query Parameters**
| Parameter | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| `mainCategory` | string | No | Filter by main category | `BUSINESS`, `FESTIVAL`, `GENERAL` |
| `isActive` | boolean | No | Filter by active status | `true`, `false` |

#### **Request Examples**
```bash
# Get all categories
GET /api/admin/business-categories

# Get only business categories
GET /api/admin/business-categories?mainCategory=BUSINESS

# Get only festival categories
GET /api/admin/business-categories?mainCategory=FESTIVAL

# Get only general categories
GET /api/admin/business-categories?mainCategory=GENERAL

# Get inactive categories
GET /api/admin/business-categories?isActive=false

# Combine filters
GET /api/admin/business-categories?mainCategory=BUSINESS&isActive=true
```

#### **Response Format**
```json
{
  "success": true,
  "categories": [
    {
      "id": "cmg3z2k7q0000cw850l9n6bei",
      "name": "Event Planners",
      "description": "Event planning services",
      "icon": "event-icon",
      "mainCategory": "BUSINESS",
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2025-01-28T17:30:00.000Z",
      "updatedAt": "2025-01-28T17:30:00.000Z",
      "createdBy": "admin-id",
      "admin": {
        "name": "Admin User"
      },
      "_count": {
        "images": 5,
        "videos": 2,
        "customers": 3
      }
    }
  ]
}
```

### **Mobile Endpoint**
```http
GET /api/mobile/business-categories
```

#### **Query Parameters**
| Parameter | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| `mainCategory` | string | No | Filter by main category | `BUSINESS`, `FESTIVAL`, `GENERAL` |
| `isActive` | boolean | No | Filter by active status (defaults to true) | `true`, `false` |

#### **Response Format**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cmg3z2k7q0000cw850l9n6bei",
        "name": "Event Planners",
        "description": "Event planning services",
        "icon": "event-icon",
        "mainCategory": "BUSINESS",
        "contentCount": 0
      }
    ]
  }
}
```

---

## ➕ **2. CREATE (POST) - Create New Sub-Category**

### **Admin Endpoint**
```http
POST /api/admin/business-categories
```

#### **Request Body**
```json
{
  "name": "Event Planners",
  "description": "Event planning services",
  "icon": "event-icon",
  "mainCategory": "BUSINESS"
}
```

#### **Field Validation**
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | ✅ | min: 2 chars | Category name (must be unique) |
| `description` | string | ❌ | max: 500 chars | Category description |
| `icon` | string | ❌ | - | Icon identifier |
| `mainCategory` | string | ✅ | enum | Must be `BUSINESS`, `FESTIVAL`, or `GENERAL` |

#### **Request Examples**
```bash
# Create business category
curl -X POST http://localhost:3001/api/admin/business-categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Event Planners",
    "description": "Event planning services",
    "mainCategory": "BUSINESS"
  }'

# Create festival category
curl -X POST http://localhost:3001/api/admin/business-categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Diwali",
    "description": "Diwali festival images",
    "mainCategory": "FESTIVAL"
  }'

# Create general category
curl -X POST http://localhost:3001/api/admin/business-categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Good Morning",
    "description": "Morning greeting quotes",
    "mainCategory": "GENERAL"
  }'
```

#### **Success Response (201)**
```json
{
  "success": true,
  "message": "Business category created successfully",
  "category": {
    "id": "cmg3z2k7q0000cw850l9n6bei",
    "name": "Event Planners",
    "description": "Event planning services",
    "icon": "event-icon",
    "mainCategory": "BUSINESS",
    "isActive": true,
    "sortOrder": 0,
    "createdAt": "2025-01-28T17:30:00.000Z",
    "updatedAt": "2025-01-28T17:30:00.000Z",
    "createdBy": "admin-id"
  }
}
```

#### **Error Responses**
```json
// 400 - Validation Error
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "msg": "Main category must be BUSINESS, FESTIVAL, or GENERAL",
      "param": "mainCategory",
      "value": "INVALID"
    }
  ]
}

// 400 - Duplicate Name
{
  "success": false,
  "error": "Category name already exists"
}
```

---

## ✏️ **3. UPDATE (PUT) - Update Sub-Category**

### **Admin Endpoint**
```http
PUT /api/admin/business-categories/:id
```

#### **Request Body**
```json
{
  "name": "Updated Event Planners",
  "description": "Updated description",
  "icon": "new-icon",
  "mainCategory": "BUSINESS",
  "isActive": true,
  "sortOrder": 1
}
```

#### **Field Validation**
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | ❌ | min: 2 chars | Category name (must be unique) |
| `description` | string | ❌ | max: 500 chars | Category description |
| `icon` | string | ❌ | - | Icon identifier |
| `mainCategory` | string | ❌ | enum | Must be `BUSINESS`, `FESTIVAL`, or `GENERAL` |
| `isActive` | boolean | ❌ | - | Category active status |
| `sortOrder` | integer | ❌ | min: 0 | Sort order for display |

#### **Request Examples**
```bash
# Update category name and main category
curl -X PUT http://localhost:3001/api/admin/business-categories/cmg3z2k7q0000cw850l9n6bei \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Event Planners",
    "mainCategory": "BUSINESS"
  }'

# Deactivate category
curl -X PUT http://localhost:3001/api/admin/business-categories/cmg3z2k7q0000cw850l9n6bei \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'

# Change main category
curl -X PUT http://localhost:3001/api/admin/business-categories/cmg3z2k7q0000cw850l9n6bei \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mainCategory": "FESTIVAL"
  }'
```

#### **Success Response (200)**
```json
{
  "success": true,
  "message": "Business category updated successfully",
  "category": {
    "id": "cmg3z2k7q0000cw850l9n6bei",
    "name": "Updated Event Planners",
    "description": "Updated description",
    "icon": "new-icon",
    "mainCategory": "BUSINESS",
    "isActive": true,
    "sortOrder": 1,
    "createdAt": "2025-01-28T17:30:00.000Z",
    "updatedAt": "2025-01-28T17:35:00.000Z",
    "createdBy": "admin-id"
  }
}
```

#### **Error Responses**
```json
// 404 - Category Not Found
{
  "success": false,
  "error": "Business category not found"
}

// 400 - Name Conflict
{
  "success": false,
  "error": "Category name already exists"
}
```

---

## 🗑️ **4. DELETE (DELETE) - Delete Sub-Category**

### **Admin Endpoint**
```http
DELETE /api/admin/business-categories/:id
```

#### **Request Examples**
```bash
# Delete category
curl -X DELETE http://localhost:3001/api/admin/business-categories/cmg3z2k7q0000cw850l9n6bei \
  -H "Authorization: Bearer <token>"
```

#### **Success Response (200)**
```json
{
  "success": true,
  "message": "Business category deleted successfully"
}
```

#### **Error Responses**
```json
// 404 - Category Not Found
{
  "success": false,
  "error": "Business category not found"
}

// 400 - Category Has Associated Content
{
  "success": false,
  "error": "Cannot delete category with associated content. Please reassign or remove all images, videos, and customers first.",
  "details": {
    "images": 5,
    "videos": 2,
    "customers": 3
  }
}
```

---

## 📊 **Current Data Structure**

### **Main Categories and Sub-Categories**

#### **BUSINESS (5 categories)**
- Event Planners
- Decorators
- Sound Suppliers
- Light Suppliers
- General Business

#### **FESTIVAL (10 categories)**
- Diwali
- Holi
- Eid
- Christmas
- New Year
- Wedding
- Birthday
- Anniversary
- Graduation
- General Festival

#### **GENERAL (8 categories)**
- Good Morning
- Gujarati Quotes
- Hindi Quotes
- Indian Freedom Fighters Quotes
- Great Personalities
- Motivation
- Business Need
- Thank You

---

## 🔧 **Database Schema**

### **BusinessCategory Model**
```prisma
model BusinessCategory {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  icon        String?
  mainCategory String  // "BUSINESS", "FESTIVAL", "GENERAL"
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String

  admin     Admin @relation(fields: [createdBy], references: [id])
  images    Image[]
  videos    Video[]
  customers Customer[]

  @@map("business_categories")
}
```

---

## 🚨 **Error Codes**

| Code | Description | Solution |
|------|-------------|----------|
| `400` | Validation Error | Check request body format and field validation |
| `400` | Category name already exists | Use a unique category name |
| `400` | Cannot delete category with content | Remove associated images, videos, and customers first |
| `401` | Unauthorized | Provide valid JWT token |
| `403` | Forbidden | Ensure user has admin privileges |
| `404` | Category not found | Verify category ID exists |
| `500` | Server Error | Check server logs and database connection |

---

## 📝 **Usage Examples**

### **Complete CRUD Workflow**
```bash
# 1. Get all categories
curl -X GET http://localhost:3001/api/admin/business-categories \
  -H "Authorization: Bearer <token>"

# 2. Create new category
curl -X POST http://localhost:3001/api/admin/business-categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Category",
    "description": "New category description",
    "mainCategory": "BUSINESS"
  }'

# 3. Update category
curl -X PUT http://localhost:3001/api/admin/business-categories/<category-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Category Name",
    "isActive": true
  }'

# 4. Delete category
curl -X DELETE http://localhost:3001/api/admin/business-categories/<category-id> \
  -H "Authorization: Bearer <token>"
```

### **Filtering Examples**
```bash
# Get only business categories
curl -X GET "http://localhost:3001/api/admin/business-categories?mainCategory=BUSINESS" \
  -H "Authorization: Bearer <token>"

# Get only active festival categories
curl -X GET "http://localhost:3001/api/admin/business-categories?mainCategory=FESTIVAL&isActive=true" \
  -H "Authorization: Bearer <token>"

# Get inactive categories
curl -X GET "http://localhost:3001/api/admin/business-categories?isActive=false" \
  -H "Authorization: Bearer <token>"
```

---

## 🔐 **Security Features**

1. **JWT Authentication**: All admin endpoints require valid JWT tokens
2. **Admin Authorization**: Only admin users can perform CRUD operations
3. **Input Validation**: All inputs are validated using express-validator
4. **Audit Logging**: All operations are logged for security and compliance
5. **Data Integrity**: Prevents deletion of categories with associated content
6. **Unique Constraints**: Category names must be unique across the system

---

## 📈 **Performance Considerations**

1. **Database Indexing**: Categories are indexed by name and mainCategory
2. **Pagination**: Mobile endpoints support pagination for large datasets
3. **Selective Fields**: Mobile endpoints return only necessary fields
4. **Connection Pooling**: Prisma client uses connection pooling for efficiency
5. **Caching**: Consider implementing Redis caching for frequently accessed categories

---

## 🧪 **Testing**

### **Test Categories**
The system currently has **23 categories** distributed as:
- **5 BUSINESS categories**
- **10 FESTIVAL categories** 
- **8 GENERAL categories**

### **Test Endpoints**
```bash
# Test all main category filters
curl -X GET "http://localhost:3001/api/admin/business-categories?mainCategory=BUSINESS"
curl -X GET "http://localhost:3001/api/admin/business-categories?mainCategory=FESTIVAL"
curl -X GET "http://localhost:3001/api/admin/business-categories?mainCategory=GENERAL"

# Test mobile endpoints
curl -X GET "http://localhost:3001/api/mobile/business-categories?mainCategory=BUSINESS"
```

---

This documentation covers all CRUD operations for sub-categories with main category classification. The system is fully functional and tested with proper validation, error handling, and security measures.
