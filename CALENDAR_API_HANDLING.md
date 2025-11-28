# 📅 Calendar API Handling - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture & Design](#architecture--design)
3. [API Endpoints](#api-endpoints) (Mobile)
4. [Admin API Endpoints](#admin-api-endpoints) (Web Admin)
5. [Database Schema](#database-schema)
6. [Data Models & Sources](#data-models--sources)
7. [Implementation Details](#implementation-details)
8. [Error Handling](#error-handling)
9. [Request/Response Examples](#requestresponse-examples)
10. [Best Practices](#best-practices)
11. [Testing Guide](#testing-guide)
12. [Troubleshooting](#troubleshooting)
13. [Future Enhancements](#future-enhancements)

---

## Overview

The Calendar API is a flexible system designed to serve festival and event posters to mobile app users based on specific dates. It aggregates content from multiple data sources and provides a unified interface for accessing date-based content.

### Key Features
- **Multi-Source Data Aggregation**: Fetches posters from CalendarPoster, Image, and mobile_templates models
- **Date-Based Filtering**: Supports single date and month-wide queries
- **Automatic Deduplication**: Removes duplicate entries based on unique IDs
- **Flexible Tag System**: Supports date tagging in multiple formats
- **Festival Metadata**: Includes festival names and emojis for enhanced UX

### Use Cases
- Display festival posters for specific dates in mobile calendar view
- Load entire month's worth of festival content at once
- Support both dedicated calendar posters and general festival content

---

## Architecture & Design

### Route Registration
Calendar routes are registered in `src/index.ts`:

```typescript
import mobileCalendarRoutes from './routes/mobile/calendar';
app.use('/api/mobile/calendar', mobileCalendarRoutes);
```

### File Structure
```
src/
├── routes/
│   └── mobile/
│       └── calendar.ts          # Calendar API routes
└── index.ts                     # Route registration
```

### Data Flow
```
Mobile App Request
    ↓
Calendar Route Handler
    ↓
Multi-Model Query (Priority Order):
    1. CalendarPoster Model (Primary)
    2. Image Model (Fallback)
    3. mobile_templates Model (Fallback)
    ↓
Data Aggregation & Deduplication
    ↓
Standardized Response Format
    ↓
JSON Response to Mobile App
```

---

## API Endpoints

### Base URL
```
Production: https://eventmarketersbackend.onrender.com/api/mobile/calendar
Development: http://localhost:3001/api/mobile/calendar
```

### Authentication
**Current Status**: ❌ No authentication required (public endpoints)

**Note**: These endpoints are currently accessible without authentication tokens. Consider adding optional authentication for analytics tracking.

---

### 1. Get Posters by Date

**Endpoint:** `GET /api/mobile/calendar/posters/:date`

Retrieves all active posters for a specific date from all available sources.

#### Path Parameters
| Parameter | Type | Format | Required | Description |
|-----------|------|--------|----------|-------------|
| `date` | string | YYYY-MM-DD | Yes | Target date (e.g., `2025-01-14`) |

#### Validation Rules
- Date format must match: `^\d{4}-\d{2}-\d{2}$`
- Invalid format returns: `400 Bad Request`

#### Response Structure

**Success Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "posters": [
      {
        "id": "clx1234567890",
        "name": "Makar Sankranti Wishes",
        "title": "Makar Sankranti Wishes",
        "description": "Beautiful festival greeting poster",
        "thumbnailUrl": "https://cloudinary.com/thumbnail.jpg",
        "imageUrl": "https://cloudinary.com/image.jpg",
        "category": "Festival",
        "downloads": 42,
        "isDownloaded": false,
        "tags": ["festival", "harvest", "2025-01-14", "makar-sankranti"],
        "date": "2025-01-14",
        "festivalName": "Makar Sankranti",
        "festivalEmoji": "🪁",
        "createdAt": "2025-01-10T10:30:00.000Z",
        "updatedAt": "2025-01-10T10:30:00.000Z"
      }
    ],
    "date": "2025-01-14",
    "total": 1
  },
  "message": "Posters for 2025-01-14 fetched successfully"
}
```

**Error Response (400 Bad Request)**
```json
{
  "success": false,
  "error": "Invalid date format. Expected YYYY-MM-DD",
  "message": "Date must be in YYYY-MM-DD format"
}
```

**Error Response (500 Internal Server Error)**
```json
{
  "success": false,
  "error": "Failed to fetch posters",
  "message": "Internal server error"
}
```

#### Example Requests

**cURL**
```bash
curl -X GET "https://eventmarketersbackend.onrender.com/api/mobile/calendar/posters/2025-01-14"
```

**JavaScript (Fetch)**
```javascript
const response = await fetch('https://eventmarketersbackend.onrender.com/api/mobile/calendar/posters/2025-01-14');
const data = await response.json();
console.log(data);
```

**JavaScript (Axios)**
```javascript
const { data } = await axios.get('/api/mobile/calendar/posters/2025-01-14');
```

**React Native**
```javascript
const fetchPostersByDate = async (date) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/calendar/posters/${date}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const result = await response.json();
    if (result.success) {
      return result.data.posters;
    }
    throw new Error(result.message);
  } catch (error) {
    console.error('Error fetching posters:', error);
    return [];
  }
};
```

---

### 2. Get Posters by Month

**Endpoint:** `GET /api/mobile/calendar/posters/month/:year/:month`

Retrieves all active posters for an entire month, grouped by date.

#### Path Parameters
| Parameter | Type | Range | Required | Description |
|-----------|------|-------|----------|-------------|
| `year` | integer | 2020-2100 | Yes | Target year |
| `month` | integer | 1-12 | Yes | Target month (1 = January, 12 = December) |

#### Validation Rules
- Year must be between 2020 and 2100
- Month must be between 1 and 12
- Invalid values return: `400 Bad Request`

#### Response Structure

**Success Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "posters": {
      "2025-01-01": [
        {
          "id": "clx1234567890",
          "name": "New Year Wishes",
          "title": "New Year Wishes",
          "description": "Happy New Year poster",
          "thumbnailUrl": "https://cloudinary.com/thumbnail.jpg",
          "imageUrl": "https://cloudinary.com/image.jpg",
          "category": "Festival",
          "downloads": 100,
          "isDownloaded": false,
          "tags": ["new-year", "2025-01-01"],
          "date": "2025-01-01",
          "festivalName": "New Year",
          "festivalEmoji": "🎉",
          "createdAt": "2024-12-25T10:30:00.000Z",
          "updatedAt": "2024-12-25T10:30:00.000Z"
        }
      ],
      "2025-01-14": [
        {
          "id": "clx9876543210",
          "name": "Makar Sankranti Wishes",
          "title": "Makar Sankranti Wishes",
          "description": "Festival greeting poster",
          "thumbnailUrl": "https://cloudinary.com/thumbnail2.jpg",
          "imageUrl": "https://cloudinary.com/image2.jpg",
          "category": "Festival",
          "downloads": 42,
          "isDownloaded": false,
          "tags": ["festival", "harvest", "2025-01-14"],
          "date": "2025-01-14",
          "festivalName": "Makar Sankranti",
          "festivalEmoji": "🪁",
          "createdAt": "2025-01-10T10:30:00.000Z",
          "updatedAt": "2025-01-10T10:30:00.000Z"
        }
      ]
    },
    "month": 1,
    "year": 2025,
    "total": 2
  },
  "message": "Posters for 2025-1 fetched successfully"
}
```

**Error Responses**

Invalid Year (400):
```json
{
  "success": false,
  "error": "Invalid year. Expected year between 2020-2100",
  "message": "Year must be between 2020 and 2100"
}
```

Invalid Month (400):
```json
{
  "success": false,
  "error": "Invalid month. Expected month between 1-12",
  "message": "Month must be between 1 and 12"
}
```

#### Example Requests

**cURL**
```bash
curl -X GET "https://eventmarketersbackend.onrender.com/api/mobile/calendar/posters/month/2025/1"
```

**JavaScript**
```javascript
const fetchPostersByMonth = async (year, month) => {
  const response = await fetch(
    `${API_BASE_URL}/calendar/posters/month/${year}/${month}`
  );
  const result = await response.json();
  return result.data.posters; // Object with date keys
};
```

---

## Database Schema

### CalendarPoster Model

**Table Name:** `calendar_posters`

**Schema Definition:**
```prisma
model CalendarPoster {
  id            String   @id @default(cuid())
  name          String
  title         String?
  description   String?
  thumbnailUrl  String
  imageUrl      String
  category      String   @default("Festival")
  downloads     Int      @default(0)
  tags          String?
  date          String   // Date in YYYY-MM-DD format
  festivalName  String?
  festivalEmoji String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([date])
  @@index([category])
  @@map("calendar_posters")
}
```

**Field Descriptions:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | cuid() | Unique identifier |
| `name` | String | Yes | - | Poster name |
| `title` | String | No | null | Display title |
| `description` | String | No | null | Poster description |
| `thumbnailUrl` | String | Yes | - | Thumbnail image URL |
| `imageUrl` | String | Yes | - | Full image URL |
| `category` | String | Yes | "Festival" | Poster category |
| `downloads` | Int | Yes | 0 | Download count |
| `tags` | String | No | null | Comma-separated tags |
| `date` | String | Yes | - | Date in YYYY-MM-DD format |
| `festivalName` | String | No | null | Festival name |
| `festivalEmoji` | String | No | null | Festival emoji |
| `isActive` | Boolean | Yes | true | Active status |
| `createdAt` | DateTime | Yes | now() | Creation timestamp |
| `updatedAt` | DateTime | Yes | - | Last update timestamp |

**Indexes:**
- Primary index on `id`
- Index on `date` (for fast date-based queries)
- Index on `category` (for category filtering)

---

## Data Models & Sources

The Calendar API aggregates data from three sources in priority order:

### 1. CalendarPoster Model (Primary Source)
- **Purpose**: Dedicated calendar poster storage
- **Filtering**: Direct date field matching
- **Status**: Only `isActive: true` records returned
- **Advantages**: 
  - Fastest query performance
  - Purpose-built for calendar functionality
  - Supports festival metadata (name, emoji)

### 2. Image Model (Fallback Source)
- **Purpose**: General image content that can be tagged for dates
- **Filtering**: 
  - Tags contain the date (YYYY-MM-DD format)
  - OR category is 'FESTIVAL' or 'CALENDAR'
- **Status**: Only `isActive: true` AND `approvalStatus: 'APPROVED'`
- **Limitations**: 
  - Less efficient (requires tag parsing)
  - No festival metadata fields

### 3. mobile_templates Model (Fallback Source)
- **Purpose**: Mobile app templates tagged with dates
- **Filtering**: 
  - Tags contain the date (YYYY-MM-DD format)
  - OR category is 'FESTIVAL' or 'CALENDAR'
- **Status**: Only `isActive: true` records
- **Use Case**: Reusing existing templates for calendar

### Query Priority Logic

```typescript
1. Try CalendarPoster.findMany({ where: { date, isActive: true } })
   → If results found, format and add to array

2. Try Image.findMany({ 
     where: { 
       isActive: true,
       approvalStatus: 'APPROVED',
       OR: [
         { tags: { contains: date } },
         { category: 'FESTIVAL' },
         { category: 'CALENDAR' }
       ]
     }
   })
   → Format and add to array

3. Try mobile_templates.findMany({
     where: {
       isActive: true,
       OR: [
         { tags: { contains: date } },
         { category: 'FESTIVAL' },
         { category: 'CALENDAR' }
       ]
     }
   })
   → Format and add to array

4. Remove duplicates based on ID
5. Return unified array
```

---

## Implementation Details

### Date Validation

**Format**: `YYYY-MM-DD` (ISO 8601 date format)
**Regex Pattern**: `/^\d{4}-\d{2}-\d{2}$/`
**Examples**: 
- ✅ Valid: `2025-01-14`, `2025-12-25`, `2024-02-29`
- ❌ Invalid: `01-14-2025`, `2025/01/14`, `2025-1-14`, `14-01-2025`

### Deduplication Logic

Duplicates are removed based on poster `id`:

```typescript
const uniquePosters = posters.filter((poster, index, self) =>
  index === self.findIndex((p) => p.id === poster.id)
);
```

**Behavior**:
- First occurrence is kept
- Subsequent duplicates are removed
- Ensures each poster appears only once in results

### Data Transformation

All models are transformed to a unified format:

```typescript
{
  id: string,
  name: string,
  title: string,
  description: string,
  thumbnailUrl: string,
  imageUrl: string,
  category: string,
  downloads: number,
  isDownloaded: boolean,  // Always false (would need user context)
  tags: string[],
  date: string,           // YYYY-MM-DD format
  festivalName?: string,  // Only from CalendarPoster
  festivalEmoji?: string, // Only from CalendarPoster
  createdAt: string,      // ISO 8601 format
  updatedAt: string       // ISO 8601 format
}
```

### Tag Parsing

Tags stored as comma-separated strings are parsed into arrays:

```typescript
const tags = image.tags 
  ? image.tags.split(',').map((tag: string) => tag.trim())
  : [];
```

**Example:**
- Input: `"festival,harvest,2025-01-14,makar-sankranti"`
- Output: `["festival", "harvest", "2025-01-14", "makar-sankranti"]`

### Month Query Date Range Calculation

```typescript
const daysInMonth = new Date(year, month, 0).getDate();
const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
```

**Example for January 2025:**
- `monthStart`: `"2025-01-01"`
- `monthEnd`: `"2025-01-31"`

### Error Handling Strategy

The API uses graceful degradation:
- If CalendarPoster model doesn't exist, continues to next source
- Errors in one model don't block others
- Only logs errors that aren't expected (model doesn't exist errors are suppressed)

---

## Error Handling

### Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": "Error type or message",
  "message": "Human-readable error description"
}
```

### Common Error Codes

| Status Code | Error Type | Description | Solution |
|-------------|------------|-------------|----------|
| 400 | Invalid Date Format | Date not in YYYY-MM-DD format | Use correct format |
| 400 | Invalid Year | Year outside 2020-2100 range | Use valid year |
| 400 | Invalid Month | Month outside 1-12 range | Use 1-12 |
| 500 | Database Error | Database connection/query failed | Check database connection |
| 500 | Internal Server Error | Unexpected server error | Check server logs |

### Error Handling Examples

**Date Validation Error:**
```json
{
  "success": false,
  "error": "Invalid date format. Expected YYYY-MM-DD",
  "message": "Date must be in YYYY-MM-DD format"
}
```

**Month Validation Error:**
```json
{
  "success": false,
  "error": "Invalid month. Expected month between 1-12",
  "message": "Month must be between 1 and 12"
}
```

**Server Error:**
```json
{
  "success": false,
  "error": "Failed to fetch posters",
  "message": "Internal server error"
}
```

### Client-Side Error Handling

**JavaScript Example:**
```javascript
const fetchPosters = async (date) => {
  try {
    const response = await fetch(`/api/mobile/calendar/posters/${date}`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch posters');
    }
    
    return data.data.posters;
  } catch (error) {
    console.error('Calendar API Error:', error);
    // Handle error (show user message, retry, etc.)
    return [];
  }
};
```

---

## Request/Response Examples

### Example 1: Get Posters for Specific Date

**Request:**
```http
GET /api/mobile/calendar/posters/2025-01-14 HTTP/1.1
Host: eventmarketersbackend.onrender.com
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "posters": [
      {
        "id": "clx1234567890",
        "name": "Makar Sankranti Wishes",
        "title": "Makar Sankranti Wishes",
        "description": "Beautiful kite festival greeting",
        "thumbnailUrl": "https://res.cloudinary.com/xxx/image/upload/w_300,h_300,c_fill/thumb.jpg",
        "imageUrl": "https://res.cloudinary.com/xxx/image/upload/image.jpg",
        "category": "Festival",
        "downloads": 42,
        "isDownloaded": false,
        "tags": ["festival", "harvest", "2025-01-14", "makar-sankranti"],
        "date": "2025-01-14",
        "festivalName": "Makar Sankranti",
        "festivalEmoji": "🪁",
        "createdAt": "2025-01-10T10:30:00.000Z",
        "updatedAt": "2025-01-10T10:30:00.000Z"
      }
    ],
    "date": "2025-01-14",
    "total": 1
  },
  "message": "Posters for 2025-01-14 fetched successfully"
}
```

### Example 2: Get Posters for Entire Month

**Request:**
```http
GET /api/mobile/calendar/posters/month/2025/1 HTTP/1.1
Host: eventmarketersbackend.onrender.com
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "posters": {
      "2025-01-01": [
        {
          "id": "clx1111111111",
          "name": "New Year Wishes",
          "title": "Happy New Year 2025",
          "description": "New Year greeting poster",
          "thumbnailUrl": "https://res.cloudinary.com/xxx/thumb1.jpg",
          "imageUrl": "https://res.cloudinary.com/xxx/image1.jpg",
          "category": "Festival",
          "downloads": 150,
          "isDownloaded": false,
          "tags": ["new-year", "2025-01-01", "celebration"],
          "date": "2025-01-01",
          "festivalName": "New Year",
          "festivalEmoji": "🎉",
          "createdAt": "2024-12-25T10:00:00.000Z",
          "updatedAt": "2024-12-25T10:00:00.000Z"
        }
      ],
      "2025-01-14": [
        {
          "id": "clx2222222222",
          "name": "Makar Sankranti",
          "title": "Makar Sankranti Wishes",
          "description": "Kite festival poster",
          "thumbnailUrl": "https://res.cloudinary.com/xxx/thumb2.jpg",
          "imageUrl": "https://res.cloudinary.com/xxx/image2.jpg",
          "category": "Festival",
          "downloads": 75,
          "isDownloaded": false,
          "tags": ["festival", "2025-01-14", "makar-sankranti"],
          "date": "2025-01-14",
          "festivalName": "Makar Sankranti",
          "festivalEmoji": "🪁",
          "createdAt": "2025-01-10T10:30:00.000Z",
          "updatedAt": "2025-01-10T10:30:00.000Z"
        }
      ],
      "2025-01-26": [
        {
          "id": "clx3333333333",
          "name": "Republic Day",
          "title": "Republic Day Greetings",
          "description": "Republic Day poster",
          "thumbnailUrl": "https://res.cloudinary.com/xxx/thumb3.jpg",
          "imageUrl": "https://res.cloudinary.com/xxx/image3.jpg",
          "category": "National",
          "downloads": 200,
          "isDownloaded": false,
          "tags": ["republic-day", "2025-01-26", "national"],
          "date": "2025-01-26",
          "festivalName": "Republic Day",
          "festivalEmoji": "🇮🇳",
          "createdAt": "2025-01-20T10:00:00.000Z",
          "updatedAt": "2025-01-20T10:00:00.000Z"
        }
      ]
    },
    "month": 1,
    "year": 2025,
    "total": 3
  },
  "message": "Posters for 2025-1 fetched successfully"
}
```

### Example 3: Empty Result

**Request:**
```http
GET /api/mobile/calendar/posters/2025-06-15 HTTP/1.1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "posters": [],
    "date": "2025-06-15",
    "total": 0
  },
  "message": "Posters for 2025-06-15 fetched successfully"
}
```

---

## Best Practices

### For Backend Developers

1. **Use CalendarPoster Model for New Posters**
   - Best performance and features
   - Supports festival metadata
   - Direct date indexing

2. **Date Format Consistency**
   - Always use `YYYY-MM-DD` format
   - Validate before database insertion
   - Use UTC dates when applicable

3. **Tag Formatting**
   - Include date in tags: `"festival,2025-01-14,makar-sankranti"`
   - Use lowercase, hyphenated tags
   - Separate with commas

4. **Image URLs**
   - Use Cloudinary or CDN URLs
   - Generate thumbnails (300x300 recommended)
   - Use HTTPS URLs only

5. **Active Status Management**
   - Set `isActive: false` to hide without deleting
   - Review inactive posters periodically
   - Use soft deletes for audit trails

### For Frontend Developers

1. **Date Handling**
   ```javascript
   // Always format dates as YYYY-MM-DD
   const formatDate = (date) => {
     const d = new Date(date);
     const year = d.getFullYear();
     const month = String(d.getMonth() + 1).padStart(2, '0');
     const day = String(d.getDate()).padStart(2, '0');
     return `${year}-${month}-${day}`;
   };
   ```

2. **Error Handling**
   ```javascript
   // Always check success flag
   if (!response.success) {
     // Handle error
   }
   ```

3. **Caching Strategy**
   - Cache month data (changes less frequently)
   - Revalidate daily
   - Cache individual dates for shorter periods

4. **Image Loading**
   - Use thumbnail for list views
   - Lazy load full images
   - Handle broken image URLs gracefully

5. **Month Navigation**
   ```javascript
   // Use month endpoint for calendar views
   const loadMonth = async (year, month) => {
     const response = await fetch(
       `/api/mobile/calendar/posters/month/${year}/${month}`
     );
     return response.data.posters; // Already grouped by date
   };
   ```

### For Mobile App Developers

1. **Date Picker Integration**
   - Use native date pickers
   - Format selected date as YYYY-MM-DD
   - Handle timezone conversions if needed

2. **Calendar UI**
   - Load entire month when calendar opens
   - Use date endpoint for refresh
   - Show loading states

3. **Performance Optimization**
   ```javascript
   // Load month data once
   const monthData = await fetchMonth(year, month);
   
   // Use cached data for individual date views
   const datePosters = monthData[date] || [];
   ```

4. **Offline Support**
   - Cache month data locally
   - Show cached data when offline
   - Sync when connection restored

---

## Testing Guide

### Manual Testing

#### Test 1: Valid Date Request
```bash
curl -X GET "http://localhost:3001/api/mobile/calendar/posters/2025-01-14"
```
**Expected**: 200 OK with posters array

#### Test 2: Invalid Date Format
```bash
curl -X GET "http://localhost:3001/api/mobile/calendar/posters/01-14-2025"
```
**Expected**: 400 Bad Request with error message

#### Test 3: Valid Month Request
```bash
curl -X GET "http://localhost:3001/api/mobile/calendar/posters/month/2025/1"
```
**Expected**: 200 OK with posters object grouped by date

#### Test 4: Invalid Month
```bash
curl -X GET "http://localhost:3001/api/mobile/calendar/posters/month/2025/13"
```
**Expected**: 400 Bad Request with error message

#### Test 5: Invalid Year
```bash
curl -X GET "http://localhost:3001/api/mobile/calendar/posters/month/1999/1"
```
**Expected**: 400 Bad Request with error message

### Automated Testing

**Test File:** `tests/calendar.test.ts` (to be created)

```typescript
import request from 'supertest';
import app from '../src/index';

