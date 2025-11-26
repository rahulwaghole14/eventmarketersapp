# 🚀 EventMarketers Customer Management API Collection

## 📋 **Overview**
This Postman collection provides complete access to the EventMarketers Customer Management APIs. It includes all CRUD operations for customer management, business profile handling, and subscription management.

---

## 📁 **Files Included**

### **1. Collection File**
- **`EventMarketers_Customer_Management_API_Collection.postman_collection.json`**
  - Complete API collection with all customer management endpoints
  - Pre-configured requests with examples
  - Auto-token management
  - Test scripts for response validation

### **2. Environment File**
- **`EventMarketers_Customer_API_Environment.postman_environment.json`**
  - Pre-configured environment variables
  - Admin credentials
  - Test data variables
  - Local/Production URL switching

### **3. Documentation**
- **`CUSTOMER_API_COLLECTION_README.md`** (this file)
- **`WEB_APP_CUSTOMER_API_DOCUMENTATION.md`** (detailed API docs)

---

## 🚀 **Quick Start Guide**

### **Step 1: Import Collection**
1. Open Postman
2. Click **Import** button
3. Select **`EventMarketers_Customer_Management_API_Collection.postman_collection.json`**
4. Click **Import**

### **Step 2: Import Environment**
1. Click **Import** button again
2. Select **`EventMarketers_Customer_API_Environment.postman_environment.json`**
3. Click **Import**

### **Step 3: Select Environment**
1. Click the environment dropdown (top-right)
2. Select **"EventMarketers - Customer API Environment"**

### **Step 4: Test the APIs**
1. Run **"Admin Login"** request first
2. The token will be automatically saved
3. Run any customer management request

---

## 🔧 **Environment Variables**

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `base_url` | Production API URL | `https://eventmarketersbackend.onrender.com` |
| `local_url` | Local development URL | `http://localhost:3001` |
| `use_local` | Switch to local server | `false` |
| `admin_email` | Admin login email | `admin@eventmarketers.com` |
| `admin_password` | Admin login password | `Admin123!@#` |
| `admin_token` | Auto-populated JWT token | (empty) |
| `customer_id` | Auto-populated customer ID | (empty) |
| `test_customer_email` | Test customer email | `test.customer@example.com` |
| `test_customer_name` | Test customer name | `Test Customer` |
| `test_business_name` | Test business name | `Test Business` |
| `subscription_amount` | Default subscription amount | `299.99` |
| `subscription_plan` | Default subscription plan | `YEARLY` |
| `payment_method` | Default payment method | `CREDIT_CARD` |

---

## 📚 **API Endpoints Included**

### **🔐 Authentication**
- **Admin Login** - Get authentication token

### **👥 Customer Management**
- **Create Customer (Minimal)** - Create with name and email only
- **Create Customer (Complete)** - Create with full business profile and subscription
- **Get All Customers** - List all customers with pagination
- **Search Customers** - Search and filter customers
- **Get Customer by ID** - Get specific customer details
- **Update Customer** - Update customer information
- **Delete Customer** - Soft delete (deactivate) customer

### **🔍 Advanced Queries**
- **Get Active Customers Only** - Filter by active subscription status
- **Get Inactive Customers Only** - Filter by inactive subscription status
- **Search by Business Category** - Filter by business category
- **Search by Name or Email** - Text search across customer fields

### **📊 Analytics & Reports**
- **Get Customer Statistics** - Get customer count and statistics

---

## 🎯 **Usage Examples**

### **1. Create a New Customer**
```bash
# Run "Create Customer (Complete)" request
# The customer_id will be automatically saved for future requests
```

### **2. Search for Customers**
```bash
# Run "Search Customers" request
# Modify the search parameter to find specific customers
```

### **3. Update Customer Information**
```bash
# Run "Update Customer" request
# The customer_id from previous creation will be used automatically
```

### **4. Get Customer Statistics**
```bash
# Run "Get Customer Statistics" request
# Check the pagination.total field for total customer count
```

---

## 🔄 **Auto-Features**

### **Token Management**
- Admin token is automatically saved after login
- All subsequent requests use the saved token
- No manual token copying required

### **Customer ID Tracking**
- Customer ID is automatically saved after creation
- Update and delete requests use the saved customer ID
- Easy testing workflow

### **Environment Switching**
- Toggle between local and production servers
- Set `use_local` to `true` for local development
- Automatic URL switching

---

## 🧪 **Testing Workflow**

### **Complete Test Sequence:**
1. **Admin Login** → Get authentication token
2. **Create Customer (Complete)** → Create test customer with subscription
3. **Get All Customers** → Verify customer appears in list
4. **Get Customer by ID** → Verify customer details
5. **Update Customer** → Modify customer information
6. **Search Customers** → Test search functionality
7. **Delete Customer** → Soft delete customer

### **Quick Test Sequence:**
1. **Admin Login** → Get token
2. **Create Customer (Minimal)** → Quick customer creation
3. **Get All Customers** → Verify creation

---

## 🚨 **Error Handling**

### **Common Error Responses:**
- **401 Unauthorized** - Invalid or expired token
- **400 Bad Request** - Validation errors
- **409 Conflict** - Email already exists
- **404 Not Found** - Customer not found
- **500 Internal Server Error** - Server error

### **Troubleshooting:**
1. **Token Issues** - Re-run "Admin Login" request
2. **Validation Errors** - Check request body format
3. **Customer Not Found** - Verify customer_id is correct
4. **Server Errors** - Check server status and logs

---

## 🔧 **Customization**

### **Adding New Requests:**
1. Right-click on collection
2. Select "Add Request"
3. Configure request details
4. Use environment variables for dynamic values

### **Modifying Test Data:**
1. Update environment variables
2. Modify request bodies
3. Add new test scenarios

### **Adding New Environments:**
1. Create new environment file
2. Import into Postman
3. Switch between environments as needed

---

## 📊 **Response Examples**

### **Successful Customer Creation:**
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "customer": {
      "id": "cmg0i34y500022s12acb4qjc9",
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "businessName": "Jane's Event Planning",
      "subscriptionStatus": "ACTIVE",
      "subscriptionAmount": 299.99
    },
    "subscription": {
      "id": "cmg0i36l700042s12sdlncd2z",
      "plan": "YEARLY",
      "status": "ACTIVE",
      "amount": 299.99
    }
  }
}
```

### **Customer List with Pagination:**
```json
{
  "success": true,
  "message": "Customers fetched successfully",
  "data": {
    "customers": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

## 🎉 **Success!**

The EventMarketers Customer Management API Collection is now ready for use! 

**Key Features:**
- ✅ Complete CRUD operations
- ✅ Auto-token management
- ✅ Environment switching
- ✅ Pre-configured test data
- ✅ Comprehensive error handling
- ✅ Ready for frontend integration

**Next Steps:**
1. Import the collection and environment
2. Test all endpoints
3. Integrate with your frontend application
4. Customize as needed for your use case

**Happy Testing!** 🚀
