# Quick Start Guide - Railway Deployment

## 🚀 Deploy in 5 Steps

### Step 1: MongoDB Atlas Setup (5 minutes)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create FREE cluster (M0 tier)
3. Create database user with password
4. Network Access: Allow 0.0.0.0/0
5. Copy connection string

**Connection String Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/nexus-ecom?retryWrites=true&w=majority
```

---

### Step 2: Push to GitHub (2 minutes)
```bash
cd c:\Users\pc\Desktop\Project_Moeen
git init
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/YOUR_USERNAME/nexus-ecom-management.git
git push -u origin main
```

---

### Step 3: Deploy Backend (10 minutes)

1. **Go to Railway**: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. **Select your repository**
4. **Add Service** → Select backend folder
5. **Settings** → Root Directory: `/backend`
6. **Variables** → Add these:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<generate-random-32-char-string>
JWT_EXPIRE=30d
FRONTEND_URL=<will-update-after-frontend-deployment>
ENCRYPTION_KEY=<generate-random-32-char-string>
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

7. **Settings** → **Networking** → **Generate Domain**
8. **Save backend URL** → `https://your-backend.railway.app`

---

### Step 4: Deploy Frontend (5 minutes)

1. **Same Railway Project** → **Add Service**
2. **Select your repository** again
3. **Add Service** → Select frontend folder
4. **Settings** → Root Directory: `/frontend`
5. **Variables** → Add this:

```env
VITE_API_URL=https://your-backend.railway.app/api/v1
```

6. **Settings** → **Networking** → **Generate Domain**
7. **Save frontend URL** → `https://your-frontend.railway.app`

---

### Step 5: Final Configuration (3 minutes)

1. **Go back to Backend service**
2. **Variables** → Update:
   ```
   FRONTEND_URL=https://your-frontend.railway.app
   ```
3. **Click "Redeploy"** (important for CORS!)
4. **Wait for deployment** to complete

---

## 🌱 Seed Demo Data

### Option 1: Using Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Seed demo data
cd backend
railway run npm run seed:demo
```

### Option 2: Using Script (Windows)
```bash
# Run the automated setup script
.\railway-setup.bat
```

### Option 3: Using Script (Mac/Linux)
```bash
# Make script executable
chmod +x railway-setup.sh

# Run the script
./railway-setup.sh
```

---

## ✅ Verify Deployment

1. **Check Backend Health:**
   ```
   https://your-backend.railway.app/health
   ```
   Should return:
   ```json
   {
     "status": "success",
     "message": "Server is running"
   }
   ```

2. **Open Frontend:**
   ```
   https://your-frontend.railway.app
   ```

3. **Login with Demo Account:**
   ```
   Email: admin@nexusecom.com
   Password: Admin@123
   ```

---

## 🔐 Demo Credentials

### Admin (Full Access)
- **Email**: admin@nexusecom.com
- **Password**: Admin@123

### Manager (Team Management)
- **Email**: manager@nexusecom.com
- **Password**: Manager@123

### Employee (Standard User)
- **Email**: sarah@nexusecom.com
- **Password**: Employee@123

---

## 🐛 Troubleshooting

### "Cannot connect to database"
- ✅ Verify MongoDB URI is correct
- ✅ Check IP whitelist is 0.0.0.0/0
- ✅ Ensure database user has read/write permissions

### "CORS errors in browser"
- ✅ Verify FRONTEND_URL in backend variables
- ✅ Make sure you redeployed backend after updating
- ✅ Check both URLs are https://

### "404 Not Found"
- ✅ Check root directory is set correctly (/backend or /frontend)
- ✅ Verify build completed successfully in logs
- ✅ Make sure domain is generated in Networking settings

### "500 Internal Server Error"
- ✅ Check Railway logs for specific error
- ✅ Verify all required environment variables are set
- ✅ Check MongoDB connection is working

---

## 📊 What Gets Deployed

### Backend Service
- Node.js Express API
- MongoDB connection
- JWT authentication
- Audit logging system
- All API endpoints

### Frontend Service
- React + Vite app
- Tailwind CSS styling
- Responsive UI
- Role-based routing

---

## 💰 Cost Estimate

- **Railway**: Free tier ($5 credit/month)
  - Backend: ~$5-7/month (exceeds free tier)
  - Frontend: ~$5/month
- **MongoDB Atlas**: FREE (M0 tier)
- **Total**: ~$10-12/month (after free credits)

### Cost Optimization Tips:
- Use Railway's $5 free credit
- Keep MongoDB on free M0 tier
- Scale up only when needed

---

## 🔄 Auto-Deploy Setup

1. **Go to service Settings**
2. **Enable "Auto Deploy"** on main branch
3. Every `git push` triggers automatic deployment

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push

# Railway automatically deploys! 🎉
```

---

## 📱 Next Steps After Deployment

1. ✅ Test all features with demo accounts
2. ✅ Review CLIENT_DEMO_GUIDE.md for presentation tips
3. ✅ Share URLs and credentials with client
4. ✅ Monitor Railway dashboard for logs
5. ✅ Set up custom domain (optional)

---

## 📖 Additional Resources

- **Full Deployment Guide**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Client Demo Guide**: [CLIENT_DEMO_GUIDE.md](./CLIENT_DEMO_GUIDE.md)
- **Railway Docs**: https://docs.railway.app
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/

---

## 🆘 Need Help?

### Railway Support
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app
- Status: https://status.railway.app

### MongoDB Support
- Docs: https://www.mongodb.com/docs/atlas/
- Community: https://www.mongodb.com/community/forums/

---

## 🎯 Pre-Demo Checklist

Before showing to client:

- [ ] Both frontend and backend deployed
- [ ] Health check endpoint working
- [ ] Demo data seeded
- [ ] Admin login working
- [ ] Manager login working
- [ ] Employee login working
- [ ] Attendance feature tested
- [ ] Project management tested
- [ ] Timesheet submission tested
- [ ] Asset management tested
- [ ] Expense approval flow tested
- [ ] Leave request tested
- [ ] Announcements visible
- [ ] AI Agent responding
- [ ] Audit logs accessible

---

**🎉 You're ready to impress your client!**

**Time to Deploy**: ~25 minutes total
**Demo Time**: 15-20 minutes
**Client Wow Factor**: 💯

Good luck with your presentation! 🚀