describe('Calendar API', () => {
  describe('GET /api/mobile/calendar/posters/:date', () => {
    it('should return posters for valid date', async () => {
      const response = await request(app)
        .get('/api/mobile/calendar/posters/2025-01-14')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('posters');
      expect(Array.isArray(response.body.data.posters)).toBe(true);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/mobile/calendar/posters/invalid-date')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid date format');
    });
  });

  describe('GET /api/mobile/calendar/posters/month/:year/:month', () => {
    it('should return posters grouped by date', async () => {
      const response = await request(app)
        .get('/api/mobile/calendar/posters/month/2025/1')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('posters');
      expect(typeof response.body.data.posters).toBe('object');
    });
  });
});
```

### Postman Collection

**Import the following into Postman:**

```json
{
  "info": {
    "name": "Calendar API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Posters by Date",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{base_url}}/api/mobile/calendar/posters/2025-01-14",
          "host": ["{{base_url}}"],
          "path": ["api", "mobile", "calendar", "posters", "2025-01-14"]
        }
      }
    },
    {
      "name": "Get Posters by Month",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{base_url}}/api/mobile/calendar/posters/month/2025/1",
          "host": ["{{base_url}}"],
          "path": ["api", "mobile", "calendar", "posters", "month", "2025", "1"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "https://eventmarketersbackend.onrender.com"
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

#### Issue 1: No Posters Returned

**Symptoms**: Empty array returned even when posters exist

**Possible Causes:**
1. Posters marked as `isActive: false`
2. Images not approved (`approvalStatus !== 'APPROVED'`)
3. Date format mismatch in tags
4. CalendarPoster model not migrated

**Solutions:**
```sql
-- Check active status
SELECT * FROM calendar_posters WHERE date = '2025-01-14' AND is_active = true;

-- Check image approval
SELECT * FROM images WHERE tags LIKE '%2025-01-14%' AND is_active = true AND approval_status = 'APPROVED';

-- Verify date format in tags
SELECT * FROM images WHERE tags LIKE '%2025-01-14%';
```

#### Issue 2: Duplicate Posters

**Symptoms**: Same poster appears multiple times

**Cause**: Multiple models have same content with different IDs

**Solution**: 
- Check deduplication logic is working
- Review data sources for actual duplicates
- Consider using unique identifiers across models

#### Issue 3: Slow Response Times

**Symptoms**: API takes several seconds to respond

**Possible Causes:**
1. Large number of records
2. Missing database indexes
3. Inefficient queries

**Solutions:**
```sql
-- Add index on date (if missing)
CREATE INDEX IF NOT EXISTS idx_calendar_posters_date ON calendar_posters(date);

-- Add index on tags (for Image model)
CREATE INDEX IF NOT EXISTS idx_images_tags ON images(tags);

-- Review query performance
EXPLAIN ANALYZE SELECT * FROM calendar_posters WHERE date = '2025-01-14';
```

#### Issue 4: Date Format Errors

**Symptoms**: 400 Bad Request errors

**Cause**: Date not in YYYY-MM-DD format

**Solution**: 
- Validate date format before API call
- Use date formatting utilities
- Check timezone handling

#### Issue 5: CalendarPoster Model Not Found

**Symptoms**: Errors in logs about missing model

**Cause**: Database migration not run

**Solution:**
```bash
# Run Prisma migration
npx prisma migrate dev --name add_calendar_poster_model

# Generate Prisma client
npx prisma generate

# Restart server
```

### Debug Logging

The API includes console logging for debugging:

```
📅 [CALENDAR API] Fetching posters for date: 2025-01-14
✅ [CALENDAR API] Found 5 poster(s) from CalendarPoster model
✅ [CALENDAR API] Found 2 poster(s) from Image model
✅ [CALENDAR API] Found 7 poster(s) for date: 2025-01-14
```

Enable detailed logging in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('📅 [CALENDAR API] Query details:', {
    date,
    calendarPostersCount,
    imageCount,
    templateCount
  });
}
```

### Performance Monitoring

Monitor these metrics:

1. **Response Time**: Should be < 500ms for date queries, < 1s for month queries
2. **Database Queries**: Should minimize query count
3. **Cache Hit Rate**: If caching implemented
4. **Error Rate**: Should be < 1%

---

## Admin API Endpoints

> **Status**: ✅ Implemented for Web Admin Panel
> **Reference**: See [CALENDAR_POSTERS_BACKEND_IMPLEMENTATION_GUIDE.md](./CALENDAR_POSTERS_BACKEND_IMPLEMENTATION_GUIDE.md) for detailed implementation guide

The admin API endpoints allow administrators and subadmins to manage calendar posters through the web admin panel. All endpoints require authentication.

### Base URL
```
Production: https://eventmarketersbackend.onrender.com/api/admin/calendar
Development: http://localhost:3001/api/admin/calendar
```

### Authentication
**Required**: All endpoints require admin/subadmin authentication token
**Header**: `Authorization: Bearer <token>`

---

### 1. Get All Calendar Posters (Admin)

**Endpoint:** `GET /api/admin/calendar/posters`

Get all calendar posters with filtering, pagination, and search capabilities.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | integer | Page number (default: 1) | `?page=1` |
| `limit` | integer | Items per page (default: 20) | `?limit=20` |
| `date` | string | Filter by specific date (YYYY-MM-DD) | `?date=2025-01-14` |
| `startDate` | string | Filter by date range start (YYYY-MM-DD) | `?startDate=2025-01-01` |
| `endDate` | string | Filter by date range end (YYYY-MM-DD) | `?endDate=2025-01-31` |
| `festivalName` | string | Filter by festival name | `?festivalName=Makar Sankranti` |
| `isActive` | boolean | Filter by active status | `?isActive=true` |
| `search` | string | Search in name, title, description | `?search=kite` |

#### Response Example

```json
{
  "success": true,
  "data": {
    "posters": [
      {
        "id": "clx1234567890",
        "name": "Makar Sankranti Wishes",
        "title": "Makar Sankranti Wishes",
        "description": "Beautiful festival greeting",
        "thumbnailUrl": "https://cloudinary.com/thumb.jpg",
        "imageUrl": "https://cloudinary.com/image.jpg",
        "category": "Festival",
        "downloads": 42,
        "tags": ["festival", "harvest", "2025-01-14"],
        "date": "2025-01-14",
        "festivalName": "Makar Sankranti",
        "festivalEmoji": "🪁",
        "isActive": true,
        "createdAt": "2025-01-10T10:30:00.000Z",
        "updatedAt": "2025-01-10T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  },
  "message": "Posters fetched successfully"
}
```

---

### 2. Get Calendar Poster by ID (Admin)

**Endpoint:** `GET /api/admin/calendar/posters/:id`

Get a single calendar poster by its ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Calendar poster ID |

#### Response Example

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "Makar Sankranti Wishes",
    "title": "Makar Sankranti Wishes",
    "description": "Beautiful festival greeting",
    "thumbnailUrl": "https://cloudinary.com/thumb.jpg",
    "imageUrl": "https://cloudinary.com/image.jpg",
    "category": "Festival",
    "downloads": 42,
    "tags": ["festival", "harvest", "2025-01-14"],
    "date": "2025-01-14",
    "festivalName": "Makar Sankranti",
    "festivalEmoji": "🪁",
    "isActive": true,
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": "2025-01-10T10:30:00.000Z"
  },
  "message": "Poster fetched successfully"
}
```

---

### 3. Create Calendar Poster (Admin)

**Endpoint:** `POST /api/admin/calendar/posters`

Create a new calendar poster with image upload.

#### Content Type
`multipart/form-data`

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | Image file (JPEG/PNG, max 5MB) |
| `name` | string | Yes | Poster name |
| `title` | string | No | Display title (defaults to name) |
| `description` | string | No | Poster description |
| `date` | string | Yes | Date in YYYY-MM-DD format |
| `festivalName` | string | No | Festival name |
| `festivalEmoji` | string | No | Festival emoji (max 2 chars) |
| `category` | string | No | Category (default: "Festival") |
| `tags` | string | No | Comma-separated tags |
| `isActive` | boolean | No | Active status (default: true) |

#### Example Request

```bash
curl -X POST "https://eventmarketersbackend.onrender.com/api/admin/calendar/posters" \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/image.jpg" \
  -F "name=Makar Sankranti Wishes" \
  -F "date=2025-01-14" \
  -F "festivalName=Makar Sankranti" \
  -F "festivalEmoji=🪁"
```

#### Response Example (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "Makar Sankranti Wishes",
    "title": "Makar Sankranti Wishes",
    "description": null,
    "thumbnailUrl": "https://cloudinary.com/thumb.jpg",
    "imageUrl": "https://cloudinary.com/image.jpg",
    "category": "Festival",
    "downloads": 0,
    "tags": [],
    "date": "2025-01-14",
    "festivalName": "Makar Sankranti",
    "festivalEmoji": "🪁",
    "isActive": true,
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": "2025-01-10T10:30:00.000Z"
  },
  "message": "Calendar poster created successfully"
}
```

---

### 4. Update Calendar Poster (Admin)

**Endpoint:** `PUT /api/admin/calendar/posters/:id`

Update an existing calendar poster. All fields are optional - only provided fields will be updated.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Calendar poster ID |

#### Request Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Poster name |
| `title` | string | No | Display title |
| `description` | string | No | Poster description |
| `date` | string | No | Date in YYYY-MM-DD format |
| `festivalName` | string | No | Festival name |
| `festivalEmoji` | string | No | Festival emoji (max 2 chars) |
| `category` | string | No | Category |
| `tags` | string | No | Comma-separated tags |
| `isActive` | boolean | No | Active status |

#### Example Request

```json
PUT /api/admin/calendar/posters/clx1234567890
{
  "festivalName": "Updated Festival Name",
  "isActive": false
}
```

#### Response Example (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "Makar Sankranti Wishes",
    "title": "Makar Sankranti Wishes",
    "festivalName": "Updated Festival Name",
    "isActive": false,
    ...
  },
  "message": "Poster updated successfully"
}
```

---

### 5. Delete Calendar Poster (Admin)

**Endpoint:** `DELETE /api/admin/calendar/posters/:id`

Delete a calendar poster. Also deletes associated image from Cloudinary.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Calendar poster ID |

#### Response Example (200 OK)

```json
{
  "success": true,
  "message": "Calendar poster deleted successfully"
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Poster not found",
  "message": "Calendar poster with ID clx1234567890 does not exist"
}
```

---

### 6. Bulk Delete Calendar Posters (Admin)

**Endpoint:** `DELETE /api/admin/calendar/posters/bulk`

Delete multiple calendar posters at once.

#### Request Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `posterIds` | array[string] | Yes | Array of poster IDs to delete |

#### Example Request

```json
{
  "posterIds": [
    "clx1234567890",
    "clx9876543210",
    "clx5555555555"
  ]
}
```

#### Response Example (200 OK)

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 3,
      "deleted": 2,
      "failed": 1
    },
    "results": {
      "successful": [
        { "id": "clx1234567890" },
        { "id": "clx9876543210" }
      ],
      "failed": [
        {
          "id": "clx5555555555",
          "error": "Poster not found"
        }
      ]
    }
  },
  "message": "Bulk delete completed successfully"
}
```

---

### 7. Bulk Upload Calendar Posters (Admin)

**Endpoint:** `POST /api/admin/calendar/posters/bulk-upload`

Upload multiple images for a single date at once.

#### Content Type
`multipart/form-data`

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | file[] | Yes | Multiple image files (max 50) |
| `date` | string | Yes | Date in YYYY-MM-DD format |
| `category` | string | No | Category (default: "Festival") |
| `isActive` | boolean | No | Active status (default: true) |

#### Example Request

```bash
curl -X POST "https://eventmarketersbackend.onrender.com/api/admin/calendar/posters/bulk-upload" \
  -H "Authorization: Bearer <token>" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "images=@/path/to/image3.jpg" \
  -F "date=2025-01-14" \
  -F "category=Festival"
