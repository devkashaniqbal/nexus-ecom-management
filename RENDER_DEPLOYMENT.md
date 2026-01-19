# Render Deployment Guide - Nexus Ecom Management System

## Why Render?

✅ **Advantages:**
- Generous free tier (750 hours/month)
- Simpler setup than Railway
- Automatic SSL certificates
- Built-in PostgreSQL/Redis (if needed later)
- No credit card required for free tier
- Better free tier for static sites

⚠️ **Considerations:**
- Free tier services spin down after 15 min of inactivity (cold starts)
- First request after sleep takes ~30 seconds
- Limited to 512MB RAM on free tier

---

## Prerequisites

1. **Render Account**: Sign up at https://render.com
2. **MongoDB Atlas Account**: https://www.mongodb.com/cloud/atlas (FREE)
3. **GitHub Repository**: ✅ Already done! (devkashaniqbal/nexus-ecom-management)

---

## Part 1: Set Up MongoDB Atlas (Same as Railway)

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
3. Click **Confirm**

### Step 4: Get Connection String

1. Go to **Database** → **Connect** → **Connect your application**
2. Copy the connection string:
   ```
   mongodb+srv://nexus_admin:<password>@nexus-ecom-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `<password>` with your actual password
4. Add database name before `?`:
   ```
   mongodb+srv://nexus_admin:yourpassword@nexus-ecom-cluster.xxxxx.mongodb.net/nexus-ecom?retryWrites=true&w=majority
   ```

---

## Part 2: Deploy Backend to Render

### Step 1: Create Web Service

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub account (if not already)
4. Select repository: `devkashaniqbal/nexus-ecom-management`
5. Click **Connect**

### Step 2: Configure Backend Service

Fill in the following settings:

**Basic Settings:**
- **Name**: `nexus-ecom-backend`
- **Region**: Choose closest to you (e.g., Oregon, Frankfurt, Singapore)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run start`

**Instance Type:**
- Select **Free** (or paid if you prefer)

### Step 3: Add Environment Variables

Click **Advanced** → **Add Environment Variable**, then add these:

```bash
# Server Configuration
NODE_ENV=production
PORT=10000
API_VERSION=v1

# Database (MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://nexus_admin:yourpassword@nexus-ecom-cluster.xxxxx.mongodb.net/nexus-ecom?retryWrites=true&w=majority

# JWT Configuration (Generate secure secrets)
JWT_SECRET=your-production-jwt-secret-min-32-characters-long-replace-this
JWT_EXPIRE=30d
JWT_REFRESH_EXPIRE=90d

# AWS S3 (Optional - for screenshot storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
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

# Encryption (Generate 32-character string)
ENCRYPTION_KEY=your-32-character-encryption-key-here-replace

# Frontend URL (will update after frontend deployment)
FRONTEND_URL=https://nexus-ecom-frontend.onrender.com

# Logging
LOG_LEVEL=info
```

**Important Notes:**
- Generate a random 32+ character string for `JWT_SECRET`
- Generate a random 32-character string for `ENCRYPTION_KEY`
- Keep the FRONTEND_URL placeholder for now (we'll update it)

### Step 4: Deploy Backend

1. Click **Create Web Service**
2. Render will start building and deploying
3. Wait 3-5 minutes for deployment to complete
4. You'll get a URL like: `https://nexus-ecom-backend.onrender.com`

### Step 5: Test Backend

Visit: `https://nexus-ecom-backend.onrender.com/health`

You should see:
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2024-01-14T...",
  "environment": "production"
}
```

**✅ Backend Deployed!** Save your backend URL.

---

## Part 3: Deploy Frontend to Render

### Step 1: Create Static Site

1. In Render Dashboard, click **New +** → **Static Site**
2. Select repository: `devkashaniqbal/nexus-ecom-management`
3. Click **Connect**

### Step 2: Configure Frontend Service

Fill in the following settings:

**Basic Settings:**
- **Name**: `nexus-ecom-frontend`
- **Region**: Same as backend (for best performance)
- **Branch**: `main`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

### Step 3: Add Environment Variables

Click **Advanced** → **Add Environment Variable**:

```bash
VITE_API_URL=https://nexus-ecom-backend.onrender.com/api/v1
```

Replace `nexus-ecom-backend.onrender.com` with your actual backend URL.

### Step 4: Deploy Frontend

1. Click **Create Static Site**
2. Render will build and deploy
3. Wait 2-3 minutes
4. You'll get a URL like: `https://nexus-ecom-frontend.onrender.com`

