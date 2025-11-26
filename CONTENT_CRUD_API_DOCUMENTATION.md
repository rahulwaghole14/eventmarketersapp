# Content Management API Documentation
## Images and Videos CRUD Operations

This document provides comprehensive documentation for all Image and Video CRUD (Create, Read, Update, Delete) operations in the EventMarketers backend API.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Image CRUD Operations](#image-crud-operations)
3. [Video CRUD Operations](#video-crud-operations)
4. [Error Handling](#error-handling)
5. [Response Formats](#response-formats)
6. [Business Categories](#business-categories)
7. [Examples](#examples)

---

## Authentication

All content management endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Admin Credentials
- **Email**: `admin@eventmarketers.com`
- **Password**: `admin123`

### Subadmin Credentials
- Use the credentials provided by your admin or create a new subadmin account.

---

## Image CRUD Operations

### 1. Create Image (Upload)

#### POST `/api/content/images/upload`

Upload a new image with processing and thumbnail generation.

**Content-Type**: `multipart/form-data`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image` | File | Yes | Image file (JPEG, PNG, GIF) |
| `title` | String | Yes | Image title (min 2 characters) |
| `description` | String | No | Image description (max 1000 characters) |
| `category` | String | Yes | Category: `BUSINESS`, `FESTIVAL`, or `GENERAL` |
| `businessCategoryId` | String | No | Business category ID (defaults to Retail) |
| `tags` | String | No | Comma-separated tags |

**Response**:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "image": {
    "id": "cmgakfy010008ixgmt1sq2sbz",
    "title": "Test Image",
    "description": "Test description",
    "url": "/uploads/images/1759476744775-343899870.jpg",
    "thumbnailUrl": "/uploads/thumbnails/thumb_1759476744775-343899870.jpg",
    "category": "GENERAL",
    "tags": "[\"test\",\"image\"]",
    "dimensions": "1024x1024",
    "fileSize": 94263,
    "downloads": 0,
    "views": 0,
    "approvalStatus": "APPROVED",
    "isActive": true,
    "isMobileSynced": false,
    "adminUploaderId": "cmgae35rz0000x4lm0t6ar1ob",
    "subadminUploaderId": null,
    "businessCategoryId": "cmgaj0gs1000dff4hm11c3gmh",
    "createdAt": "2025-10-03T07:32:24.798Z",
    "updatedAt": "2025-10-03T07:32:24.798Z",
    "businessCategory": {
      "name": "Good Morning",
      "icon": "🌅"
    },
    "admin": {
      "name": "System Administrator",
      "email": "admin@eventmarketers.com"
    }
  }
}
```

#### POST `/api/content/images/upload-simple`

Upload a new image without processing (simple mode).

**Content-Type**: `multipart/form-data`

**Parameters**: Same as above.

**Response**: Same as above.

### 2. Read Images

#### GET `/api/content/images`

Retrieve all images with optional filtering.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | String | No | Filter by category: `BUSINESS`, `FESTIVAL`, `GENERAL` |
| `businessCategory` | String | No | Filter by business category name |
| `status` | String | No | Filter by approval status: `PENDING`, `APPROVED`, `REJECTED` |
| `uploaderType` | String | No | Filter by uploader type: `ADMIN`, `SUBADMIN` |

**Response**:
```json
{
  "success": true,
  "images": [
    {
      "id": "cmgakfy010008ixgmt1sq2sbz",
      "title": "Test Image",
      "description": "Test description",
      "url": "/uploads/images/1759476744775-343899870.jpg",
      "thumbnailUrl": "/uploads/thumbnails/thumb_1759476744775-343899870.jpg",
      "category": "GENERAL",
      "tags": "[\"test\",\"image\"]",
      "dimensions": "1024x1024",
      "fileSize": 94263,
      "downloads": 0,
      "views": 0,
      "approvalStatus": "APPROVED",
      "isActive": true,
      "isMobileSynced": false,
      "adminUploaderId": "cmgae35rz0000x4lm0t6ar1ob",
      "subadminUploaderId": null,
      "businessCategoryId": "cmgaj0gs1000dff4hm11c3gmh",
      "createdAt": "2025-10-03T07:32:24.798Z",
      "updatedAt": "2025-10-03T07:32:24.798Z",
      "businessCategory": {
        "name": "Good Morning",
        "icon": "🌅"
      },
      "admin": {
        "name": "System Administrator",
        "email": "admin@eventmarketers.com"
      }
    }
  ],
  "total": 1
}
```

### 3. Update Image

#### PUT `/api/content/images/:id`

Update image details.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | String | No | New title (min 2 characters) |
| `description` | String | No | New description (max 1000 characters) |
| `category` | String | No | New category: `BUSINESS`, `FESTIVAL`, `GENERAL` |
| `businessCategoryId` | String | No | New business category ID |
| `tags` | String | No | New comma-separated tags |

**Response**:
```json
{
  "success": true,
  "message": "Image updated successfully",
  "image": {
    "id": "cmgakfy010008ixgmt1sq2sbz",
    "title": "Updated Image Title",
    "description": "Updated description",
    "category": "BUSINESS",
    "tags": "[\"updated\",\"business\"]",
    "businessCategoryId": "cmgae37ei0008x4lmm3al79ns",
    "businessCategory": {
      "name": "Education",
      "icon": "🎓"
    },
    "admin": {
      "name": "System Administrator",
      "email": "admin@eventmarketers.com"
    }
  }
}
```

### 4. Delete Image

#### DELETE `/api/content/images/:id`

Delete an image and its associated files.

**Response**:
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### 5. Approve/Reject Image

#### PUT `/api/content/images/:id/approval`

Approve or reject an image (Admin only).

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | String | Yes | `APPROVED` or `REJECTED` |
| `reason` | String | No | Reason for approval/rejection (max 500 characters) |

**Response**:
```json
{
  "success": true,
  "message": "Image approved successfully",
  "image": {
    "id": "cmgakfy010008ixgmt1sq2sbz",
    "title": "Test Image",
    "approvalStatus": "APPROVED",
    "subadminUploader": {
      "name": "Test Subadmin",
      "email": "subadmin@example.com"
    }
  }
}
```

---

## Video CRUD Operations

### 1. Create Video (Upload)

#### POST `/api/content/videos/upload`

Upload a new video with processing.

**Content-Type**: `multipart/form-data`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video` | File | Yes | Video file (MP4, AVI, MOV) |
| `title` | String | Yes | Video title (min 2 characters) |
| `description` | String | No | Video description (max 1000 characters) |
| `category` | String | Yes | Category: `BUSINESS`, `FESTIVAL`, or `GENERAL` |
| `businessCategoryId` | String | No | Business category ID (defaults to Retail) |
| `tags` | String | No | Comma-separated tags |
| `duration` | Integer | No | Video duration in seconds (defaults to 0) |

**Response**:
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "video": {
    "id": "cmgakatxh0004ixgm6mh3vo8y",
    "title": "Test Video",
    "description": "Test video description",
    "url": "/uploads/videos/1759478642030-667877010.mp4",
    "videoUrl": "/uploads/videos/1759478642030-667877010.mp4",
    "thumbnailUrl": "/uploads/thumbnails/thumb_1759478642030-667877010.jpg",
    "duration": 30,
    "category": "GENERAL",
    "tags": "[\"test\",\"video\"]",
    "fileSize": 5547478,
    "downloads": 0,
    "views": 0,
    "approvalStatus": "APPROVED",
    "isActive": true,
    "isMobileSynced": false,
    "adminUploaderId": "cmgae35rz0000x4lm0t6ar1ob",
    "subadminUploaderId": null,
    "businessCategoryId": "cmgaj0gs1000dff4hm11c3gmh",
    "createdAt": "2025-10-03T08:30:15.123Z",
    "updatedAt": "2025-10-03T08:30:15.123Z",
    "businessCategory": {
      "name": "Good Morning",
      "icon": "🌅"
    },
    "admin": {
      "name": "System Administrator",
      "email": "admin@eventmarketers.com"
    }
  }
}
```

#### POST `/api/content/videos/upload-simple`

Upload a new video without processing (simple mode).

**Content-Type**: `multipart/form-data`

**Parameters**: Same as above.

**Response**: Same as above.

### 2. Read Videos

#### GET `/api/content/videos`

Retrieve all videos with optional filtering.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | String | No | Filter by category: `BUSINESS`, `FESTIVAL`, `GENERAL` |
| `businessCategory` | String | No | Filter by business category name |
| `status` | String | No | Filter by approval status: `PENDING`, `APPROVED`, `REJECTED` |
| `uploaderType` | String | No | Filter by uploader type: `ADMIN`, `SUBADMIN` |

**Response**:
```json
{
  "success": true,
  "videos": [
    {
      "id": "cmgakatxh0004ixgm6mh3vo8y",
      "title": "Test Video",
      "description": "Test video description",
      "url": "/uploads/videos/1759478642030-667877010.mp4",
      "videoUrl": "/uploads/videos/1759478642030-667877010.mp4",
      "thumbnailUrl": "/uploads/thumbnails/thumb_1759478642030-667877010.jpg",
      "duration": 30,
      "category": "GENERAL",
      "tags": "[\"test\",\"video\"]",
      "fileSize": 5547478,
      "downloads": 0,
      "views": 0,
      "approvalStatus": "APPROVED",
      "isActive": true,
      "isMobileSynced": false,
      "adminUploaderId": "cmgae35rz0000x4lm0t6ar1ob",
      "subadminUploaderId": null,
      "businessCategoryId": "cmgaj0gs1000dff4hm11c3gmh",
      "createdAt": "2025-10-03T08:30:15.123Z",
      "updatedAt": "2025-10-03T08:30:15.123Z",
      "businessCategory": {
        "name": "Good Morning",
        "icon": "🌅"
      },
      "admin": {
        "name": "System Administrator",
        "email": "admin@eventmarketers.com"
      }
    }
  ],
  "total": 1
}
```

### 3. Update Video

#### PUT `/api/content/videos/:id`

Update video details.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | String | No | New title (min 2 characters) |
| `description` | String | No | New description (max 1000 characters) |
| `category` | String | No | New category: `BUSINESS`, `FESTIVAL`, `GENERAL` |
| `businessCategoryId` | String | No | New business category ID |
| `tags` | String | No | New comma-separated tags |
| `duration` | Integer | No | New duration in seconds (min 0) |

**Response**:
```json
{
  "success": true,
  "message": "Video updated successfully",
  "video": {
    "id": "cmgakatxh0004ixgm6mh3vo8y",
    "title": "Updated Video Title",
    "description": "Updated description",
    "category": "BUSINESS",
    "tags": "[\"updated\",\"business\"]",
    "duration": 60,
    "businessCategoryId": "cmgae37ei0008x4lmm3al79ns",
    "businessCategory": {
      "name": "Education",
      "icon": "🎓"
    },
    "admin": {
      "name": "System Administrator",
      "email": "admin@eventmarketers.com"
    }
  }
}
```

### 4. Delete Video

#### DELETE `/api/content/videos/:id`

Delete a video and its associated files.

**Response**:
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

### 5. Approve/Reject Video

#### PUT `/api/content/videos/:id/approval`

Approve or reject a video (Admin only).

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | String | Yes | `APPROVED` or `REJECTED` |
| `reason` | String | No | Reason for approval/rejection (max 500 characters) |

**Response**:
```json
{
  "success": true,
  "message": "Video approved successfully",
  "video": {
    "id": "cmgakatxh0004ixgm6mh3vo8y",
    "title": "Test Video",
    "approvalStatus": "APPROVED",
    "subadmin": {
      "name": "Test Subadmin",
      "email": "subadmin@example.com"
    }
  }
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Title must be at least 2 characters",
      "path": "title",
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
  "error": "You do not have permission to edit this image"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Image not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to upload image"
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

### Available Business Categories

| ID | Name | Icon | Main Category |
|----|------|------|---------------|
| `cmgae36mf0004x4lmmcygs7ha` | Retail | 🛍️ | BUSINESS |
| `cmgae37ei0008x4lmm3al79ns` | Education | 🎓 | BUSINESS |
| `cmgagiu3s0007127c6n6evnem` | Test Rakhi 2025 | 🎉 | FESTIVAL |
| `cmgaj0gs1000dff4hm11c3gmh` | Good Morning | 🌅 | GENERAL |

### Category Structure
- **BUSINESS**: Professional content for business use
- **FESTIVAL**: Festival and celebration content
- **GENERAL**: General purpose content

---

## Examples

### Example 1: Upload an Image

```bash
curl -X POST http://localhost:3001/api/content/images/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "title=My Test Image" \
  -F "description=This is a test image" \
  -F "category=GENERAL" \
  -F "businessCategoryId=cmgaj0gs1000dff4hm11c3gmh" \
  -F "tags=test,image,upload"
```

### Example 2: Update a Video

```bash
curl -X PUT http://localhost:3001/api/content/videos/cmgakatxh0004ixgm6mh3vo8y \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Video Title",
    "description": "Updated description",
    "category": "BUSINESS",
    "tags": "updated,business,video",
    "duration": 120
  }'
```

### Example 3: Get All Images

```bash
curl -X GET "http://localhost:3001/api/content/images?category=GENERAL&status=APPROVED" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example 4: Approve an Image

```bash
curl -X PUT http://localhost:3001/api/content/images/cmgakfy010008ixgmt1sq2sbz/approval \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "reason": "Content meets quality standards"
  }'
```

### Example 5: Delete a Video

```bash
curl -X DELETE http://localhost:3001/api/content/videos/cmgakatxh0004ixgm6mh3vo8y \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Permission System

### Admin Permissions
- ✅ Create, read, update, delete any image/video
- ✅ Approve/reject any content
- ✅ Access all content regardless of uploader

### Subadmin Permissions
- ✅ Create, read, update, delete their own content
- ❌ Cannot edit/delete content uploaded by others
- ❌ Cannot approve/reject content
- ✅ Can view all content but limited editing rights

---

## File Management

### Upload Directories
- **Images**: `/uploads/images/`
- **Videos**: `/uploads/videos/`
- **Thumbnails**: `/uploads/thumbnails/`

### File Cleanup
- When content is deleted, associated files are automatically removed from the filesystem
- Thumbnail files are also cleaned up during deletion
- Failed uploads are automatically cleaned up

---

## Audit Logging

All content operations are logged in the audit system with:
- User information (Admin/Subadmin)
- Action performed (CREATE, UPDATE, DELETE, APPROVE, REJECT)
- Resource type (IMAGE, VIDEO)
- Resource ID
- Timestamp
- IP address and user agent

---

## Rate Limiting

Currently no rate limiting is implemented, but it's recommended to:
- Limit upload file sizes to reasonable amounts
- Implement client-side validation before API calls
- Monitor usage patterns for potential abuse

---

## Support

For technical support or questions about the Content Management API:
- Check the server logs for detailed error information
- Verify authentication tokens are valid and not expired
- Ensure file uploads meet the required format and size constraints
- Contact the development team for additional assistance

---

*Last updated: October 3, 2025*
*API Version: 1.0*
