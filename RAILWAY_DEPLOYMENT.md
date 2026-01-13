# Railway Deployment Guide - Nexus Ecom Management System

## Prerequisites

1. **Railway Account**: Sign up at https://railway.app
2. **MongoDB Atlas Account**: Sign up at https://www.mongodb.com/cloud/atlas
3. **GitHub Repository**: Push your code to GitHub (Railway deploys from Git)

---

## Part 1: Set Up MongoDB Atlas (Free Tier)

### Step 1: Create MongoDB Cluster

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free M0 cluster:
   - Choose **AWS** as provider
   - Select nearest region (e.g., us-east-1)
   - Cluster Name: `nexus-ecom-cluster`
3. Click **Create**

### Step 2: Database Access

1. Go to **Database Access** → **Add New Database User**
2. Authentication Method: **Password**
   - Username: `nexus_admin`
   - Password: Generate secure password (save it!)
   - Database User Privileges: **Read and write to any database**
3. Click **Add User**

### Step 3: Network Access

1. Go to **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (0.0.0.0/0)
   - This is needed for Railway to connect
3. Click **Confirm**

### Step 4: Get Connection String

1. Go to **Database** → **Connect** → **Connect your application**
2. Driver: **Node.js** version **5.5 or later**
3. Copy the connection string:
   ```
   mongodb+srv://nexus_admin:<password>@nexus-ecom-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add database name before `?`:
   ```
   mongodb+srv://nexus_admin:yourpassword@nexus-ecom-cluster.xxxxx.mongodb.net/nexus-ecom?retryWrites=true&w=majority
   ```

---

## Part 2: Push Code to GitHub

### Step 1: Create GitHub Repository

```bash
# Navigate to project directory
cd c:\Users\pc\Desktop\Project_Moeen

# Initialize git (if not already done)
git init

# Create .gitignore file (already exists)
# Make sure it includes:
# node_modules/
# .env
# dist/
# logs/
```

### Step 2: Create GitHub Repo on Web

1. Go to https://github.com/new
2. Repository name: `nexus-ecom-management`
3. Private repository (recommended)
4. Don't initialize with README (you already have code)
5. Click **Create repository**

### Step 3: Push Code

```bash
# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/nexus-ecom-management.git

# Add all files
git add .

# Commit
git commit -m "Initial deployment setup for Railway"

# Push to GitHub
git push -u origin main
```

---

## Part 3: Deploy Backend to Railway

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your GitHub account (if not already connected)
4. Select `nexus-ecom-management` repository
5. Railway will detect multiple services - click **Add Service**

### Step 2: Deploy Backend Service

1. Click **Add Service** → **GitHub Repo**
2. Select your repo → **Deploy Backend**
3. Railway will auto-detect Node.js
4. Settings:
   - **Root Directory**: `/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start`

### Step 3: Configure Backend Environment Variables

In Railway dashboard, go to your backend service → **Variables** → **Add variables**:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database (MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://nexus_admin:yourpassword@nexus-ecom-cluster.xxxxx.mongodb.net/nexus-ecom?retryWrites=true&w=majority

# JWT Configuration (Generate secure secrets)
JWT_SECRET=your-production-jwt-secret-min-32-characters-long
JWT_EXPIRE=30d
JWT_REFRESH_EXPIRE=90d

# AWS S3 (Optional - for screenshot storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=nexus-ecom-screenshots
S3_BUCKET_REGION=us-east-1

# Screenshot Configuration
SCREENSHOT_RETENTION_DAYS=30
SCREENSHOT_MIN_INTERVAL=20
SCREENSHOT_MAX_INTERVAL=30

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Frontend URL (will update after frontend deployment)
FRONTEND_URL=https://your-frontend-url.railway.app

# Logging
LOG_LEVEL=info
```

### Step 4: Get Backend URL

1. Once deployed, Railway provides a public URL
2. Go to **Settings** → **Networking** → **Generate Domain**
3. Your backend URL: `https://your-backend.railway.app`
4. **Save this URL** - you'll need it for frontend

---

## Part 4: Deploy Frontend to Railway

### Step 1: Update Frontend Environment

Before deploying, update frontend to point to your Railway backend:

Edit `frontend/.env.production` (create if doesn't exist):

```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
```

Or update `frontend/src/config/api.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://your-backend.railway.app/api/v1'
    : 'http://localhost:5000/api/v1');
```

### Step 2: Commit and Push Changes

```bash
git add .
git commit -m "Update frontend API URL for production"
git push
```

### Step 3: Deploy Frontend Service

1. In Railway project, click **Add Service** → **GitHub Repo**
2. Select same repo → **Deploy Frontend**
3. Settings:
   - **Root Directory**: `/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`

### Step 4: Configure Frontend Environment

In Railway dashboard, go to frontend service → **Variables**:

```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
```

### Step 5: Get Frontend URL

1. Go to **Settings** → **Networking** → **Generate Domain**
2. Your frontend URL: `https://your-frontend.railway.app`

### Step 6: Update Backend CORS

Go back to **backend service** → **Variables** → Update:

```bash
FRONTEND_URL=https://your-frontend.railway.app
```

Click **Redeploy** on backend service.

---

## Part 5: Seed Demo Data for Client

### Step 1: Connect to MongoDB Atlas

Use MongoDB Compass or mongosh:

```bash
mongosh "mongodb+srv://nexus_admin:yourpassword@nexus-ecom-cluster.xxxxx.mongodb.net/nexus-ecom"
```

### Step 2: Run Seed Script via Railway

Option A - Using Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run seed command on backend service
railway run npm run seed
```

Option B - Create temporary endpoint:

Add to `backend/src/routes/seedRoutes.js`:

```javascript
import express from 'express';
const router = express.Router();

router.post('/initialize-demo', async (req, res) => {
  const { secret } = req.body;

  // Use a secret key to protect this endpoint
  if (secret !== process.env.SEED_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Run seed logic here
  const { seedDatabase } = await import('../scripts/seed.js');
  await seedDatabase();

  res.json({ message: 'Demo data created successfully' });
});

export default router;
```

Then call via Postman or curl:

```bash
curl -X POST https://your-backend.railway.app/api/v1/seed/initialize-demo \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-seed-secret"}'
```

---

## Part 6: Demo Credentials for Client

After seeding, provide these credentials to your client:

### Admin Account
- **Email**: admin@nexusecom.com
- **Password**: Admin@123
- **Role**: Full system access

### Manager Account
- **Email**: manager@nexusecom.com
- **Password**: Manager@123
- **Role**: Team management, reporting

### Employee Account
- **Email**: employee@nexusecom.com
- **Password**: Employee@123
- **Role**: Basic employee features

---

## Part 7: Railway Configuration Tips

### Enable Auto-Deploy from GitHub

1. Go to service **Settings** → **Service**
2. Enable **Auto-Deploy** on branch `main`
3. Every push to main will trigger deployment

### Monitor Logs

1. Go to service → **Deployments** → **View Logs**
2. Monitor for errors during deployment

### Set Up Custom Domain (Optional)

1. Go to **Settings** → **Networking** → **Custom Domain**
2. Add your domain (e.g., app.nexusecom.com)
3. Update DNS records as instructed

### Resource Usage

- **Free Tier**: $5/month credit
- **Backend**: ~$5-8/month
- **Frontend**: ~$5/month
- **Database**: MongoDB Atlas Free (M0)

### Scaling

If app becomes slow:
1. Go to **Settings** → **Resources**
2. Upgrade plan for more memory/CPU

---

## Part 8: Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] MongoDB Atlas connected
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Demo data seeded
- [ ] Admin login working
- [ ] All core features tested:
  - [ ] User authentication
  - [ ] Attendance tracking
  - [ ] Project management
  - [ ] Timesheet submission
  - [ ] Asset management
  - [ ] Expense tracking
  - [ ] Leave management
  - [ ] Announcements
  - [ ] AI Agent
  - [ ] Audit logs
- [ ] Client credentials shared

---

## Troubleshooting

### "Cannot connect to database"
- Verify MongoDB URI is correct
- Check IP whitelist in MongoDB Atlas (should be 0.0.0.0/0)
- Ensure database user has correct privileges

### "CORS errors"
- Verify FRONTEND_URL in backend matches actual frontend URL
- Check cors configuration in backend/src/server.js

### "500 Internal Server Error"
- Check Railway logs: Deployments → View Logs
- Look for missing environment variables
- Verify all dependencies are in package.json

### "Frontend not loading API data"
- Check VITE_API_URL in frontend environment variables
- Verify backend is running and accessible
- Check browser console for CORS errors

---

## Support

For Railway-specific issues:
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

For MongoDB Atlas:
- Docs: https://www.mongodb.com/docs/atlas/
- Support: https://support.mongodb.com

---

## Quick Deploy Commands Summary

```bash
# 1. Push to GitHub
git add .
git commit -m "Deploy to Railway"
git push

# 2. Railway CLI (optional)
npm i -g @railway/cli
railway login
railway link
railway up

# 3. Access your app
echo "Backend: https://your-backend.railway.app"
echo "Frontend: https://your-frontend.railway.app"
```

---

**Your Nexus Ecom Management System is now live and ready for client demonstration!**
