# Setup Guide

Complete setup guide for the Internal Management System.

## Prerequisites

- **Node.js**: 18.x or higher
- **MongoDB**: 6.x or higher
- **AWS Account**: For S3 screenshot storage
- **Git**: For version control

## 1. Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/company-mgmt
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=30d

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=company-screenshots

SCREENSHOT_RETENTION_DAYS=30
ENCRYPTION_KEY=your-32-character-encryption-key

FRONTEND_URL=http://localhost:5173
```

### MongoDB Setup

#### Local MongoDB

```bash
# Install MongoDB (macOS)
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify connection
mongosh
```

#### MongoDB Atlas (Cloud)

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### AWS S3 Setup

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://company-screenshots --region us-east-1
   ```

2. **Configure Bucket Policy** (Private bucket)
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Deny",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::company-screenshots/*",
         "Condition": {
           "StringNotEquals": {
             "aws:PrincipalAccount": "YOUR_AWS_ACCOUNT_ID"
           }
         }
       }
     ]
   }
   ```

3. **Create IAM User** with S3 permissions
   - AmazonS3FullAccess (or custom policy)
   - Save Access Key ID and Secret Access Key

4. **Configure Lifecycle Policy** for auto-deletion
   - Go to S3 bucket → Management → Lifecycle rules
   - Create rule to delete objects after 30 days

### Seed Database

Create initial admin user and sample data:

```bash
cd backend
npm run seed
```

Default admin credentials:
- Email: `admin@company.com`
- Password: `Admin@123`

**⚠️ Change these immediately in production!**

### Start Backend Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server runs at: `http://localhost:5000`

Health check: `http://localhost:5000/health`

---

## 2. Frontend Setup

### Install Dependencies

```bash
cd frontend
npm install
```

### Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Company Management System
VITE_SCREENSHOT_ENABLED=true
```

### Start Development Server

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

---

## 3. Electron App Setup

### Install Dependencies

```bash
cd electron
npm install
```

### Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
API_URL=http://localhost:5000/api/v1
SCREENSHOT_MIN_INTERVAL=20
SCREENSHOT_MAX_INTERVAL=30
BLUR_LEVEL=5
COMPRESSION_QUALITY=70
```

### Development Mode

```bash
npm run dev
```

### Build Desktop App

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Executable in `dist/` directory.

---

## 4. Testing the System

### Test Backend API

```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Admin@123"}'
```

### Test Frontend

1. Open `http://localhost:5173`
2. Login with admin credentials
3. Navigate through modules

### Test Electron App

1. Launch the Electron app
2. Login with employee credentials
3. Verify screenshot monitoring starts
4. Check system tray icon

---

## 5. Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh

# Check connection string
echo $MONGODB_URI
```

### Port Already in Use

```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### AWS S3 Permissions

```bash
# Test AWS credentials
aws s3 ls

# Test bucket access
aws s3 ls s3://company-screenshots
```

### Electron Build Issues

```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

---

## 6. Development Tips

### Hot Reload

- Backend: `nodemon` automatically restarts on file changes
- Frontend: Vite HMR updates instantly
- Electron: Restart app manually after changes

### Debugging

**Backend:**
```bash
# Enable debug logs
LOG_LEVEL=debug npm run dev
```

**Frontend:**
```javascript
// Browser DevTools
console.log(import.meta.env)
```

**Electron:**
```bash
# Open DevTools
npm run dev
# Then press Ctrl+Shift+I
```

### Database Management

```bash
# MongoDB Shell
mongosh

# List databases
show dbs

# Use database
use company-mgmt

# List collections
show collections

# Query users
db.users.find().pretty()
```

---

## 7. Next Steps

1. ✅ Complete setup of all three components
2. ✅ Test core functionality
3. ✅ Create additional users
4. ✅ Configure IP restrictions if needed
5. ✅ Set up email notifications (optional)
6. ✅ Deploy to production (see [DEPLOYMENT.md](./DEPLOYMENT.md))

---

## Need Help?

- Check [API.md](./API.md) for API documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guide
- Review error logs in `backend/logs/`
- Check browser console for frontend errors
- Check Electron console for desktop app errors
