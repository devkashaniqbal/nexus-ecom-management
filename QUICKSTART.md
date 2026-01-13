# 🚀 Quick Start Guide

Get the system up and running in 10 minutes!

## Prerequisites

Before starting, make sure you have:
- ✅ Node.js 18+ installed
- ✅ MongoDB installed and running
- ✅ Git installed

## Step 1: Clone & Setup (2 min)

```bash
# Navigate to project
cd c:\Users\pc\Desktop\Project_Moeen

# Create necessary directories
mkdir -p backend/logs
```

## Step 2: Backend Setup (3 min)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env
```

**Edit `backend/.env`** with these minimal settings:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/company-mgmt
JWT_SECRET=my-super-secret-key-for-development-only
JWT_EXPIRE=30d

# AWS (Optional for testing - skip screenshot upload)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=skip-for-now
AWS_SECRET_ACCESS_KEY=skip-for-now
S3_BUCKET_NAME=company-screenshots

SCREENSHOT_RETENTION_DAYS=30
ENCRYPTION_KEY=12345678901234567890123456789012

FRONTEND_URL=http://localhost:5173
ENABLE_IP_RESTRICTION=false
```

```bash
# Seed database with test users
npm run seed

# Start backend server
npm run dev
```

✅ Backend running at: **http://localhost:5000**

Test it: Open http://localhost:5000/health in your browser

## Step 3: Frontend Setup (3 min)

Open a **new terminal**:

```bash
# Navigate to frontend
cd c:\Users\pc\Desktop\Project_Moeen\frontend

# Install dependencies
npm install

# Create .env file
copy .env.example .env
```

**Edit `frontend/.env`**:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Company Management System
VITE_SCREENSHOT_ENABLED=false
```

```bash
# Start frontend
npm run dev
```

✅ Frontend running at: **http://localhost:5173**

## Step 4: Test the System (2 min)

1. **Open browser**: http://localhost:5173

2. **Login with test accounts**:

   **Admin Account:**
   ```
   Email: admin@company.com
   Password: Admin@123
   ```

   **Manager Account:**
   ```
   Email: manager@company.com
   Password: Manager@123
   ```

   **Employee Account:**
   ```
   Email: employee@company.com
   Password: Employee@123
   ```

3. **Test features**:
   - ✅ Check dashboard stats
   - ✅ Click "Check In" on Attendance page
   - ✅ Start/End a break
   - ✅ Create a project
   - ✅ Submit an expense
   - ✅ Apply for leave

## Step 5: Electron App (Optional)

If you want to test the screenshot monitoring:

Open a **new terminal**:

```bash
# Navigate to electron
cd c:\Users\pc\Desktop\Project_Moeen\electron

# Install dependencies
npm install

# Create .env file
copy .env.example .env
```

**Edit `electron/.env`**:

```env
API_URL=http://localhost:5000/api/v1
SCREENSHOT_MIN_INTERVAL=1
SCREENSHOT_MAX_INTERVAL=2
BLUR_LEVEL=5
COMPRESSION_QUALITY=70
```

```bash
# Start electron app
npm run dev
```

Login with employee credentials to test screenshot capture.

---

## 🎯 What You Can Test

### As Admin (admin@company.com)
- View all users
- View all attendance records
- Manage projects
- Approve timesheets
- Approve expenses
- Approve leaves
- Create announcements
- View all screenshots

### As Manager (manager@company.com)
- View team attendance
- Manage projects
- Approve team timesheets
- Approve team expenses
- Approve team leaves
- View team screenshots

### As Employee (employee@company.com)
- Check-in/Check-out
- Take breaks
- Apply for leaves
- Submit expenses
- Log timesheets
- View own attendance
- View own screenshots

---

## 🔧 Troubleshooting

### Backend won't start

**Check MongoDB is running:**
```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**Check if port 5000 is free:**
```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -ti:5000
```

### Frontend shows API errors

1. Make sure backend is running
2. Check `frontend/.env` has correct API URL
3. Check browser console for errors
4. Verify CORS is enabled in backend

### MongoDB connection failed

Update `MONGODB_URI` in `backend/.env`:
```env
# For local MongoDB without auth
MONGODB_URI=mongodb://localhost:27017/company-mgmt

# For local MongoDB with auth
MONGODB_URI=mongodb://username:password@localhost:27017/company-mgmt

# For MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/company-mgmt
```

### Screenshots not uploading

For development testing without AWS:
1. Comment out screenshot upload in backend
2. Or set up AWS S3 bucket (see SETUP.md)
3. Or use local file storage (modify code)

---

## 📁 Project Structure

```
Project_Moeen/
├── backend/          # Express API
│   ├── src/
│   │   ├── models/   # MongoDB schemas
│   │   ├── routes/   # API routes
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── services/
│   └── package.json
│
├── frontend/         # React app
│   ├── src/
│   │   ├── pages/    # Page components
│   │   ├── components/
│   │   ├── services/ # API calls
│   │   └── context/  # Auth context
│   └── package.json
│
├── electron/         # Desktop app
│   ├── main/         # Electron main
│   ├── preload/
│   └── renderer/
│
└── docs/            # Documentation
    ├── SETUP.md
    ├── DEPLOYMENT.md
    └── API.md
```

---

## 🎉 Success!

You should now have:
- ✅ Backend API running
- ✅ Frontend web app running
- ✅ Test users created
- ✅ Able to login and test features

## 📚 Next Steps

1. **Explore Features**: Test all modules
2. **Read Documentation**: Check `docs/` folder
3. **Customize**: Add your company details
4. **Deploy**: Follow `docs/DEPLOYMENT.md`

## 💡 Development Tips

**Hot Reload:**
- Backend: Changes auto-reload with nodemon
- Frontend: Changes appear instantly with Vite HMR

**Debugging:**
- Backend logs: `backend/logs/combined.log`
- Frontend: Browser DevTools (F12)
- API calls: Network tab in DevTools

**Database GUI:**
- MongoDB Compass: https://www.mongodb.com/products/compass
- Connect to: `mongodb://localhost:27017`

---

## 🆘 Need Help?

- Check [SETUP.md](docs/SETUP.md) for detailed setup
- Check [API.md](docs/API.md) for API documentation
- Check [DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment
- Review error logs in `backend/logs/`

Happy coding! 🚀
