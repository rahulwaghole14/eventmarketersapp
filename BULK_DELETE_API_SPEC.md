# Bulk Delete APIs for Web Admin Frontend

This document describes the new endpoints that allow the web frontend to delete many images or videos in a single request. The goal is to replace dozens of single-delete calls with one bulk API that reports per-item results.

---

## 1. DELETE `/api/content/images/bulk`

| Property | Value |
| --- | --- |
| Purpose | Delete up to ~100 images in one call |
| Auth | Same as existing `DELETE /api/content/images/:id` (Admin/Subadmin, tenant/category scoped) |
| Rate Limit | Reject requests with more than 100 IDs |

### Request Body

```json
{
  "imageIds": ["img-uuid-1", "img-uuid-2", "img-uuid-3"],
  "category": "BUSINESS",
  "tenantId": "tenant-123",
  "force": false
}
```

- `imageIds` is required and must be a non-empty array of strings.
- Optional fields (`category`, `tenantId`, `uploadedBy`, etc.) help the backend validate ownership/tenancy before deleting.
- `force` (reserved for future use) would bypass “in use” checks.

### 200 Success Response

```json
{
  "success": true,
  "summary": {
    "total": 3,
    "deleted": 2,
    "failed": 1
  },
  "results": {
    "successful": [
      { "id": "img-uuid-1" },
      { "id": "img-uuid-2" }
    ],
    "failed": [
      { "id": "img-uuid-3", "error": "Image not found" }
    ]
  },
  "message": "Bulk delete completed"
}
```

- Keep 200 even if some IDs fail; list them under `results.failed`.
- If *all* IDs fail (e.g., permission denied), return `4xx` with `success: false`.
- Common error reasons: `NOT_FOUND`, `PERMISSION_DENIED`, `IN_USE`, `ALREADY_DELETED`, `FILE_DELETE_ERROR`.

### Failure Examples

| Status | Body | Notes |
| --- | --- | --- |
| `400` | `{ "success": false, "error": "imageIds must be a non-empty array" }` | Invalid payload |
| `403` | `{ "success": false, "error": "PERMISSION_DENIED" }` | No items deleted |
| `409` | `{ "success": false, "error": "IN_USE", "details": { "id": "img-123" } }` | Asset referenced elsewhere |
| `500` | `{ "success": false, "error": "Bulk delete failed" }` | Unexpected server error |

---

## 2. DELETE `/api/content/videos/bulk`

Identical contract, swapping `imageIds` → `videoIds`.

### Request Body

```json
{
  "videoIds": ["vid-uuid-10", "vid-uuid-11"],
  "category": "GENERAL"
}
```

### Response

Same shape:

```json
{
  "success": true,
  "summary": { "total": 2, "deleted": 2, "failed": 0 },
  "results": {
    "successful": [
      { "id": "vid-uuid-10" },
      { "id": "vid-uuid-11" }
    ],
    "failed": []
  },
  "message": "Bulk delete completed"
}
```

Video-specific reasons might include `IN_PLAYLIST`, `IN_CAMPAIGN`, `TRANSCODING`, etc. A future `force` flag could override those checks.

---

## 3. Behaviour / Backend Notes

1. **Ownership Validation**  
   - The backend will check tenant/category permission just like single deletes.
   - If an ID doesn’t belong to the current admin, it lands in `failed` with `PERMISSION_DENIED`.

2. **Deletion Strategy**  
   - Uses `WHERE id IN (...)` to delete in batches, but also loops through the requested IDs to record per-item results.
   - Cascading cleanup (files, CDN assets) runs for each successful delete. Failures there are reported as `FILE_DELETE_ERROR`.

3. **Audit Logging**  
   - Each bulk call emits a single audit log entry (admin ID, IP, total, deleted, failed).

4. **Partial Failure Rules**  
   - Mixed results => HTTP 200 + per-item breakdown.
   - All failures => HTTP 4xx with `success: false`.

5. **Rate Limiting**  
   - Reject requests with more than ~100 IDs to protect the DB and file storage.

6. **Future Options**  
   - `?dryRun=true` to validate permissions without deleting.
   - Filter-based deletes (category, date range, uploader) for large cleanup jobs.

---

## 4. Frontend Integration Checklist

- Send **one** request per bulk delete action instead of many single deletes.
- Read `summary` and `results` to update the UI:
  - Remove successful rows from the table.
  - Display `results.failed[].error` in toast/tooltips for rerun or user feedback.
- No need for full table reload; keep the existing client state in sync with the response.
- Show a spinner/progress indicator; backend targets <3 seconds for ~100 IDs.
- For retries, pass only the `failed` IDs back to the endpoint.

---

Let me know if you need Postman collections, mock data, or a dry-run flag for QA. Once implemented, the frontend can reuse the same response parser for both images and videos (just swap the request key).***

