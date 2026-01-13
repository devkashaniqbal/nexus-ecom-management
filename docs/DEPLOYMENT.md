# Deployment Guide

Production deployment guide for AWS infrastructure.

## Architecture Overview

```
┌─────────────────┐
│   CloudFront    │ ← Frontend (S3)
└────────┬────────┘
         │
┌────────▼────────┐
│   API Gateway   │ (Optional)
└────────┬────────┘
         │
┌────────▼────────┐
│  EC2/ECS/Lambda │ ← Backend API
└────────┬────────┘
         │
┌────────▼────────┐     ┌──────────┐
│  MongoDB Atlas  │     │ S3 Bucket│ ← Screenshots
└─────────────────┘     └──────────┘
```

---

## 1. MongoDB Atlas Setup

### Create Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create new project
3. Build a cluster (M0 Free or M10+ for production)
4. Choose region close to your users

### Configure Access

1. **Network Access**
   - Add IP addresses of your servers
   - Or allow access from anywhere (0.0.0.0/0) with strong authentication

2. **Database User**
   - Create database user with read/write permissions
   - Use strong password
   - Save credentials securely

3. **Get Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/company-mgmt?retryWrites=true&w=majority
   ```

---

## 2. AWS S3 Setup

### Create S3 Bucket

```bash
aws s3 mb s3://company-screenshots-prod --region us-east-1
```

### Configure Bucket

```bash
# Block public access
aws s3api put-public-access-block \
  --bucket company-screenshots-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket company-screenshots-prod \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket company-screenshots-prod \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### Lifecycle Policy

Create `lifecycle-policy.json`:

```json
{
  "Rules": [
    {
      "Id": "DeleteOldScreenshots",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "screenshots/"
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

Apply policy:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket company-screenshots-prod \
  --lifecycle-configuration file://lifecycle-policy.json
```

---

## 3. Backend Deployment (EC2)

### Launch EC2 Instance

1. **Choose AMI**: Ubuntu 22.04 LTS
2. **Instance Type**: t3.small or larger
3. **Security Group**:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 5000 (API) - only from your IPs

### Initial Server Setup

```bash
# SSH into server
ssh ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (if not using Atlas)
# Not recommended for production

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Deploy Backend

```bash
# Clone repository
git clone https://github.com/your-repo/company-management.git
cd company-management/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
```

Production `.env`:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/company-mgmt
JWT_SECRET=very-strong-random-secret-key-generate-with-openssl
JWT_EXPIRE=30d

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-production-key
AWS_SECRET_ACCESS_KEY=your-production-secret
S3_BUCKET_NAME=company-screenshots-prod

SCREENSHOT_RETENTION_DAYS=30
ENCRYPTION_KEY=another-strong-32-char-key

FRONTEND_URL=https://your-domain.com

ENABLE_IP_RESTRICTION=true
ALLOWED_IPS=your-office-ip/32

LOG_LEVEL=info
```

### Start with PM2

```bash
# Start application
pm2 start src/server.js --name company-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Configure Nginx

Create `/etc/nginx/sites-available/company-api`:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/company-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL

```bash
sudo certbot --nginx -d api.your-domain.com
```

---

## 4. Frontend Deployment (S3 + CloudFront)

### Build Frontend

```bash
cd frontend

# Update .env for production
echo "VITE_API_URL=https://api.your-domain.com/api/v1" > .env

# Build
npm run build
```

### Create S3 Bucket for Frontend

```bash
aws s3 mb s3://company-frontend-prod --region us-east-1

# Configure for static website hosting
aws s3 website s3://company-frontend-prod \
  --index-document index.html \
  --error-document index.html
