# MongoDB Setup Guide for Windows

Complete step-by-step guide to install and configure MongoDB on Windows.

---

## Option 1: MongoDB Community Server (Recommended for Development)

### Step 1: Download MongoDB

1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - **Version**: 7.0.x (Current)
   - **Platform**: Windows
   - **Package**: MSI
3. Click **Download**

### Step 2: Install MongoDB

1. Run the downloaded `.msi` file
2. Click **Next** on the welcome screen
3. Accept the license agreement
4. Choose **Complete** installation
5. **Install MongoDB as a Service** (IMPORTANT: Keep this checked!)
   - Service Name: `MongoDB`
   - Data Directory: `C:\Program Files\MongoDB\Server\7.0\data\`
   - Log Directory: `C:\Program Files\MongoDB\Server\7.0\log\`
6. **Install MongoDB Compass** (Optional but recommended - it's a GUI tool)
7. Click **Install**
8. Wait for installation to complete
9. Click **Finish**

### Step 3: Verify MongoDB is Running

Open **Command Prompt** (cmd) or **PowerShell**:

```bash
# Check if MongoDB service is running
sc query MongoDB
```

You should see:
```
STATE              : 4  RUNNING
```

If it says **STOPPED**, start it:

```bash
net start MongoDB
```

### Step 4: Test MongoDB Connection

```bash
# Open MongoDB Shell
mongosh
```

You should see:
```
Current Mongosh Log ID: ...
Connecting to: mongodb://127.0.0.1:27017/
Using MongoDB: 7.0.x
```

Type `exit` to quit the shell.

✅ **MongoDB is now installed and running!**

---

## Option 2: MongoDB Atlas (Free Cloud Database)

If you prefer not to install locally, use MongoDB Atlas:

### Step 1: Create Account

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google
3. Complete registration

### Step 2: Create Cluster

1. Click **Build a Database**
2. Choose **M0 FREE** tier
3. Select **AWS** as provider
4. Choose region closest to you (e.g., US East)
5. Click **Create**
6. Wait 1-3 minutes for cluster creation

### Step 3: Create Database User

1. Click **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Username: `companyAdmin`
5. Password: Generate or create a strong password (SAVE THIS!)
6. Database User Privileges: **Atlas Admin**
7. Click **Add User**

### Step 4: Configure Network Access

1. Click **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for development)
4. Click **Confirm**

### Step 5: Get Connection String

1. Click **Database** (left sidebar)
2. Click **Connect** on your cluster
3. Click **Connect your application**
4. Copy the connection string:
```
mongodb+srv://companyAdmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
5. Replace `<password>` with your actual password

✅ **MongoDB Atlas is ready!**

---

## Complete Setup Steps for the Project

Now let's set up the entire system step by step.

---

## Step 1: Verify Prerequisites

Open **Command Prompt** or **PowerShell** and run:

```bash
# Check Node.js (must be 18+)
node --version

# Check npm
npm --version

# Check MongoDB (if using local)
mongosh --version
```

**If Node.js is not installed:**
1. Download from: https://nodejs.org/ (LTS version)
2. Install with default settings
3. Restart your terminal
4. Verify: `node --version`

---

## Step 2: Configure Backend Environment

```bash
# Navigate to backend folder
cd c:\Users\pc\Desktop\Project_Moeen\backend

# Create .env file from example
copy .env.example .env
```

Now **edit** the `backend\.env` file. Right-click on it and open with Notepad or VS Code.

### If using LOCAL MongoDB:

```env
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Local MongoDB (default)
MONGODB_URI=mongodb://localhost:27017/company-mgmt

# JWT Configuration
JWT_SECRET=my-super-secret-development-key-change-in-production
JWT_EXPIRE=30d
JWT_REFRESH_EXPIRE=90d

# AWS Configuration (Skip for now - not needed for testing)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test-key
AWS_SECRET_ACCESS_KEY=test-secret
S3_BUCKET_NAME=company-screenshots-test
S3_BUCKET_REGION=us-east-1

# Screenshot Configuration
SCREENSHOT_RETENTION_DAYS=30
SCREENSHOT_MIN_INTERVAL=20
SCREENSHOT_MAX_INTERVAL=30

# Security
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
ENABLE_IP_RESTRICTION=false
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Encryption (for credentials vault)
ENCRYPTION_KEY=12345678901234567890123456789012

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=info
```

### If using MongoDB Atlas:

Change only the `MONGODB_URI` line:

```env
MONGODB_URI=mongodb+srv://companyAdmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/company-mgmt?retryWrites=true&w=majority
```

Replace `YOUR_PASSWORD` with your actual password!

**Save the file!**

---

## Step 3: Install Backend Dependencies