```

#### Response Example (201 Created)

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0
    },
    "results": {
      "successful": [
        {
          "id": "clx1111111111",
          "name": "image1",
          "date": "2025-01-14"
        },
        {
          "id": "clx2222222222",
          "name": "image2",
          "date": "2025-01-14"
        },
        {
          "id": "clx3333333333",
          "name": "image3",
          "date": "2025-01-14"
        }
      ],
      "failed": []
    }
  },
  "message": "Bulk upload completed successfully"
}
```

---

## Admin API Endpoints

> **Status**: ✅ Implemented for Web Admin Panel
> **Reference**: See [CALENDAR_POSTERS_BACKEND_IMPLEMENTATION_GUIDE.md](./CALENDAR_POSTERS_BACKEND_IMPLEMENTATION_GUIDE.md) for detailed implementation guide

The admin API endpoints allow administrators and subadmins to manage calendar posters through the web admin panel. All endpoints require authentication.

### Base URL
```
Production: https://eventmarketersbackend.onrender.com/api/admin/calendar
Development: http://localhost:3001/api/admin/calendar
```

### Authentication
**Required**: All endpoints require admin/subadmin authentication token
**Header**: `Authorization: Bearer <token>`

---

### 1. Get All Calendar Posters (Admin)

**Endpoint:** `GET /api/admin/calendar/posters`

