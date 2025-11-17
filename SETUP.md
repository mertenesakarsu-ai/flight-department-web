# Quick Setup Guide

## Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose installed
- Terminal/Command prompt access

## Step-by-Step Setup

### 1. Start Databases

```bash
# From project root
docker-compose up -d
```

Wait for databases to start (check with `docker-compose ps`).

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example and edit)
# Set these values:
# - MONGODB_URI=mongodb://localhost:27017/ucak-departmani
# - DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ucak_departmani?schema=public
# - JWT_SECRET=your-secret-key-change-this
# - FRONTEND_URL=http://localhost:3000
# - PORT=3001

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Create initial admin user (username: admin, password: admin123)
npm run setup:user

# Start backend server (runs on http://localhost:3001)
npm run dev
```

### 3. Frontend Setup

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start frontend server (runs on http://localhost:3000)
npm run dev
```

### 4. Access the Application

1. Open browser to http://localhost:3000
2. Login with:
   - Username: `admin`
   - Password: `admin123` (or the password you set)

## Troubleshooting

### Database Connection Issues
- Check Docker containers: `docker-compose ps`
- Restart containers: `docker-compose restart`
- Check logs: `docker-compose logs postgres` or `docker-compose logs mongodb`

### Backend Issues
- Ensure .env file exists and has correct values
- Check MongoDB is accessible: `mongosh mongodb://localhost:27017/ucak-departmani`
- Check PostgreSQL: `psql postgresql://postgres:postgres@localhost:5432/ucak_departmani`

### Frontend Issues
- Clear browser cache
- Check browser console for errors
- Ensure backend is running on port 3001

## Next Steps

1. Create additional users via the MongoDB interface or create a user management script
2. Customize PDF text extraction patterns in `backend/src/services/textExtractor.ts` based on your PDF formats
3. Optionally create an Excel template file and set `EXCEL_TEMPLATE_PATH` in .env
4. Configure production environment variables

