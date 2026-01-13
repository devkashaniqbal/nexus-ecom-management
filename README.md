# Internal Management System

A production-ready internal management system for small software companies.

## 🚀 Features

### 1. Attendance & HR
- One-tap check-in/check-out
- Break tracking (5-30 min, no screenshots)
- Short leave requests (30 min-2 hours)
- Auto status tracking
- IP-restricted check-in
- Company calendar with holidays
- Weekly/monthly attendance summaries

### 2. Screenshot Monitoring (Desktop Only)
- Background Electron app
- Random interval screenshots (20-30 min)
- Auto-disabled during breaks/leaves
- Compression + blur before upload
- AWS S3 storage
- Auto-deletion after retention period

### 3. Project & Time Tracking
- Weekly timesheets
- Client project assignment
- Project status tracking
- Client vault
- Profitability reports

### 4. Asset & Resource Management
- Hardware inventory
- Asset assignment tracking
- Return history
- Encrypted credentials vault

### 5. Finance & Expenses
- Reimbursement requests
- Petty cash ledger
- Salary slip access

### 6. Admin & Management
- Role-based dashboards (Admin/Manager/Employee)
- Approval flows
- Announcements
- Policy center
- CSV exports

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Database**: MongoDB
- **Desktop**: Electron
- **Storage**: AWS S3
- **Deployment**: AWS (EC2/ECS, CloudFront)
- **Auth**: JWT + RBAC

## 📁 Project Structure

```
/
├── backend/              # Express API server
│   ├── src/
│   │   ├── models/      # MongoDB schemas
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Auth & validation
│   │   ├── controllers/ # Business logic
│   │   ├── services/    # External services (S3, etc)
│   │   └── utils/       # Helper functions
│   ├── .env.example
│   └── package.json
│
├── frontend/            # React + Vite app
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API calls
│   │   ├── context/     # Auth context
│   │   └── utils/       # Helper functions
│   ├── .env.example
│   └── package.json
│
├── electron/            # Desktop app
│   ├── main/           # Electron main process
│   ├── preload/        # Preload scripts
│   └── package.json
│
└── docs/               # Documentation
    ├── API.md
    ├── DEPLOYMENT.md
    └── SETUP.md
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- AWS Account (S3 access)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Electron Desktop App

```bash
cd electron
npm install
npm run dev
```

## 🔐 Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/company-mgmt
JWT_SECRET=your-secret-key
JWT_EXPIRE=30d
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=company-screenshots
SCREENSHOT_RETENTION_DAYS=30
ALLOWED_IPS=192.168.1.0/24
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 📦 Deployment

### AWS Deployment

1. **Backend (EC2/ECS)**
   - Deploy Express API to EC2 or ECS
   - Use PM2 for process management
   - Configure security groups for MongoDB access

2. **Frontend (S3 + CloudFront)**
   - Build React app: `npm run build`
   - Upload to S3 bucket
   - Configure CloudFront distribution
   - Set up custom domain with Route53

3. **Database (MongoDB Atlas)**
   - Create MongoDB Atlas cluster
   - Configure network access
   - Update connection string

4. **S3 for Screenshots**
   - Create private S3 bucket
   - Configure lifecycle policies for auto-deletion
   - Set up IAM roles with minimal permissions

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## 🔑 Default Admin Credentials

After seeding the database:
- Email: admin@company.com
- Password: Admin@123

**⚠️ Change immediately in production!**

## 📖 API Documentation

See [API.md](docs/API.md) for complete API reference.

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 License

Proprietary - Internal Use Only

## 🤝 Support

For issues and questions, contact the development team.