Get all calendar posters with filtering, pagination, and search capabilities.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | integer | Page number (default: 1) | `?page=1` |
| `limit` | integer | Items per page (default: 20) | `?limit=20` |
| `date` | string | Filter by specific date (YYYY-MM-DD) | `?date=2025-01-14` |
| `startDate` | string | Filter by date range start (YYYY-MM-DD) | `?startDate=2025-01-01` |
| `endDate` | string | Filter by date range end (YYYY-MM-DD) | `?endDate=2025-01-31` |
| `festivalName` | string | Filter by festival name | `?festivalName=Makar Sankranti` |
| `isActive` | boolean | Filter by active status | `?isActive=true` |
| `search` | string | Search in name, title, description | `?search=kite` |

#### Response Example

```json
{
  "success": true,
  "data": {
    "posters": [
      {
        "id": "clx1234567890",
        "name": "Makar Sankranti Wishes",
        "title": "Makar Sankranti Wishes",
        "description": "Beautiful festival greeting",
        "thumbnailUrl": "https://cloudinary.com/thumb.jpg",
        "imageUrl": "https://cloudinary.com/image.jpg",
        "category": "Festival",
        "downloads": 42,
        "tags": ["festival", "harvest", "2025-01-14"],
        "date": "2025-01-14",
        "festivalName": "Makar Sankranti",
        "festivalEmoji": "🪁",
        "isActive": true,
        "createdAt": "2025-01-10T10:30:00.000Z",
        "updatedAt": "2025-01-10T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  },
  "message": "Posters fetched successfully"
}
```

