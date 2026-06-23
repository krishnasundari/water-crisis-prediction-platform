# 🚀 Complete Setup & Deployment Guide

## 📦 Project Structure

```
water-crisis-platform/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/routes/        # API endpoints
│   │   ├── core/              # Configuration
│   │   ├── db/                # Database
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── main.py            # FastAPI app
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment template
│   └── Dockerfile             # Backend container
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── store/             # Redux store
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utilities
│   │   ├── App.tsx            # Main App
│   │   └── main.tsx           # Entry point
│   ├── public/                # Static files
│   ├── package.json           # NPM dependencies
│   ├── tsconfig.json          # TypeScript config
│   ├── vite.config.ts         # Vite config
│   └── Dockerfile             # Frontend container
│
├── docker-compose.yml         # Multi-container orchestration
├── nginx.conf                 # Nginx reverse proxy
└── README.md                  # Project overview
```

---

## 🛠️ STEP 1: Local Development Setup

### Prerequisites

- **Node.js 16+** (Frontend)
  - Download: https://nodejs.org/
  
- **Python 3.10+** (Backend)
  - Download: https://www.python.org/downloads/
  
- **PostgreSQL 14+** (Database)
  - Download: https://www.postgresql.org/download/
  
- **Redis** (Caching)
  - Download: https://redis.io/download
  - On Windows: Use Windows Subsystem for Linux (WSL) or Docker

- **Docker & Docker Compose** (Optional, for containerization)
  - Download: https://www.docker.com/products/docker-desktop

### Step 1.1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Important: Update DATABASE_URL with your PostgreSQL credentials
```

**Edit `.backend/.env`:**

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/water_crisis_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
DEBUG=True
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
```

### Step 1.2: Frontend Setup

```bash
# Open new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env
```

### Step 1.3: Database Setup

**Using PostgreSQL command line:**

```bash
# Create database
createdb water_crisis_db

# Create user
createuser water_user

# Set password
ALTER USER water_user WITH PASSWORD 'water_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE water_crisis_db TO water_user;
```

**Or using pgAdmin (GUI):**

1. Open pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `water_crisis_db`
4. Owner: `water_user`
5. Click Save

### Step 1.4: Create Database Tables

```bash
cd backend

# Run migrations (when created)
alembic upgrade head

# Or manually create tables using models
python -c "from app.db.database import engine, Base; from app.models.models import *; Base.metadata.create_all(bind=engine)"
```

---

## ▶️ STEP 2: Run Applications Locally

### Terminal 1: Start Backend

```bash
cd backend

# Activate virtual environment (if not already)
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:** http://localhost:8000

**API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Terminal 2: Start Frontend

```bash
cd frontend

# Start development server
npm run dev
```

**Frontend will be available at:** http://localhost:5173

### Terminal 3: Redis (if not using Docker)

```bash
# On Windows with WSL or using installed Redis
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Terminal 4: PostgreSQL (if not running)

```bash
# Using Docker
docker run -d \
  -e POSTGRES_USER=water_user \
  -e POSTGRES_PASSWORD=water_password \
  -e POSTGRES_DB=water_crisis_db \
  -p 5432:5432 \
  postgres:15-alpine
```

---

## 🐳 STEP 3: Using Docker Compose (Recommended)

### Prerequisites

- Docker and Docker Compose installed

### Quick Start

```bash
# From project root directory
docker-compose up --build

# This starts:
# - PostgreSQL on port 5432
# - Redis on port 6379
# - Backend (FastAPI) on port 8000
# - Frontend (React) on port 3000
# - Nginx on port 80
```

### Wait for services to be healthy

```bash
# Check services status
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service
docker-compose logs backend
docker-compose logs frontend
```

### Access applications

- **Frontend**: http://localhost
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Stop Docker containers

```bash
docker-compose down

# Remove volumes (CAUTION: Deletes data)
docker-compose down -v
```

---

## 📝 STEP 4: Creating Sample Data

### Create Admin User

```bash
# In backend virtual environment, use Python shell

cd backend
python

# Paste the following:
from app.db.database import SessionLocal, engine, Base
from app.models.models import User, Role
from app.services.auth_service import hash_password

# Create tables if not exist
Base.metadata.create_all(bind=engine)

# Create session
db = SessionLocal()

# Create roles
admin_role = Role(name="admin", description="Administrator")
analyst_role = Role(name="analyst", description="Data Analyst")
officer_role = Role(name="government_officer", description="Government Officer")

db.add_all([admin_role, analyst_role, officer_role])
db.commit()
db.refresh(admin_role)

# Create admin user
admin_user = User(
    email="admin@water.gov",
    username="admin",
    full_name="Admin User",
    hashed_password=hash_password("Admin@123"),
    role_id=admin_role.id,
    is_active=True
)

db.add(admin_user)
db.commit()

print("✅ Admin user created!")
print("Email: admin@water.gov")
print("Password: Admin@123")

db.close()
exit()
```

### Test Login

```bash
# Using curl
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@water.gov","password":"Admin@123"}'

# Or use the Swagger UI at http://localhost:8000/docs
```

---

## 🌐 STEP 5: Production Deployment

### Option A: Render.com (Easiest)

