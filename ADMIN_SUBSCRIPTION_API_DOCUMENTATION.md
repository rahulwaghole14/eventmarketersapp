# 📊 Admin Subscription Management API Documentation

**Base URL:** `https://eventmarketersbackend.onrender.com` (Production)  
**Local URL:** `http://localhost:3001` (Development)

---

## 🔐 Authentication

All admin subscription APIs require **Admin Authentication** using Bearer token.

### Admin Login
**POST** `/api/auth/admin/login`

**Request Body:**
```json
{
  "email": "admin@eventmarketers.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cmgae35rz0000x4lm0t6ar1ob",
    "email": "admin@eventmarketers.com",
    "name": "System Administrator",
    "role": "admin",
    "userType": "ADMIN"
  }
}
```

**Headers for all subsequent requests:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

## 📋 Subscription Listing API

### Get All Subscriptions
**GET** `/api/admin/subscriptions`

**Description:** Retrieve a paginated list of all mobile user subscriptions with filtering and search capabilities.

**Headers:**
```
Authorization: Bearer {admin-token}
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 20 | Number of items per page |
| `status` | string | No | - | Filter by subscription status (`ACTIVE`, `INACTIVE`, `EXPIRED`) |
| `plan` | string | No | - | Filter by plan type (`monthly_pro`, `yearly_pro`) |
| `search` | string | No | - | Search by user name or email |

**Example Requests:**
```bash
# Get all subscriptions (first page)
GET /api/admin/subscriptions

# Get active subscriptions only
GET /api/admin/subscriptions?status=ACTIVE

# Get monthly pro subscriptions
GET /api/admin/subscriptions?plan=monthly_pro

# Search for user by name or email
GET /api/admin/subscriptions?search=john

# Get second page with 10 items per page
GET /api/admin/subscriptions?page=2&limit=10

# Combined filters
GET /api/admin/subscriptions?status=ACTIVE&plan=yearly_pro&search=company&page=1&limit=15
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "cmgdag3ge0007108o4vumc28a",
        "user": {
          "id": "cmgdadjvs0003108odst93gsf",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890"
        },
        "plan": "Monthly Pro",
        "planId": "monthly_pro",
        "status": "ACTIVE",
        "amount": 299,
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-02-01T00:00:00.000Z",
        "paymentMethod": "razorpay",
        "autoRenew": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    },
    "summary": {
      "totalSubscriptions": 150,
      "activeSubscriptions": 120,
      "monthlyRevenue": 35980
    }
  }
}
```

**Response Fields:**

#### Subscription Object:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique subscription ID |
| `user` | object | User details (null if user not found) |
| `user.id` | string | User ID |
| `user.name` | string | User's full name |
| `user.email` | string | User's email address |
| `user.phone` | string | User's phone number |
| `plan` | string | Plan display name (e.g., "Monthly Pro") |
| `planId` | string | Plan identifier (`monthly_pro`, `yearly_pro`) |
| `status` | string | Subscription status (`ACTIVE`, `INACTIVE`, `EXPIRED`) |
| `amount` | number | Subscription amount in INR |
| `startDate` | string | Subscription start date (ISO 8601) |
| `endDate` | string | Subscription end date (ISO 8601) |
| `paymentMethod` | string | Payment method used (`razorpay`) |
| `autoRenew` | boolean | Whether subscription auto-renews |
| `createdAt` | string | Subscription creation date (ISO 8601) |

#### Pagination Object:
| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page number |
| `limit` | number | Items per page |
| `total` | number | Total number of subscriptions |
| `totalPages` | number | Total number of pages |

#### Summary Object:
| Field | Type | Description |
|-------|------|-------------|
| `totalSubscriptions` | number | Total subscriptions in database |
| `activeSubscriptions` | number | Currently active subscriptions |
| `monthlyRevenue` | number | Total monthly recurring revenue (MRR) |

---

## 🚨 Error Responses

### Authentication Errors:
```json
{
  "success": false,
  "error": "Authorization token required"
}
```

```json
{
  "success": false,
  "error": "Admin access required"
}
```

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### Server Errors:
```json
{
  "success": false,
  "error": "Failed to fetch subscriptions",
  "details": "Error message details"
}
```

---

## 📱 Frontend Integration Examples

### JavaScript/React Example:
```javascript
class AdminSubscriptionService {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async getSubscriptions(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.status) params.append('status', filters.status);
    if (filters.plan) params.append('plan', filters.plan);
    if (filters.search) params.append('search', filters.search);