---

### 2. Get Calendar Poster by ID (Admin)

**Endpoint:** `GET /api/admin/calendar/posters/:id`

Get a single calendar poster by its ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Calendar poster ID |

#### Response Example

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "Makar Sankranti Wishes",
    "title": "Makar Sankranti Wishes",
    "description": "Beautiful festival greeting",
    "thumbnailUrl": "https://cloudinary.com/thumb.jpg",
    "imageUrl": "https://cloudinary.com/image.jpg",
    "category": "Festival",
    "downloads": 42,
    "tags": ["festival", "harvest", "2025-01-14"],
    "date": "2025-01-14",
    "festivalName": "Makar Sankranti",
    "festivalEmoji": "🪁",
    "isActive": true,
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": "2025-01-10T10:30:00.000Z"
  },
  "message": "Poster fetched successfully"
}
```

---

### 3. Create Calendar Poster (Admin)

**Endpoint:** `POST /api/admin/calendar/posters`

Create a new calendar poster with image upload.

#### Content Type
`multipart/form-data`

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | file | Yes | Image file (JPEG/PNG, max 5MB) |
| `name` | string | Yes | Poster name |
| `title` | string | No | Display title (defaults to name) |
| `description` | string | No | Poster description |
| `date` | string | Yes | Date in YYYY-MM-DD format |
| `festivalName` | string | No | Festival name |
| `festivalEmoji` | string | No | Festival emoji (max 2 chars) |
| `category` | string | No | Category (default: "Festival") |
| `tags` | string | No | Comma-separated tags |
| `isActive` | boolean | No | Active status (default: true) |

#### Example Request

```bash
curl -X POST "https://eventmarketersbackend.onrender.com/api/admin/calendar/posters" \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/image.jpg" \
  -F "name=Makar Sankranti Wishes" \
  -F "date=2025-01-14" \
  -F "festivalName=Makar Sankranti" \
  -F "festivalEmoji=🪁"