In the terminal (make sure you're in the backend folder):

```bash
# Install all dependencies (this takes 2-3 minutes)
npm install
```

You should see:
```
added XXX packages
```

---

## Step 4: Create Test Users in Database

```bash
# Seed the database with test users
npm run seed
```

You should see:
```
Connected to MongoDB
✅ Database seeded successfully!

📝 Default Users Created:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin:
  Email: admin@company.com
  Password: Admin@123

Manager:
  Email: manager@company.com
  Password: Manager@123

Employee:
  Email: employee@company.com
  Password: Employee@123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

✅ **Database is now ready with test users!**

---

## Step 5: Start Backend Server

```bash
npm run dev
```

You should see:
```
[INFO] Server running in development mode on port 5000
[INFO] MongoDB Connected: localhost (or Atlas cluster)
[INFO] Cron jobs started
```

✅ **Backend is running!**

**Keep this terminal open!**

---

## Step 6: Setup Frontend (New Terminal)

Open a **NEW** terminal window (Command Prompt or PowerShell):

```bash
# Navigate to frontend folder
cd c:\Users\pc\Desktop\Project_Moeen\frontend

# Install dependencies (takes 2-3 minutes)
npm install

# Create .env file
copy .env.example .env
```

The frontend `.env` file should contain:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Company Management System
VITE_SCREENSHOT_ENABLED=true
```

This is already correct in the example file, so no need to edit.

---

## Step 7: Start Frontend

```bash
npm run dev
```

You should see:
```
  VITE v5.0.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

✅ **Frontend is running!**

**Keep this terminal open too!**

---

## Step 8: Test the System

1. Open your web browser
2. Go to: **http://localhost:5173**
3. You should see the login page

### Login with Admin Account:

```
Email: admin@company.com
Password: Admin@123
```

Click **Login**

You should be redirected to the dashboard! 🎉

---

## Step 9: Test Core Features

### Test 1: Attendance Check-In

1. Click **Attendance** in the sidebar
2. Click **Check In** button
3. You should see success message
4. Status should show "Working"

### Test 2: Start a Break

1. On the same page, click **Start Break**
2. Select "break" or "short_leave"
3. Click **Start Break**
4. Status should change to "Break"

### Test 3: End Break

1. Click **End Break**
2. Status should return to "Working"

### Test 4: Check Out

1. Click **Check Out**
2. You should see total hours worked

### Test 5: Create a Project

1. Click **Projects** in sidebar
2. Click **+ Create Project**
3. Fill in:
   - Name: Test Project
   - Code: TEST001
   - Client: (you might need to create a client first)
   - Status: Active
4. Click **Save**

### Test 6: Apply for Leave

1. Click **Leaves** in sidebar
2. Click **Apply for Leave**
3. Select dates and leave type
4. Enter reason
5. Submit

### Test 7: Submit Expense

1. Click **Expenses** in sidebar
2. Click **Submit Expense**
3. Fill in details
4. Submit

---

## Step 10: Test Different Roles

**Logout** (click profile icon → Logout)

### Login as Manager:

```
Email: manager@company.com
Password: Manager@123
```

- You should see manager dashboard
- You can approve employee leaves/expenses/timesheets

### Login as Employee:

```
Email: employee@company.com
Password: Employee@123
```

- You should see employee dashboard
- You can submit leaves, expenses, timesheets

---

## Optional: Setup Electron Desktop App

If you want to test screenshot monitoring:

Open a **THIRD** terminal:

```bash
cd c:\Users\pc\Desktop\Project_Moeen\electron

npm install

copy .env.example .env

npm run dev
```

The Electron app window will open. Login with any employee account to start screenshot monitoring.

---

## 🎉 You're All Set!

You now have:
- ✅ MongoDB running (local or Atlas)
- ✅ Backend API running on port 5000
- ✅ Frontend web app running on port 5173
- ✅ Test users created
- ✅ All features working

---

## 📊 Verify Everything is Working

### Check Backend Health:

Open browser: http://localhost:5000/health

Should show:
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2024-01-13T...",
  "environment": "development"
}
```

### Check MongoDB Connection:

Open MongoDB Compass (if installed):
- Connection string: `mongodb://localhost:27017`
- You should see database: `company-mgmt`
- Collections: users, attendance, projects, etc.

---

## 🔧 Common Issues & Solutions

### Issue 1: "MongoDB connection failed"

**Solution:**
```bash
# Check if MongoDB service is running
sc query MongoDB

# If stopped, start it:
net start MongoDB
```

### Issue 2: "Port 5000 is already in use"

**Solution:**
```bash
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace XXXX with PID)
taskkill /PID XXXX /F

# Or change port in backend/.env
PORT=5001
```

### Issue 3: "Cannot find module"

**Solution:**
```bash
# Delete node_modules and reinstall
cd backend
rmdir /s node_modules
npm install
```

### Issue 4: Frontend shows "Network Error"

**Solution:**
- Make sure backend is running
- Check `frontend/.env` has correct API URL
- Check browser console for errors

### Issue 5: "MongooseServerSelectionError"

**Solution:**
- Check MongoDB is running: `mongosh`
- Check connection string in `backend/.env`
- For Atlas: verify network access allows your IP

---

## 📝 Quick Reference

### Start Backend:
```bash
cd c:\Users\pc\Desktop\Project_Moeen\backend
npm run dev
```

### Start Frontend:
```bash
cd c:\Users\pc\Desktop\Project_Moeen\frontend
npm run dev
```

### Access URLs:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

### Test Accounts:
- Admin: admin@company.com / Admin@123
- Manager: manager@company.com / Manager@123
- Employee: employee@company.com / Employee@123

---

## Need More Help?

If you encounter any issues:
1. Check the error message in the terminal
2. Check `backend/logs/combined.log` for backend errors
3. Check browser console (F12) for frontend errors
4. Read the error messages carefully - they usually tell you what's wrong

Happy coding! 🚀