1. **Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/water-crisis-platform.git
git push -u origin main
```

2. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

3. **Deploy Backend**
   - Create new "Web Service"
   - Connect GitHub repo
   - Name: `water-crisis-backend`
   - Root Directory: `backend`
   - Environment: Python 3.10
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - Add environment variables from `.env`

4. **Deploy Frontend**
   - Create new "Static Site"
   - Connect GitHub repo
   - Name: `water-crisis-frontend`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Update frontend `.env` to point to backend URL

5. **Get Live Links**
   - Render provides URLs like: `water-crisis-backend.onrender.com`
   - Update frontend API URL to backend service

### Option B: Railway.app

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up

# Get deployment URL
railway open
```

### Option C: AWS Deployment

```bash
# Push Docker images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker build -t water-crisis-backend ./backend
docker tag water-crisis-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/water-crisis-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/water-crisis-backend:latest

# Use ECS or EKS for orchestration
```

### Option D: DigitalOcean App Platform

```bash
# Create app.yaml
cat > app.yaml << 'EOF'
name: water-crisis-platform
services:
- name: backend
  github:
    repo: YOUR_GITHUB_REPO
    branch: main
  build_command: pip install -r requirements.txt
  http_port: 8000
  run_command: gunicorn app.main:app --workers 4 --bind 0.0.0.0:$PORT
  envs:
  - key: DATABASE_URL
    value: ${{db.database_engine}}://${{db.username}}:${{db.password}}@${{db.hostname}}:${{db.port}}/${{db.database}}
databases:
- name: db
  engine: PG
  version: "14"
EOF

# Deploy using doctl CLI
doctl apps create --spec app.yaml
```

---

## 🧪 STEP 6: Testing

### Backend API Testing

```bash
# Run tests
cd backend
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### Frontend Testing

```bash
cd frontend

# Run tests
npm run test

# With coverage
npm run test:coverage
```

### Manual Testing

1. **Register a user**: Visit frontend and complete signup
2. **Login**: Use credentials
3. **Create sample village**: Use village management page
4. **View predictions**: Submit prediction request
5. **Check dashboard**: Verify all metrics display

---

## 🐛 Troubleshooting

### Backend Issues

**Error: `Connection refused` (PostgreSQL)**
```bash
# Check PostgreSQL is running
sudo service postgresql start  # Linux
brew services start postgresql  # Mac
# Or use Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
```

**Error: `ModuleNotFoundError`**
```bash
# Ensure virtual environment is activated
# Re-install requirements
pip install -r requirements.txt
```

**Error: `JWT_SECRET_KEY` in .env not found**
```bash
# Copy .env.example
cp .env.example .env
# Edit with your values
```

### Frontend Issues

**Error: `npm ERR! code ERESOLVE`**
```bash
# Use legacy peer deps
npm install --legacy-peer-deps
```

**Error: API requests failing (CORS)**
```bash
# Ensure backend CORS_ORIGINS includes frontend URL
# Add to backend .env:
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Error: Blank page in browser**
```bash
# Check browser console for errors (F12)
# Check network tab for failed requests
# Verify backend is running (curl http://localhost:8000/health)
```

### Docker Issues

**Error: `port is already in use`**
```bash
# Change port in docker-compose.yml or kill existing process
# Windows:
netstat -ano | findstr :5432
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :5432
kill -9 <PID>
```

**Error: `Docker daemon not running`**
```bash
# Start Docker Desktop or daemon
# Or use WSL on Windows
```

---

## 📊 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379/0` |
| `JWT_SECRET_KEY` | JWT signing key | `your-secret-key` |
| `DEBUG` | Debug mode | `True` or `False` |
| `ENVIRONMENT` | Environment type | `development` or `production` |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:3000` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

---

## 📚 Useful Commands

```bash
# Backend
cd backend
python -m venv venv          # Create virtual environment
source venv/bin/activate     # Activate (Mac/Linux)
venv\Scripts\activate        # Activate (Windows)
pip install -r requirements.txt  # Install dependencies
uvicorn app.main:app --reload   # Run server with reload
pytest tests/ -v             # Run tests

# Frontend
cd frontend
npm install                  # Install dependencies
npm run dev                  # Start dev server
npm run build                # Build for production
npm run lint                 # Run linter
npm run test                 # Run tests

# Docker
docker-compose up --build    # Start all services
docker-compose down          # Stop all services
docker-compose logs -f       # View logs
docker ps                    # List running containers

# Database
psql -U water_user -d water_crisis_db  # Connect to database
\dt                          # List tables
\d users                     # Describe users table
```

---

## 🎓 Learning Resources

- **FastAPI**: https://fastapi.tiangolo.com/
- **React**: https://react.dev/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **Docker**: https://docs.docker.com/

---

## 📞 Support & Help

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review **README.md** for architecture overview
3. Check **Backend API Docs**: http://localhost:8000/docs
4. Review logs: `docker-compose logs backend`
5. Create GitHub issue with error details

---

## ✅ Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Set `DEBUG=False` in production
- [ ] Generate strong `JWT_SECRET_KEY`
- [ ] Configure database backups
- [ ] Set up SSL certificate
- [ ] Configure custom domain
- [ ] Set up email notifications
- [ ] Enable monitoring & logging
- [ ] Create admin user
- [ ] Test all critical workflows
- [ ] Document deployment steps
- [ ] Set up CI/CD pipeline

---

**🎉 You're all set! Your Water Crisis Platform is ready for development and deployment.**

For production deployment links and custom domain setup, follow the specific platform instructions above.
