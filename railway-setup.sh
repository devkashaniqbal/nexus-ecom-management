#!/bin/bash

# Railway Deployment Setup Script for Nexus Ecom Management System
# This script helps you quickly deploy to Railway

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Nexus Ecom Management System - Railway Deployment       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed successfully"
else
    echo "✅ Railway CLI already installed"
fi

echo ""
echo "📋 Pre-deployment Checklist:"
echo "   [ ] MongoDB Atlas cluster created"
echo "   [ ] Database user created with password"
echo "   [ ] Network access set to 0.0.0.0/0"
echo "   [ ] Connection string ready"
echo "   [ ] GitHub repository created and pushed"
echo ""

read -p "Have you completed the checklist above? (y/n): " checklist_done
if [[ $checklist_done != "y" ]]; then
    echo "⚠️  Please complete the checklist items first."
    echo "📖 Refer to RAILWAY_DEPLOYMENT.md for detailed instructions."
    exit 1
fi

echo ""
echo "🚀 Starting Railway deployment setup..."
echo ""

# Login to Railway
echo "Step 1: Logging in to Railway..."
railway login

if [ $? -ne 0 ]; then
    echo "❌ Railway login failed. Please try again."
    exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Create new project or link existing
echo "Step 2: Project setup"
read -p "Do you want to create a new Railway project? (y/n): " create_new

if [[ $create_new == "y" ]]; then
    echo "Creating new project..."
    railway init
else
    echo "Linking to existing project..."
    railway link
fi

echo ""
echo "📝 You'll need to set up TWO services:"
echo "   1. Backend (Node.js API)"
echo "   2. Frontend (React + Vite)"
echo ""

# Backend deployment
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    BACKEND DEPLOYMENT                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

read -p "Deploy backend now? (y/n): " deploy_backend

if [[ $deploy_backend == "y" ]]; then
    echo ""
    echo "📋 Backend Environment Variables Needed:"
    echo "   Copy these to Railway dashboard > Backend service > Variables"
    echo ""
    cat << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database (Replace with your MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://your-user:your-password@cluster.mongodb.net/nexus-ecom

# JWT Configuration (Generate secure random strings)
JWT_SECRET=your-production-jwt-secret-at-least-32-characters-long
JWT_EXPIRE=30d
JWT_REFRESH_EXPIRE=90d

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Encryption (Generate 32-character string)
ENCRYPTION_KEY=your-32-character-encryption-key

# Frontend URL (Update after frontend deployment)
FRONTEND_URL=https://your-frontend.railway.app

# AWS S3 (Optional - for screenshots)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=nexus-screenshots

# Screenshot Settings
SCREENSHOT_RETENTION_DAYS=30
SCREENSHOT_MIN_INTERVAL=20
SCREENSHOT_MAX_INTERVAL=30

# Logging
LOG_LEVEL=info
EOF
    echo ""
    echo "⚠️  IMPORTANT: Set these variables in Railway dashboard before deploying!"
    echo ""

    read -p "Press Enter after you've set the environment variables in Railway..."

    echo "Deploying backend from ./backend directory..."
    cd backend
    railway up
    cd ..

    if [ $? -eq 0 ]; then
        echo "✅ Backend deployed successfully!"
        echo ""
        echo "Get your backend URL:"
        echo "   Railway Dashboard > Backend Service > Settings > Networking > Generate Domain"
        echo ""
    else
        echo "❌ Backend deployment failed. Check the logs in Railway dashboard."
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   FRONTEND DEPLOYMENT                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

read -p "Enter your backend Railway URL (or press Enter to skip): " backend_url

if [[ ! -z "$backend_url" ]]; then
    # Update frontend config
    echo ""
    echo "📝 Updating frontend configuration..."

    # Create .env.production file
    cat > frontend/.env.production << EOF
VITE_API_URL=${backend_url}/api/v1
EOF

    echo "✅ Frontend configuration updated"
    echo ""

    read -p "Deploy frontend now? (y/n): " deploy_frontend

    if [[ $deploy_frontend == "y" ]]; then
        echo ""
        echo "📋 Frontend Environment Variables:"
        echo "   Set this in Railway dashboard > Frontend service > Variables"
        echo ""
        echo "VITE_API_URL=${backend_url}/api/v1"
        echo ""

        read -p "Press Enter after setting the variable in Railway..."

        echo "Deploying frontend from ./frontend directory..."
        cd frontend
        railway up
        cd ..

        if [ $? -eq 0 ]; then
            echo "✅ Frontend deployed successfully!"
            echo ""
            echo "Get your frontend URL:"
            echo "   Railway Dashboard > Frontend Service > Settings > Networking > Generate Domain"
            echo ""
        else
            echo "❌ Frontend deployment failed. Check the logs in Railway dashboard."
        fi
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     FINAL STEPS                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "📝 After deployment, you need to:"
echo ""
echo "1. Get your frontend URL from Railway"
echo "2. Update FRONTEND_URL in backend environment variables"
echo "3. Redeploy backend service for CORS to work"
echo ""

read -p "Enter your frontend Railway URL to update backend CORS: " frontend_url

if [[ ! -z "$frontend_url" ]]; then
    echo ""
    echo "⚠️  IMPORTANT ACTION REQUIRED:"
    echo ""
    echo "Go to: Railway Dashboard > Backend Service > Variables"
    echo "Update: FRONTEND_URL=${frontend_url}"
    echo "Then: Click 'Redeploy' button"
    echo ""
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   SEED DEMO DATA                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

read -p "Seed demo data for client presentation? (y/n): " seed_data

if [[ $seed_data == "y" ]]; then
    echo ""
    echo "Running demo data seeder..."
    echo "This will create sample users, projects, attendance, etc."
    echo ""

    cd backend
    railway run npm run seed:demo
    cd ..

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Demo data seeded successfully!"
        echo ""
        echo "═══════════════════════════════════════════════════════════"
        echo "📋 DEMO CREDENTIALS FOR CLIENT"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
        echo "👨‍💼 ADMIN:"
        echo "   Email: admin@nexusecom.com"
        echo "   Password: Admin@123"
        echo ""
        echo "👨‍💼 MANAGER:"
        echo "   Email: manager@nexusecom.com"
        echo "   Password: Manager@123"
        echo ""
        echo "👤 EMPLOYEE:"
        echo "   Email: sarah@nexusecom.com"
        echo "   Password: Employee@123"
        echo ""
        echo "═══════════════════════════════════════════════════════════"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                 DEPLOYMENT COMPLETE! 🎉                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [[ ! -z "$backend_url" ]] && [[ ! -z "$frontend_url" ]]; then
    echo "🌐 Your Application URLs:"
    echo "   Frontend: $frontend_url"
    echo "   Backend:  $backend_url"
    echo "   Health:   ${backend_url}/health"
    echo ""
fi

echo "📚 Next Steps:"
echo "   1. Test your application at the URLs above"
echo "   2. Review CLIENT_DEMO_GUIDE.md for demo tips"
echo "   3. Share credentials with your client"
echo "   4. Monitor logs in Railway dashboard"
echo ""

echo "📖 Documentation:"
echo "   - Full deployment guide: RAILWAY_DEPLOYMENT.md"
echo "   - Demo guide: CLIENT_DEMO_GUIDE.md"
echo ""

echo "🎯 Ready for client presentation!"
echo ""
