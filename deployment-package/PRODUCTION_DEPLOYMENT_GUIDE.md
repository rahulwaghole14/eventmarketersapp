# 🚀 EventMarketers Backend - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ **Files Ready for Deployment:**
- `deployment_server.js` - Main production server
- `package.json` - Updated with deployment server as entry point
- `prisma/schema.prisma` - Database schema
- `prisma/dev.db` - SQLite database (will be created if not exists)
- `DEPLOYMENT_README.md` - Detailed documentation
- `test_deployment_server.js` - Test suite

### ✅ **APIs Tested and Working:**
- Health Check API
- Mobile Home Statistics
- Mobile Templates API
- Mobile Greetings API
- Mobile Posters API
- Mobile User Registration/Login
- **Mobile Subscription Status API** (your requested endpoint)

## 🌐 **Deployment Options**

### Option 1: Cloud Platform Deployment (Recommended)

#### **Render.com Deployment:**
1. **Create Account:** Go to [render.com](https://render.com) and sign up
2. **Connect Repository:** Connect your GitHub repository
3. **Create Web Service:**
   - **Name:** `eventmarketers-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npx prisma generate && npx prisma db push`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     ```
     NODE_ENV=production
     PORT=3001
     DATABASE_URL=file:./prisma/dev.db
     ```

#### **Heroku Deployment:**
1. **Install Heroku CLI**
2. **Login:** `heroku login`
3. **Create App:** `heroku create eventmarketers-backend`
4. **Set Environment Variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DATABASE_URL=file:./prisma/dev.db
   ```
5. **Deploy:** `git push heroku main`

#### **Railway Deployment:**
1. **Go to [railway.app](https://railway.app)**
2. **Connect GitHub Repository**
3. **Configure:**
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
   - **Environment:** Node.js

#### **Vercel Deployment:**
1. **Go to [vercel.com](https://vercel.com)**
2. **Import Git Repository**
3. **Configure:**
   - **Framework Preset:** Other
   - **Build Command:** `npm install && npx prisma generate`
   - **Output Directory:** `./`
   - **Install Command:** `npm install`

### Option 2: VPS/Server Deployment

#### **DigitalOcean/AWS/GCP VPS:**
1. **Create Droplet/Instance** (Ubuntu 20.04+)
2. **SSH into server:**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PM2 (Process Manager):**
   ```bash
   sudo npm install -g pm2
   ```

5. **Clone Repository:**
   ```bash
   git clone https://github.com/yourusername/eventmarketers-backend.git
   cd eventmarketers-backend
   ```

6. **Install Dependencies:**
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```

7. **Start with PM2:**
   ```bash
   pm2 start deployment_server.js --name "eventmarketers-backend"
   pm2 startup
   pm2 save
   ```

8. **Setup Nginx (Reverse Proxy):**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/eventmarketers-backend
   ```
   
   Nginx Configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 3: Docker Deployment

#### **Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY deployment_server.js ./
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start server
CMD ["npm", "start"]
```

#### **Docker Commands:**
```bash
# Build image
docker build -t eventmarketers-backend .

# Run container
docker run -d \
  --name eventmarketers-backend \
  -p 3001:3001 \
  -e NODE_ENV=production \
  eventmarketers-backend

# Check logs
docker logs eventmarketers-backend

# Stop container
docker stop eventmarketers-backend
```

## 🔧 **Environment Configuration**

### **Required Environment Variables:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=file:./prisma/dev.db
```

### **Optional Environment Variables:**
```env
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
MAX_REQUEST_SIZE=50mb
```

## 📊 **Post-Deployment Verification**

### **1. Health Check:**
```bash
curl https://your-domain.com/health
```

Expected Response:
```json
{
  "success": true,
  "message": "EventMarketers Backend Server is running",
  "timestamp": "2024-01-30T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### **2. Test Mobile APIs:**
```bash
# Test subscription status endpoint
curl "https://your-domain.com/api/mobile/subscriptions/status?userId=test_user_id"

# Test home stats
curl "https://your-domain.com/api/mobile/home/stats"

# Test templates
curl "https://your-domain.com/api/mobile/templates"
```

### **3. Run Full Test Suite:**
```bash
# Update test file with your production URL
sed -i 's/localhost:3001/your-domain.com/g' test_deployment_server.js
node test_deployment_server.js
```

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Database Connection Error:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

2. **Port Already in Use:**
   ```bash
   # Find process using port 3001
   lsof -i :3001
   # Kill process
   kill -9 <PID>
   ```

3. **Permission Errors:**
   ```bash
   chmod +x deployment_server.js
   sudo chown -R $USER:$USER .
   ```

4. **Memory Issues:**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

## 📈 **Monitoring & Maintenance**

### **Health Monitoring:**
```bash
# Check server status
curl https://your-domain.com/health

# Check logs
pm2 logs eventmarketers-backend
# or
docker logs eventmarketers-backend
```

### **Performance Monitoring:**
- Set up monitoring with tools like New Relic, DataDog, or built-in PM2 monitoring
- Monitor database performance
- Set up alerts for downtime

### **Backup Strategy:**
```bash
# Backup database
cp prisma/dev.db backup/dev-$(date +%Y%m%d).db

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
cp prisma/dev.db backup/dev-$DATE.db
find backup/ -name "*.db" -mtime +7 -delete
```

## 🔒 **Security Considerations**

1. **Environment Variables:** Never commit `.env` files
2. **Database Security:** Use proper file permissions for SQLite
3. **CORS Configuration:** Restrict to your domain only
4. **Rate Limiting:** Consider adding rate limiting for production
5. **SSL/HTTPS:** Always use HTTPS in production
6. **Firewall:** Configure firewall rules appropriately

## 📞 **Support & Maintenance**

### **Regular Maintenance Tasks:**
- Monitor server performance
- Check database size and optimize if needed
- Update dependencies regularly
- Monitor error logs
- Backup database regularly

### **Emergency Procedures:**
1. **Server Down:** Check PM2/Docker status, restart if needed
2. **Database Issues:** Restore from backup
3. **High Memory Usage:** Restart application, check for memory leaks

---

## 🎉 **Ready for Production!**

Your EventMarketers Backend is now ready for production deployment with:
- ✅ All mobile APIs working
- ✅ Subscription status endpoint functional
- ✅ Comprehensive testing completed
- ✅ Production-ready configuration
- ✅ Monitoring and maintenance procedures

Choose your preferred deployment option above and follow the steps to get your backend live in production!