### Step 5: Update Backend CORS

1. Go to **Backend Service** → **Environment**
2. Edit `FRONTEND_URL` variable:
   ```
   FRONTEND_URL=https://nexus-ecom-frontend.onrender.com
   ```
3. Save changes
4. Backend will automatically redeploy

**✅ Frontend Deployed!**

---

## Part 4: Seed Demo Data

### Option 1: Using Render Shell (Easiest)

1. Go to **Backend Service** in Render dashboard
2. Click **Shell** (right side menu)
3. Wait for shell to connect
4. Run:
   ```bash
   npm run seed:demo
   ```
5. Wait for completion (~30 seconds)

### Option 2: Using Render Deploy Hook

Create a one-time seed endpoint:

1. Add to `backend/src/server.js` (temporary):
   ```javascript
   // Temporary seed endpoint - REMOVE AFTER SEEDING!
   app.post('/seed-demo-data', async (req, res) => {
     const { secret } = req.body;
     if (secret !== process.env.SEED_SECRET) {
       return res.status(403).json({ error: 'Unauthorized' });
     }

     try {
       const { default: seedDemo } = await import('./scripts/seed-demo.js');
       await seedDemo();
       res.json({ message: 'Demo data seeded successfully' });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

2. Add environment variable to backend:
   ```
   SEED_SECRET=your-random-secret-key
   ```

3. Push to GitHub:
   ```bash
   git add .
   git commit -m "Add seed endpoint"
   git push
   ```

4. After deployment, call the endpoint:
   ```bash
   curl -X POST https://nexus-ecom-backend.onrender.com/seed-demo-data \
     -H "Content-Type: application/json" \
     -d '{"secret":"your-random-secret-key"}'
   ```

5. **IMPORTANT**: Remove the seed endpoint code after seeding!

### Option 3: Local MongoDB Connection

1. Use MongoDB Compass with Atlas connection string
2. Run locally:
   ```bash
   cd backend
   MONGODB_URI="your-atlas-connection-string" npm run seed:demo
   ```

---

## Part 5: Demo Credentials

After seeding, share these with your client:

### Admin Account (Full Access)
```
Email: admin@nexusecom.com
Password: Admin@123
```

### Manager Account (Team Management)
```
Email: manager@nexusecom.com
Password: Manager@123
```

### Employee Account (Standard User)
```
Email: sarah@nexusecom.com
Password: Employee@123
```

---

## Part 6: Configure Custom Domain (Optional)

### For Frontend:

1. Go to **Frontend Service** → **Settings**
2. Scroll to **Custom Domain**
3. Click **Add Custom Domain**
4. Enter your domain: `app.nexusecom.com`
5. Add CNAME record to your DNS:
   ```
   Type: CNAME
   Name: app
   Value: nexus-ecom-frontend.onrender.com
   ```
6. Wait for DNS propagation (~5-30 min)
7. Render automatically provisions SSL certificate

### For Backend:

1. Go to **Backend Service** → **Settings**
2. Add custom domain: `api.nexusecom.com`
3. Add CNAME record to DNS
4. Update frontend's `VITE_API_URL`:
   ```
   VITE_API_URL=https://api.nexusecom.com/api/v1
   ```

---

## Part 7: Important Render Free Tier Info

### ⚠️ Cold Starts

**What happens:**
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes 30-50 seconds to wake up
- Subsequent requests are fast

**Solutions:**

1. **Keep Service Awake (External Ping)**

   Create a free account at https://cron-job.org or https://uptimerobot.com

   Set up a ping to your backend every 10 minutes:
   ```
   https://nexus-ecom-backend.onrender.com/health
   ```

2. **Upgrade to Paid Plan** ($7/month)
   - No cold starts
   - More memory (512MB → 2GB+)
   - Better performance

3. **Client Expectation**
   - Inform client about initial load time on free tier
   - Mention it's demo/staging setup
   - Production would use paid tier

### 📊 Free Tier Limits

- **Web Services**: 750 hours/month free (enough for 1 service 24/7)
- **Static Sites**: Unlimited bandwidth
- **Build Minutes**: 500 minutes/month
- **Bandwidth**: 100 GB/month

---

## Part 8: Auto-Deploy from GitHub

**Already Enabled by Default!**

Every time you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push
```

Render automatically:
1. Detects the push
2. Builds your code
3. Deploys the update
4. Takes ~2-5 minutes

---

