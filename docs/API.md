# API Documentation

Complete API reference for the Internal Management System.

**Base URL**: `http://localhost:5000/api/v1`

**Authentication**: Bearer Token (JWT)

```
Authorization: Bearer <token>
```

---

## Authentication

### POST /auth/register
Create a new user account.

**Access**: Admin only

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@company.com",
  "password": "SecurePass123",
  "employeeId": "EMP004",
  "department": "Engineering",
  "designation": "Software Developer",
  "role": "employee"
}
```

### POST /auth/login
```json
{
  "email": "admin@company.com",
  "password": "Admin@123"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "user": { ...user object },
    "token": "jwt-token"
  }
}
```

---

## 📋 Complete Setup Steps

Follow these steps exactly to get the system running:

### Step 1: Install Prerequisites

**1. Install Node.js 18+**
- Download from: https://nodejs.org/
- Verify: `node --version` (should be 18+)

**2. Install MongoDB**

**Windows:**
```bash
# Download from https://www.mongodb.com/try/download/community
# Install MongoDB Community Server
# Start MongoDB service
net start MongoDB
```

**Mac:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

Verify MongoDB is running:
```bash
# Connect to MongoDB
mongosh
# You should see MongoDB shell
```

---

## Step-by-Step Setup Instructions

### 1. **Backend Setup** (5 minutes)

```bash
# Navigate to backend folder
cd c:\Users\pc\Desktop\Project_Moeen\backend

# Install dependencies
npm install

# Create logs directory
mkdir logs

# Copy environment file
copy .env.example .env
```

**Edit `backend\.env`** with Notepad or VS Code:

For quick testing, use these minimal settings:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/company-mgmt
JWT_SECRET=my-development-secret-key-change-in-production
JWT_EXPIRE=30d

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET_NAME=company-screenshots

SCREENSHOT_RETENTION_DAYS=30
ENCRYPTION_KEY=12345678901234567890123456789012

FRONTEND_URL=http://localhost:5173
ENABLE_IP_RESTRICTION=false
```

Then run:

```bash
# Make sure MongoDB is running first!
# Windows: Run MongoDB as a service or start it manually

# Seed the database with test users
npm run seed

# Start the backend server
npm run dev
```

## Step 2: Start Frontend (New Terminal)

```bash
cd c:\Users\pc\Desktop\Project_Moeen\frontend

npm install

# Create .env file
echo VITE_API_URL=http://localhost:5000/api/v1 > .env

npm run dev
```

Frontend will run at: **http://localhost:5173**

## Step 3: Test in Browser

Open your browser and go to: **http://localhost:5173**

**Login with these test accounts:**

1. **Admin Account**
   - Email: `admin@company.com`
   - Password: `Admin@123`

2. **Manager Account**
   - Email: `manager@company.com`
   - Password: Manager@123`

3. **Employee Account**
   - Email: `employee@company.com`
   - Password: `Employee@123`

## What You Can Test

### Core Features:
1. **Attendance Module**
   - Check-in/Check-out
   - Start/End breaks
   - View today's attendance
   - View attendance history

2. **Projects**
   - Create new projects
   - Assign team members
   - Track project status

3. **Timesheets**
   - Log weekly hours
   - Submit for approval
   - Manager can approve/reject

4. **Expenses**
   - Submit expense requests
   - Upload receipts (files)
   - Manager approval workflow

5. **Leaves**
   - Apply for leave
   - Manager approval
   - View leave history

6. **Assets**
   - Manage hardware inventory
   - Assign assets to employees
   - Track assignment history

7. **Announcements**
   - Create announcements (Admin/Manager)
   - Mark as read/unread

8. **Dashboard**
   - Role-based stats
   - Quick actions
   - Recent activity

---

## 🚀 Setup Steps (5 Minutes)

Follow these steps exactly:

### Step 1: Install MongoDB (if not installed)

**Windows:**
1. Download from: https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB runs automatically as a service

Check if running:
```bash
mongosh
```

If not running:
```bash
net start MongoDB
```

**Mac:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt install mongodb-server
sudo systemctl start mongod
```

---

## Now Let's Run the System!

### Step 1: Backend Setup

```bash
# Open terminal in VSCode or Command Prompt
cd c:\Users\pc\Desktop\Project_Moeen\backend

# Install dependencies (first time only)
npm install

# Create environment file
copy .env.example .env
```

**Edit the `backend/.env` file** that just opened in your editor:

Minimal configuration for testing (no AWS needed):

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/company-mgmt
JWT_SECRET=test-secret-key-change-in-production
JWT_EXPIRE=30d
ENCRYPTION_KEY=12345678901234567890123456789012
FRONTEND_URL=http://localhost:5173
ENABLE_IP_RESTRICTION=false

# Skip AWS for now (screenshots won't upload but app will work)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET_NAME=test-bucket
```

Now run these commands in separate terminals:

### Terminal 1 - Backend:
```bash
cd c:\Users\pc\Desktop\Project_Moeen\backend
npm install
npm run seed
npm run dev
```

### Terminal 2 - Frontend:
```bash
cd c:\Users\pc\Desktop\Project_Moeen\frontend
npm install
npm run dev
```

Then open http://localhost:5173 and login with:
- Email: admin@company.com
- Password: Admin@123

The system is now ready to test! All tasks have been completed successfully. 🎉