```

#### Response Example (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "Makar Sankranti Wishes",
    "title": "Makar Sankranti Wishes",
    "description": null,
    "thumbnailUrl": "https://cloudinary.com/thumb.jpg",
    "imageUrl": "https://cloudinary.com/image.jpg",
    "category": "Festival",
    "downloads": 0,
    "tags": [],
    "date": "2025-01-14",
    "festivalName": "Makar Sankranti",
    "festivalEmoji": "🪁",
    "isActive": true,
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": "2025-01-10T10:30:00.000Z"
  },
  "message": "Calendar poster created successfully"
}
```

---

### 4. Update Calendar Poster (Admin)

**Endpoint:** `PUT /api/admin/calendar/posters/:id`

Update an existing calendar poster. All fields are optional - only provided fields will be updated.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Calendar poster ID |

#### Request Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Poster name |
| `title` | string | No | Display title |
| `description` | string | No | Poster description |
| `date` | string | No | Date in YYYY-MM-DD format |
| `festivalName` | string | No | Festival name |
| `festivalEmoji` | string | No | Festival emoji (max 2 chars) |
| `category` | string | No | Category |
| `tags` | string | No | Comma-separated tags |
| `isActive` | boolean | No | Active status |

#### Example Request

```json
PUT /api/admin/calendar/posters/clx1234567890
{
  "festivalName": "Updated Festival Name",
  "isActive": false
}
```