## Part 9: Monitoring & Logs

### View Logs

1. Go to service → **Logs** tab
2. Real-time log streaming
3. Filter by log level
4. Download logs

### Metrics

1. Go to service → **Metrics** tab
2. See:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

### Alerts (Paid plans)

Set up alerts for:
- Service downtime
- High CPU usage
- Error rate spikes

---

## Part 10: Cost Comparison

### Free Tier (Demo/Staging)
- Backend: FREE (with cold starts)
- Frontend: FREE
- MongoDB: FREE (Atlas M0)
- **Total: $0/month**

### Paid Tier (Production)
- Backend: $7/month (Starter)
- Frontend: FREE
- MongoDB: FREE or $9/month (M2)
- **Total: $7-16/month**

### Render vs Railway

| Feature | Render Free | Railway Free |
|---------|-------------|--------------|
| Monthly Cost | $0 | $5 credit (~$0) |
| Backend | 750 hrs (cold starts) | Always on (until credit used) |
| Frontend | Unlimited | Separate service |
| Build Time | Fast | Fast |
| Setup Difficulty | Easy | Moderate |
| Cold Starts | Yes (15 min) | No |
| Best For | Demo/Staging | Production |

---

## Troubleshooting

### "Service failed to build"
- Check build logs for errors
- Verify `package.json` has all dependencies
- Ensure `Root Directory` is set correctly

### "Cannot connect to database"
- Verify MongoDB URI in environment variables
- Check Atlas IP whitelist (0.0.0.0/0)
- Ensure database user has correct permissions

### "CORS errors"
- Verify `FRONTEND_URL` in backend matches actual URL
- Check frontend `VITE_API_URL` points to correct backend
- Ensure both services are deployed successfully

### "Service keeps sleeping"
- Expected on free tier after 15 min inactivity
- Set up external ping service (UptimeRobot)
- Or upgrade to paid plan ($7/month)

### "Build takes too long"
- Render free tier has slower build machines
- Consider upgrading for faster builds
- Optimize dependencies if possible

---

## Quick Deploy Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user with password created
- [ ] Network access set to 0.0.0.0/0
- [ ] Connection string ready
- [ ] Backend service created on Render
- [ ] Backend environment variables set
- [ ] Backend deployed successfully
- [ ] Backend health check working
- [ ] Frontend service created
- [ ] Frontend environment variables set
- [ ] Frontend deployed successfully
- [ ] Backend CORS updated with frontend URL
- [ ] Demo data seeded
- [ ] All three demo accounts tested

---

## Post-Deployment

### Test Everything

1. **Backend Health**: `https://your-backend.onrender.com/health`
2. **Frontend**: `https://your-frontend.onrender.com`
3. **Login**: Test all three demo accounts
4. **Features**: Test key features from CLIENT_DEMO_GUIDE.md

### Share with Client

```
🎉 Nexus Ecom Management System - Demo Environment

Frontend: https://your-frontend.onrender.com

Demo Credentials:

ADMIN:
Email: admin@nexusecom.com
Password: Admin@123

MANAGER:
Email: manager@nexusecom.com
Password: Manager@123

EMPLOYEE:
Email: sarah@nexusecom.com
Password: Employee@123

Note: First load may take 30 seconds (free tier cold start).
Subsequent visits are instant!
```

---

## Support Resources

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Status Page**: https://status.render.com
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/

---

## Upgrade Path

When client wants production deployment:

1. **Backend**: Upgrade to Starter ($7/month)
   - No cold starts
   - 512MB → 2GB RAM
   - Better CPU

2. **Database**: Keep Atlas Free or upgrade to M2 ($9/month)
   - More storage
   - Backups
   - Better performance

3. **Custom Domain**: Add professional domain
   - app.yourclientdomain.com
   - Free SSL included

4. **Monitoring**: Enable Render alerts
   - Downtime notifications
   - Performance tracking

---

**🎉 Your Nexus Ecom Management System is now live on Render!**

**Deployment Time**: ~20-25 minutes
**Cost**: $0 (Free tier)
**Cold Start**: ~30 seconds (first request after sleep)
**Perfect for**: Client demos and staging

---

## Quick Commands Summary

```bash
# Already done - Code on GitHub ✅
# No CLI installation needed for Render! 🎉

# Seed data via Render Shell:
npm run seed:demo

# Check backend health:
curl https://your-backend.onrender.com/health

# View logs:
# Use Render Dashboard → Logs tab
```

**Ready to impress your client!** 🚀
