# 📅 Calendar API Documentation

## Overview

The Calendar API allows the backend team to post images/posters for specific dates. Users can view these posters in the mobile app's Festivals calendar section.

## API Endpoints

### 1. Get Posters by Date

**GET** `/api/mobile/calendar/posters/:date`

Get all posters for a specific date.

**Parameters:**
- `date` (path parameter): Date in `YYYY-MM-DD` format (e.g., `2025-01-14`)

**Response:**
```json
{
  "success": true,
  "data": {
    "posters": [
      {
        "id": "string",
        "name": "string",
        "title": "string",
        "description": "string",
        "thumbnailUrl": "string",
        "imageUrl": "string",
        "category": "string",
        "downloads": 0,
        "isDownloaded": false,
        "tags": ["string"],
        "date": "YYYY-MM-DD",
        "festivalName": "string (optional)",
        "festivalEmoji": "string (optional)",
        "createdAt": "ISO date string",
        "updatedAt": "ISO date string"
      }
    ],
    "date": "YYYY-MM-DD",
    "total": 0
  },
  "message": "Posters for YYYY-MM-DD fetched successfully"
}
```

**Example:**
```bash
GET /api/mobile/calendar/posters/2025-01-14
```

---

### 2. Get Posters by Month

**GET** `/api/mobile/calendar/posters/month/:year/:month`

Get all posters for an entire month, grouped by date.

**Parameters:**
- `year` (path parameter): Year (e.g., `2025`)
- `month` (path parameter): Month (1-12)

**Response:**
```json
{
  "success": true,
  "data": {
    "posters": {
      "2025-01-01": [
        {
          "id": "string",
          "name": "string",
          "title": "string",
          "description": "string",
          "thumbnailUrl": "string",
          "imageUrl": "string",
          "category": "string",
          "downloads": 0,
          "isDownloaded": false,
          "tags": ["string"],
          "date": "2025-01-01",
          "festivalName": "string (optional)",
          "festivalEmoji": "string (optional)",
          "createdAt": "ISO date string",
          "updatedAt": "ISO date string"
        }
      ],
      "2025-01-14": [...]
    },
    "month": 1,
    "year": 2025,
    "total": 0
  },
  "message": "Posters for 2025-1 fetched successfully"
}
```

**Example:**
```bash
GET /api/mobile/calendar/posters/month/2025/1
```

---

## How to Add Posters for Dates

### Option 1: Using CalendarPoster Model (Recommended)

The `CalendarPoster` model has been added to the Prisma schema. To use it:

1. **Run Prisma Migration:**
   ```bash
   npx prisma migrate dev --name add_calendar_poster_model
   ```

2. **Add Posters via Admin Panel or API:**
   ```typescript
   await prisma.calendarPoster.create({
     data: {
       name: "Makar Sankranti Wishes",
       title: "Makar Sankranti Wishes",
       description: "Festival greeting poster",
       thumbnailUrl: "https://example.com/thumbnail.jpg",
       imageUrl: "https://example.com/image.jpg",
       category: "Festival",
       date: "2025-01-14",
       festivalName: "Makar Sankranti",
       festivalEmoji: "🪁",
       tags: "festival,harvest,2025-01-14",
       isActive: true
     }
   });
   ```

### Option 2: Using Existing Image Model

You can add posters using the existing `Image` model by:

1. Setting `category` to `"FESTIVAL"` or `"CALENDAR"`
2. Adding the date in `YYYY-MM-DD` format to the `tags` field

**Example:**
```typescript
await prisma.image.create({
  data: {
    title: "Makar Sankranti Wishes",
    description: "Festival greeting poster",
    url: "https://example.com/image.jpg",
    thumbnailUrl: "https://example.com/thumbnail.jpg",
    category: "FESTIVAL",
    tags: "festival,harvest,2025-01-14,makar-sankranti",
    approvalStatus: "APPROVED",
    isActive: true
  }
});
```

### Option 3: Using mobile_templates Model

Similar to Image model, you can use `mobile_templates`:

```typescript
await prisma.mobile_templates.create({
  data: {
    title: "Makar Sankranti Wishes",
    description: "Festival greeting poster",
    imageUrl: "https://example.com/image.jpg",
    thumbnailUrl: "https://example.com/thumbnail.jpg",
    category: "FESTIVAL",
    tags: "festival,harvest,2025-01-14,makar-sankranti",
    isActive: true
  }
});
```

---

## Database Schema

### CalendarPoster Model

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

---

## Implementation Notes

1. **Date Format**: Always use `YYYY-MM-DD` format (e.g., `2025-01-14`)
2. **Tag Format**: When using tags, include the date as `YYYY-MM-DD` in the tags string
3. **Priority**: The API checks models in this order:
   - CalendarPoster (if exists)
   - Image model
   - mobile_templates model
4. **Deduplication**: The API automatically removes duplicate posters based on ID
5. **Active Status**: Only active posters (`isActive: true`) are returned
6. **Approval**: For Image model, only approved images (`approvalStatus: 'APPROVED'`) are returned

---

## Testing

### Test Get Posters by Date
```bash
curl -X GET "https://eventmarketersbackend.onrender.com/api/mobile/calendar/posters/2025-01-14"
```

### Test Get Posters by Month
```bash
curl -X GET "https://eventmarketersbackend.onrender.com/api/mobile/calendar/posters/month/2025/1"
```

---

## Migration Steps

1. **Add CalendarPoster Model** (already added to schema):
   ```bash
   npx prisma migrate dev --name add_calendar_poster_model
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Restart Server**: The calendar routes are already registered in `src/index.ts`

---

## Future Enhancements

- Add admin API endpoints for CRUD operations on CalendarPoster
- Add bulk upload functionality for multiple dates
- Add festival metadata (name, emoji, description) to CalendarPoster model
- Add support for recurring festivals (yearly)

---

## Support

For questions or issues, contact the backend team lead.