#### Response Example (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "Makar Sankranti Wishes",
    "title": "Makar Sankranti Wishes",
    "festivalName": "Updated Festival Name",
    "isActive": false,
    ...
  },
  "message": "Poster updated successfully"
}
```

---

### 5. Delete Calendar Poster (Admin)

**Endpoint:** `DELETE /api/admin/calendar/posters/:id`

Delete a calendar poster. Also deletes associated image from Cloudinary.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Calendar poster ID |

#### Response Example (200 OK)

```json
{
  "success": true,
  "message": "Calendar poster deleted successfully"
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Poster not found",
  "message": "Calendar poster with ID clx1234567890 does not exist"
}
```

---

### 6. Bulk Delete Calendar Posters (Admin)

**Endpoint:** `DELETE /api/admin/calendar/posters/bulk`

Delete multiple calendar posters at once.

#### Request Body (JSON)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `posterIds` | array[string] | Yes | Array of poster IDs to delete |

#### Example Request

```json
{
  "posterIds": [
    "clx1234567890",
    "clx9876543210",
    "clx5555555555"
  ]
}
```

#### Response Example (200 OK)

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 3,
      "deleted": 2,
      "failed": 1
    },
    "results": {
      "successful": [
        { "id": "clx1234567890" },
        { "id": "clx9876543210" }
      ],
      "failed": [
        {
          "id": "clx5555555555",
          "error": "Poster not found"
        }
      ]
    }
  },
  "message": "Bulk delete completed successfully"
}
```

