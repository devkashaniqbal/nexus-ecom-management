@echo off
setlocal enabledelayedexpansion

:: Railway Deployment Setup Script for Nexus Ecom Management System (Windows)
:: This script helps you quickly deploy to Railway

echo ╔════════════════════════════════════════════════════════════╗
echo ║   Nexus Ecom Management System - Railway Deployment       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Check if Railway CLI is installed
where railway >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found. Installing...
    call npm install -g @railway/cli
    echo ✅ Railway CLI installed successfully
) else (
    echo ✅ Railway CLI already installed
)

echo.
echo 📋 Pre-deployment Checklist:
echo    [ ] MongoDB Atlas cluster created
echo    [ ] Database user created with password
echo    [ ] Network access set to 0.0.0.0/0
echo    [ ] Connection string ready
echo    [ ] GitHub repository created and pushed
echo.

set /p checklist_done="Have you completed the checklist above? (y/n): "
if /i not "%checklist_done%"=="y" (
    echo ⚠️  Please complete the checklist items first.
    echo 📖 Refer to RAILWAY_DEPLOYMENT.md for detailed instructions.
    pause
    exit /b 1
)

echo.
echo 🚀 Starting Railway deployment setup...
echo.

:: Login to Railway
echo Step 1: Logging in to Railway...
call railway login

if %errorlevel% neq 0 (
    echo ❌ Railway login failed. Please try again.
    pause
    exit /b 1
)

echo ✅ Logged in successfully
echo.

:: Create new project or link existing
echo Step 2: Project setup
set /p create_new="Do you want to create a new Railway project? (y/n): "

if /i "%create_new%"=="y" (
    echo Creating new project...
    call railway init
) else (
    echo Linking to existing project...
    call railway link
)

echo.
echo 📝 You'll need to set up TWO services:
echo    1. Backend (Node.js API^)
echo    2. Frontend (React + Vite^)
echo.

:: Backend deployment
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    BACKEND DEPLOYMENT                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

set /p deploy_backend="Deploy backend now? (y/n): "

if /i "%deploy_backend%"=="y" (
    echo.
    echo 📋 Backend Environment Variables Needed:
    echo    Copy these to Railway dashboard ^> Backend service ^> Variables
    echo.
    echo # Server Configuration
    echo NODE_ENV=production
    echo PORT=5000
    echo API_VERSION=v1
    echo.
    echo # Database (Replace with your MongoDB Atlas connection string^)
    echo MONGODB_URI=mongodb+srv://your-user:your-password@cluster.mongodb.net/nexus-ecom
    echo.
    echo # JWT Configuration (Generate secure random strings^)
    echo JWT_SECRET=your-production-jwt-secret-at-least-32-characters-long
    echo JWT_EXPIRE=30d
    echo JWT_REFRESH_EXPIRE=90d
    echo.
    echo # Security
    echo RATE_LIMIT_WINDOW=15
    echo RATE_LIMIT_MAX_REQUESTS=100
    echo.
    echo # Encryption (Generate 32-character string^)
    echo ENCRYPTION_KEY=your-32-character-encryption-key
    echo.
    echo # Frontend URL (Update after frontend deployment^)
    echo FRONTEND_URL=https://your-frontend.railway.app
    echo.
    echo # Logging
    echo LOG_LEVEL=info
    echo.
    echo ⚠️  IMPORTANT: Set these variables in Railway dashboard before deploying!
    echo.
    pause

    echo Deploying backend from .\backend directory...
    cd backend
    call railway up
    cd ..

    if !errorlevel! equ 0 (
        echo ✅ Backend deployed successfully!
        echo.
        echo Get your backend URL:
        echo    Railway Dashboard ^> Backend Service ^> Settings ^> Networking ^> Generate Domain
        echo.
    ) else (
        echo ❌ Backend deployment failed. Check the logs in Railway dashboard.
    )
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                   FRONTEND DEPLOYMENT                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

set /p backend_url="Enter your backend Railway URL (or press Enter to skip^): "

if not "%backend_url%"=="" (
    echo.
    echo 📝 Updating frontend configuration...

    :: Create .env.production file
    (
        echo VITE_API_URL=%backend_url%/api/v1
    ) > frontend\.env.production

    echo ✅ Frontend configuration updated
    echo.

    set /p deploy_frontend="Deploy frontend now? (y/n): "

    if /i "!deploy_frontend!"=="y" (
        echo.
        echo 📋 Frontend Environment Variables:
        echo    Set this in Railway dashboard ^> Frontend service ^> Variables
        echo.
        echo VITE_API_URL=%backend_url%/api/v1
        echo.
        pause

        echo Deploying frontend from .\frontend directory...
        cd frontend
        call railway up
        cd ..

        if !errorlevel! equ 0 (
            echo ✅ Frontend deployed successfully!
            echo.
            echo Get your frontend URL:
            echo    Railway Dashboard ^> Frontend Service ^> Settings ^> Networking ^> Generate Domain
            echo.
        ) else (
            echo ❌ Frontend deployment failed. Check the logs in Railway dashboard.
        )
    )
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                     FINAL STEPS                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 📝 After deployment, you need to:
echo.
echo 1. Get your frontend URL from Railway
echo 2. Update FRONTEND_URL in backend environment variables
echo 3. Redeploy backend service for CORS to work
echo.

set /p frontend_url="Enter your frontend Railway URL to update backend CORS: "

if not "%frontend_url%"=="" (
    echo.
    echo ⚠️  IMPORTANT ACTION REQUIRED:
    echo.
    echo Go to: Railway Dashboard ^> Backend Service ^> Variables
    echo Update: FRONTEND_URL=%frontend_url%
    echo Then: Click 'Redeploy' button
    echo.
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                   SEED DEMO DATA                           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

set /p seed_data="Seed demo data for client presentation? (y/n): "

if /i "%seed_data%"=="y" (
    echo.
    echo Running demo data seeder...
    echo This will create sample users, projects, attendance, etc.
    echo.

    cd backend
    call railway run npm run seed:demo
    cd ..

    if !errorlevel! equ 0 (
        echo.
        echo ✅ Demo data seeded successfully!
        echo.
        echo ═══════════════════════════════════════════════════════════
        echo 📋 DEMO CREDENTIALS FOR CLIENT
        echo ═══════════════════════════════════════════════════════════
        echo.
        echo 👨‍💼 ADMIN:
        echo    Email: admin@nexusecom.com
        echo    Password: Admin@123
        echo.
        echo 👨‍💼 MANAGER:
        echo    Email: manager@nexusecom.com
        echo    Password: Manager@123
        echo.
        echo 👤 EMPLOYEE:
        echo    Email: sarah@nexusecom.com
        echo    Password: Employee@123
        echo.
        echo ═══════════════════════════════════════════════════════════
    )
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                 DEPLOYMENT COMPLETE! 🎉                    ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

if not "%backend_url%"=="" if not "%frontend_url%"=="" (
    echo 🌐 Your Application URLs:
    echo    Frontend: %frontend_url%
    echo    Backend:  %backend_url%
    echo    Health:   %backend_url%/health
    echo.
)

echo 📚 Next Steps:
echo    1. Test your application at the URLs above
echo    2. Review CLIENT_DEMO_GUIDE.md for demo tips
echo    3. Share credentials with your client
echo    4. Monitor logs in Railway dashboard
echo.

echo 📖 Documentation:
echo    - Full deployment guide: RAILWAY_DEPLOYMENT.md
echo    - Demo guide: CLIENT_DEMO_GUIDE.md
echo.

echo 🎯 Ready for client presentation!
echo.

pause