    const response = await fetch(`${this.baseURL}/api/admin/subscriptions?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/api/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.token = data.token;
    return data;
  }
}

// Usage
const subscriptionService = new AdminSubscriptionService('http://localhost:3001');

// Login
await subscriptionService.login('admin@eventmarketers.com', 'admin123');

// Get all subscriptions
const allSubscriptions = await subscriptionService.getSubscriptions();

// Get active subscriptions
const activeSubscriptions = await subscriptionService.getSubscriptions({
  status: 'ACTIVE'
});

// Search subscriptions
const searchResults = await subscriptionService.getSubscriptions({
  search: 'john',
  page: 1,
  limit: 10
});
```

### React Hook Example:
```javascript
import { useState, useEffect } from 'react';

const useAdminSubscriptions = (filters = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/admin/subscriptions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [JSON.stringify(filters)]);

  return { data, loading, error, refetch: fetchSubscriptions };
};

// Usage in component
const SubscriptionList = () => {
  const [filters, setFilters] = useState({});
  const { data, loading, error } = useAdminSubscriptions(filters);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Subscriptions ({data?.summary.totalSubscriptions})</h2>
      <p>Active: {data?.summary.activeSubscriptions}</p>
      <p>Revenue: ₹{data?.summary.monthlyRevenue}</p>
      
      {data?.subscriptions.map(subscription => (
        <div key={subscription.id}>
          <h3>{subscription.user?.name}</h3>
          <p>Plan: {subscription.plan}</p>
          <p>Status: {subscription.status}</p>
          <p>Amount: ₹{subscription.amount}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## 🎯 UI/UX Recommendations

### Dashboard Cards:
- **Total Subscriptions**: Display `summary.totalSubscriptions`
- **Active Subscriptions**: Display `summary.activeSubscriptions` with percentage
- **Monthly Revenue**: Display `summary.monthlyRevenue` with currency formatting
- **Growth Indicators**: Compare with previous periods

### Data Table Features:
- **Sortable Columns**: Sort by date, amount, status, user name
- **Filter Dropdowns**: Status (Active/Inactive/Expired), Plan (Monthly/Yearly)
- **Search Bar**: Real-time search by user name or email
- **Pagination Controls**: Page navigation with page size selector
- **Export Options**: CSV/Excel export functionality

### Status Indicators:
- **Active**: Green badge
- **Inactive**: Gray badge  
- **Expired**: Red badge

### Plan Indicators:
- **Monthly Pro**: Blue badge
- **Yearly Pro**: Gold badge

---

## 🔧 Testing

### Test with cURL:
```bash
# Login
curl -X POST http://localhost:3001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eventmarketers.com","password":"admin123"}'

# Get subscriptions (replace TOKEN with actual token)
curl -X GET http://localhost:3001/api/admin/subscriptions \
  -H "Authorization: Bearer TOKEN"

# Get active subscriptions
curl -X GET "http://localhost:3001/api/admin/subscriptions?status=ACTIVE" \
  -H "Authorization: Bearer TOKEN"
```

### Test with Postman:
1. Import the API collection
2. Set base URL to `http://localhost:3001`
3. Login to get admin token
4. Set token in Authorization header
5. Test subscription listing endpoint

---

## 📝 Notes

- **Empty Database**: Currently returns empty array as no subscriptions exist yet
- **Real-time Data**: Data updates when mobile users create subscriptions
- **Performance**: Pagination recommended for large datasets
- **Security**: Admin token expires after 7 days
- **Rate Limiting**: Standard rate limiting applies

---

## 🆘 Support

For technical support or questions about this API:
- Check server logs for detailed error messages
- Verify admin credentials and token validity
- Ensure proper headers are included in requests
- Test with Postman collection for debugging

**Last Updated:** October 6, 2025  
**Version:** 1.0.0