---

### 7. Bulk Upload Calendar Posters (Admin)

**Endpoint:** `POST /api/admin/calendar/posters/bulk-upload`

Upload multiple images for a single date at once.

#### Content Type
`multipart/form-data`

#### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | file[] | Yes | Multiple image files (max 50) |
| `date` | string | Yes | Date in YYYY-MM-DD format |
| `category` | string | No | Category (default: "Festival") |
| `isActive` | boolean | No | Active status (default: true) |

#### Example Request

```bash
curl -X POST "https://eventmarketersbackend.onrender.com/api/admin/calendar/posters/bulk-upload" \
  -H "Authorization: Bearer <token>" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "images=@/path/to/image3.jpg" \
  -F "date=2025-01-14" \
  -F "category=Festival"
```

#### Response Example (201 Created)

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0
    },
    "results": {
      "successful": [
        {
          "id": "clx1111111111",
          "name": "image1",
          "date": "2025-01-14"
        },
        {
          "id": "clx2222222222",
          "name": "image2",
          "date": "2025-01-14"
        },
        {
          "id": "clx3333333333",
          "name": "image3",
          "date": "2025-01-14"
        }
      ],
      "failed": []
    }
  },
  "message": "Bulk upload completed successfully"
}
```

---

## Future Enhancements

### Planned Features

1. **Bulk Upload Enhancement**
   - Upload multiple posters for multiple dates
   - CSV/JSON import functionality
   - Batch processing with progress tracking

2. **Recurring Festivals**
   - Yearly recurring events
   - Automatic poster assignment
   - Custom recurrence rules

3. **Advanced Filtering**
   - Filter by category
   - Filter by festival name
   - Date range queries
   - Pagination support (already implemented)

4. **Analytics**
   - View/download tracking
   - Popular festivals report
   - Date-based analytics

5. **Caching Layer**
   - Redis caching for month data
   - Cache invalidation strategies
   - CDN integration

6. **Image Update**
   - Update poster image without deleting the poster
   - Image versioning

### Implementation Priority

1. **High Priority** (✅ Completed):
   - ✅ Admin CRUD endpoints
   - ✅ Bulk upload
   - ✅ Bulk delete
   - ✅ Pagination and filtering

2. **Medium Priority**:
   - Image update functionality
   - Advanced analytics

3. **Low Priority**:
   - Recurring festivals
   - CSV/JSON import

---

## Additional Resources

### Related Documentation
- [Calendar Posters Backend Implementation Guide](./CALENDAR_POSTERS_BACKEND_IMPLEMENTATION_GUIDE.md) - Admin API implementation guide
- [Calendar API Documentation](./CALENDAR_API_DOCUMENTATION.md) - Original mobile API documentation
- [API Collection Summary](./API_COLLECTION_SUMMARY.md)
- [Mobile API Documentation](./MOBILE_API_DOCUMENTATION.md)
- [Database Schema](./prisma/schema.prisma)

### Code References
- Mobile Calendar Routes: `src/routes/mobile/calendar.ts`
- Admin Calendar Routes: `src/routes/admin/calendar.ts` (expected location)
- Route Registration: `src/index.ts` (line 181 for mobile)
- Schema Definition: `prisma/schema.prisma` (line 433)

### Support Contacts
- **Backend Team Lead**: [Contact Info]
- **Technical Issues**: [Issue Tracker]
- **API Questions**: [Team Slack Channel]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2025-01-XX | Added Admin API Endpoints documentation |
| 1.0.0 | 2025-01-XX | Initial comprehensive documentation |
| - | - | Based on existing CALENDAR_API_DOCUMENTATION.md |

---

**Last Updated**: January 2025
**Maintained By**: Backend Team
**Status**: ✅ Active

