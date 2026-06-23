# 🚀 Quick Deployment Guide - Get Live Link in 10 Minutes

Choose your deployment platform and follow the steps:

---

## **Option 1: Render.com** ⭐ (EASIEST & FREE)

### Step 1: Push to GitHub

```bash
cd /path/to/project

git init
git add .
git commit -m "Initial commit - Water Crisis Platform"
git remote add origin https://github.com/YOUR_USERNAME/water-crisis-platform.git
git push -u origin main
```

### Step 2: Deploy Backend on Render

1. Go to **https://render.com**
2. Sign up/Login with GitHub
3. Click **"New +"** → **"Web Service"**
4. Select your `water-crisis-platform` repository
5. Fill in details:
   - **Name**: `water-crisis-backend`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: 
     ```
     pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```
     gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
     ```

6. **Environment Variables** (Add these):
   ```
   DATABASE_URL=postgresql://water_user:water_password@YOUR_DB_URL:5432/water_crisis_db
   REDIS_URL=redis://YOUR_REDIS_URL:6379/0
   JWT_SECRET_KEY=your-super-secret-key-12345-change-this
   DEBUG=False
   ENVIRONMENT=production
   CORS_ORIGINS=http://localhost,https://YOUR_FRONTEND_URL
   OPENAI_API_KEY=sk-your-openai-key (optional)
   ```

7. Click **"Create Web Service"**
8. Wait 2-3 minutes for deployment
9. Get your backend URL: `https://water-crisis-backend.onrender.com`

### Step 3: Deploy Database on Render

1. Click **"New +"** → **"PostgreSQL"**
2. Name: `water-crisis-db`
3. Note the connection string
4. Update backend environment variable: `DATABASE_URL`

### Step 4: Deploy Frontend on Render

1. Click **"New +"** → **"Static Site"**
2. Select your repository
3. Fill in:
   - **Name**: `water-crisis-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Add environment variable:
   ```
   VITE_API_URL=https://water-crisis-backend.onrender.com/api/v1
   ```

5. Click **"Create Static Site"**
6. Get your frontend URL: `https://water-crisis-frontend.onrender.com`

### ✅ Done! Your live links are:
- **Frontend**: https://water-crisis-frontend.onrender.com
- **Backend**: https://water-crisis-backend.onrender.com
- **API Docs**: https://water-crisis-backend.onrender.com/docs

---

## **Option 2: Railway.app** (Simple & Fast)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login & Initialize

```bash
railway login
cd /path/to/project
railway init
```

### Step 3: Configure Services

```bash
# Create railway.json in project root
{
  "services": {
    "backend": {
      "build": "./backend",
      "port": 8000
    },
    "frontend": {
      "build": "./frontend",
      "port": 3000
    }
  }
}
```

### Step 4: Deploy

```bash
railway up
```

### ✅ Get your URL:
```bash
railway open
```

---

## **Option 3: Vercel (Frontend Only)**

### Step 1: Deploy Frontend

```bash
npm i -g vercel
cd frontend
vercel --prod
```

### Step 2: Update API URL

In `.env.production`:
```
VITE_API_URL=https://your-backend-url.onrender.com/api/v1
```

### ✅ Your frontend is live at:
- Vercel provides URL automatically

---

## **Option 4: Heroku (Free Alternative)**

### Step 1: Install Heroku CLI

```bash
curl https://cli-assets.heroku.com/install-ubuntu.sh | sh
heroku login
```

### Step 2: Create Heroku Apps

```bash
heroku create water-crisis-backend
heroku create water-crisis-frontend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev --app water-crisis-backend

# Add Redis addon
heroku addons:create heroku-redis:premium-0 --app water-crisis-backend
```

### Step 3: Deploy

```bash
# Backend
cd backend
git push heroku main

# Frontend
cd ../frontend
git push heroku main
```

### ✅ Your apps are live at:
- Backend: https://water-crisis-backend.herokuapp.com
- Frontend: https://water-crisis-frontend.herokuapp.com

---

## **Option 5: AWS (Most Scalable)**

### Step 1: Create AWS Account
- Go to https://aws.amazon.com
- Sign up for free tier

### Step 2: Create RDS Database
```bash
# Using AWS Console
1. RDS → Databases → Create Database
2. PostgreSQL, Free tier, db identifier: water-crisis-db
3. Note connection details
```

### Step 3: Create ElastiCache (Redis)
```bash
# Using AWS Console
1. ElastiCache → Clusters → Create
2. Engine: Redis, Cache node type: cache.t3.micro
3. Note endpoint
```

### Step 4: Deploy Backend on EC2

```bash
# Launch EC2 instance (Ubuntu 22.04)
# SSH into instance

sudo apt update
sudo apt install python3-pip python3-venv git
git clone https://github.com/YOUR_REPO/water-crisis-platform.git

cd water-crisis-platform/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env with RDS and ElastiCache details
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/water_crisis_db
REDIS_URL=redis://redis-endpoint:6379/0
JWT_SECRET_KEY=your-secret
DEBUG=False
EOF

# Start with Gunicorn
gunicorn app.main:app --workers 4 --bind 0.0.0.0:8000 &
```

### Step 5: Deploy Frontend on S3 + CloudFront

```bash
# Build
cd frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://water-crisis-frontend/ --delete

# Create CloudFront distribution pointing to S3

# Get URL: https://your-distribution-id.cloudfront.net
```

### ✅ AWS Deployment Complete!

---

## 📋 Quick Comparison

| Platform | Cost | Difficulty | Free Tier |
|----------|------|-----------|-----------|
| Render | $7+/mo | Easy | Yes (limited) |
| Railway | $5+/mo | Easy | Yes |
| Vercel | Free | Easy | ✅ |
| Heroku | Paid | Medium | No (free tier ended) |
| AWS | Pay-as-you-go | Hard | ✅ (12 months) |
| DigitalOcean | $4+/mo | Medium | ✅ ($200 credit) |

---

## 🔄 Continuous Deployment

### GitHub Actions (Auto-deploy on push)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to Render
      run: |
        curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }} \
          -H "Content-Type: application/json"
```

Configure deploy hooks from Render dashboard.

---

## 🆘 Common Issues During Deployment

### "ModuleNotFoundError"
```bash
# Ensure requirements.txt is in backend directory
# Update build command: pip install -r backend/requirements.txt
```

### "Database connection failed"
```bash
# Check DATABASE_URL format
# Ensure PostgreSQL is running
# Verify credentials in .env
```

### "CORS errors"
```bash
# Update CORS_ORIGINS in backend .env
# Add frontend URL: https://your-frontend.onrender.com
```

### "Frontend shows blank page"
```bash
# Check browser console (F12)
# Ensure VITE_API_URL points to correct backend
# Rebuild: npm run build
```

---

## 📞 Get Your Final Links

After deployment:

1. **Note your Backend URL** (e.g., https://water-crisis-backend.onrender.com)
2. **Note your Frontend URL** (e.g., https://water-crisis-frontend.onrender.com)
3. **Test the application**:
   - Visit frontend URL
   - Try login with sample credentials
   - Create sample data

---

## 🎉 Congratulations!

Your **Water Crisis Prediction & Management Platform** is now **LIVE** and accessible from anywhere!

### Next Steps:
1. ✅ Share the links with stakeholders
2. ✅ Add real water data to the database
3. ✅ Train ML models with actual data
4. ✅ Configure email notifications
5. ✅ Set up daily backups
6. ✅ Monitor application health

---

**Questions?** Check SETUP.md for detailed troubleshooting.