```

### Upload Build

```bash
aws s3 sync dist/ s3://company-frontend-prod --delete
```

### Setup CloudFront

1. Go to CloudFront console
2. Create distribution
3. **Origin Domain**: company-frontend-prod.s3.amazonaws.com
4. **Viewer Protocol Policy**: Redirect HTTP to HTTPS
5. **Default Root Object**: index.html
6. **Custom Error Pages**: 404 → /index.html (200)
7. **Alternate Domain Names**: your-domain.com
8. **SSL Certificate**: Request from ACM or use existing

### Configure DNS

Add CNAME record:

```
your-domain.com → d123456.cloudfront.net
```

Or use Route53 for better integration.

---

## 5. Environment Variables Management

### Using AWS Systems Manager Parameter Store

```bash
# Store secrets
aws ssm put-parameter \
  --name "/company-mgmt/prod/jwt-secret" \
  --value "your-jwt-secret" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/company-mgmt/prod/mongodb-uri" \
  --value "mongodb+srv://..." \
  --type "SecureString"

# Retrieve in application
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
```

### Using .env File (Alternative)

Ensure `.env` is in `.gitignore` and manage separately:

```bash
# Never commit .env to git
echo ".env" >> .gitignore

# Use secure copy to transfer
scp .env ubuntu@server:/app/backend/.env
```

---

## 6. Monitoring & Logging

### CloudWatch Setup

**Backend Logs:**

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

Configure agent to send logs:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/app/backend/logs/combined.log",
            "log_group_name": "/company-mgmt/backend",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

### Health Checks

Set up Route53 or CloudWatch health checks:

```bash
# Endpoint
https://api.your-domain.com/health

# Expected response
{"status":"success"}
```

### Alerts

Create CloudWatch alarms for:
- High CPU usage
- High memory usage
- API error rate
- Response time

---

## 7. Database Backups

### MongoDB Atlas Backups

1. Go to Atlas → Backup
2. Enable Continuous Backup
3. Configure retention policy
4. Test restore procedure

### Manual Backup Script

```bash
#!/bin/bash
# backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$TIMESTAMP"

# Upload to S3
aws s3 sync "$BACKUP_DIR/$TIMESTAMP" "s3://company-backups/mongodb/$TIMESTAMP"

# Keep only last 7 days
find "$BACKUP_DIR" -mtime +7 -delete
```

Schedule with cron:

```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## 8. Security Checklist

- [ ] All secrets in environment variables (not hardcoded)
- [ ] HTTPS enabled on all endpoints
- [ ] MongoDB Atlas IP whitelist configured
- [ ] S3 buckets are private
- [ ] IAM roles follow least privilege principle
- [ ] API rate limiting enabled
- [ ] Helmet.js security headers configured
- [ ] Input validation on all endpoints
- [ ] SQL/NoSQL injection protection
- [ ] XSS protection
- [ ] CSRF protection (if needed)
- [ ] Regular dependency updates
- [ ] Security monitoring enabled
- [ ] Backup and restore tested

---

## 9. CI/CD Setup (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /app/backend
            git pull
            npm install
            pm2 restart company-api

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build and Deploy
        run: |
          cd frontend
          npm install
          npm run build
          aws s3 sync dist/ s3://company-frontend-prod --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## 10. Scaling Considerations

### Horizontal Scaling

**Load Balancer:**
```
CloudFront → ALB → Multiple EC2 Instances
```

**Auto Scaling Group:**
- Min: 2 instances
- Max: 10 instances
- Target: 70% CPU utilization

### Database Scaling

- MongoDB Atlas: Upgrade to M10+ cluster
- Enable sharding for large datasets
- Use read replicas

### Caching

**Redis for Session/Cache:**

```bash
# Install Redis
sudo apt install redis-server

# Configure in app
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

---

## 11. Maintenance

### Regular Updates

```bash
# Update dependencies
npm update
npm audit fix

# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services
pm2 restart all
```

### Log Rotation

```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 12. Rollback Plan

### Application Rollback

```bash
# Using PM2
pm2 delete company-api
git checkout previous-commit
npm install
pm2 start src/server.js --name company-api
```

### Database Rollback

```bash
# Restore from backup
mongorestore --uri="$MONGODB_URI" /path/to/backup
```

### Frontend Rollback

```bash
# Restore previous S3 version
aws s3api list-object-versions --bucket company-frontend-prod
aws s3api copy-object --copy-source company-frontend-prod/index.html?versionId=xxx
```

---

## Need Help?

Contact DevOps team or refer to:
- [AWS Documentation](https://docs.aws.amazon.com/)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
