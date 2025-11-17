# Uçak Departmanı Paneli (Flight Department Panel)

A full-stack web application for managing flight and passenger data, generating Excel files from PDFs, and comparing data between Excel files and database.

## Features

- 🔐 **Authentication System**: JWT-based authentication with MongoDB user management
- 📄 **Excel Builder**: Convert PDFs and raw text to standardized Excel files
- 📊 **Data Management**: CRUD operations for flights and passengers (PostgreSQL)
- 🔄 **Comparison System**: Compare Excel files and database records with color-coded differences
- 📝 **Action Logging**: All user actions are logged in MongoDB

## Tech Stack

### Backend
- Node.js + Express (TypeScript)
- PostgreSQL (Prisma ORM)
- MongoDB (Mongoose)
- JWT authentication with httpOnly cookies
- PDF parsing (pdf-parse)
- Excel generation/reading (exceljs)

### Frontend
- React + TypeScript
- Vite
- TailwindCSS
- Radix UI components

## Project Structure

```
ucak-departmani-panel/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connections
│   │   ├── models/          # MongoDB models (User, Logs)
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (PDF, Excel, Comparison)
│   │   ├── middleware/      # Auth middleware
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # PostgreSQL schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # Auth context
│   │   ├── lib/             # API client, utils
│   │   ├── pages/           # Pages (Login, Panel)
│   │   └── main.tsx
│   └── package.json
└── docker-compose.yml       # MongoDB + PostgreSQL setup
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- Docker and Docker Compose (for databases)
- npm or yarn

### 1. Start Databases

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- MongoDB on port 27017

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# MONGODB_URI=mongodb://localhost:27017/ucak-departmani
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ucak_departmani?schema=public
# JWT_SECRET=your-secret-key
# FRONTEND_URL=http://localhost:3000

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Create initial admin user (run once)
npm run setup:user

# Start development server
npm run dev
```

Backend runs on http://localhost:3001

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on http://localhost:3000

### 4. Create Initial User

You can create the first user using a setup script (create `backend/src/scripts/createUser.ts`):

```bash
# In backend directory
npx tsx src/scripts/createUser.ts
```

Or use MongoDB directly:

```javascript
// In MongoDB shell or Compass
db.users.insertOne({
  username: "admin",
  email: "admin@example.com",
  passwordHash: "<bcrypt_hash>", // Use bcrypt to hash password
  roles: ["admin", "user"],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Flights
- `GET /api/flights` - List flights (with pagination)
- `GET /api/flights/:id` - Get single flight
- `POST /api/flights` - Create flight
- `PUT /api/flights/:id` - Update flight
- `DELETE /api/flights/:id` - Delete flight

### Passengers
- `GET /api/passengers/flight/:flightId` - Get passengers for a flight
- `GET /api/passengers/:id` - Get single passenger
- `POST /api/passengers` - Create passenger
- `PUT /api/passengers/:id` - Update passenger
- `DELETE /api/passengers/:id` - Delete passenger

### Excel
- `POST /api/excel/build` - Generate Excel from PDFs/text (multipart/form-data)

### Comparison
- `POST /api/compare/excel-to-excel` - Compare two Excel files
- `POST /api/compare/excel-to-db` - Compare Excel with database

## Usage

1. **Login**: Use your credentials to access the panel
2. **Excel Builder**: Upload PDFs, select company, and generate Excel files
3. **Data Management**: Manage flights and passengers via the UI
4. **Comparison**: Compare Excel files or Excel vs database to see differences

## Development

### Backend
```bash
cd backend
npm run dev        # Watch mode
npm run build      # Build
npm start          # Production
```

### Frontend
```bash
cd frontend
npm run dev        # Development server
npm run build      # Build for production
npm run preview    # Preview production build
```

## Environment Variables

See `.env.example` files in backend directory for required environment variables.

## Notes

- PDF text extraction uses regex patterns - you may need to customize `textExtractor.ts` based on your PDF formats
- Excel template path can be set via `EXCEL_TEMPLATE_PATH` environment variable
- All actions are logged in MongoDB for audit purposes

## License

ISC

# flight-department-web
