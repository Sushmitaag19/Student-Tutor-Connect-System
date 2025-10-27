# Quick Start Guide

## Step 1: Install Dependencies

Navigate to the backend directory and install all required packages:

```bash
cd backend
npm install
```

This will install:
- `express` - Web framework
- `pg` - PostgreSQL client
- `bcrypt` - Password hashing
- `dotenv` - Environment variables
- `cors` - Cross-origin resource sharing
- `express-validator` - Input validation

## Step 2: Setup PostgreSQL Database

1. Make sure PostgreSQL is installed and running on your system

2. Open PostgreSQL command line or pgAdmin and run the SQL file:
   ```bash
   psql -U your_username -f database_setup.sql
   ```
   
   Or manually run the contents of `database_setup.sql`

## Step 3: Configure Environment Variables

1. Create a `.env` file in the backend directory:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your actual database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=Student_tutor
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   
   PORT=5000
   NODE_ENV=development
   ```

## Step 4: Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The API will be available at: `http://localhost:5000`

## Step 5: Test the API

### Test User Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "test123",
    "role": "student"
  }'
```

### Test User Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "test123"
  }'
```

### Test Creating Tutor Profile

```bash
curl -X POST http://localhost:5000/api/tutor/profile \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "bio": "Experienced tutor",
    "experience": "5 years teaching",
    "hourly_rate": 25.50,
    "preferred_mode": "online",
    "availability": "Weekdays 9am-5pm"
  }'
```

## API Base URL

```
http://localhost:5000/api
```

## Available Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/tutor/profile` - Create tutor profile
- `GET /api/tutor/profile/:user_id` - Get tutor profile
- `GET /api/tutor/all` - Get all tutors
- `POST /api/student/profile` - Create student profile
- `GET /api/student/profile/:user_id` - Get student profile

## Troubleshooting

**"Database connection error"**
- Make sure PostgreSQL is running: `pg_isready`
- Check your `.env` file has correct credentials
- Verify database exists: `psql -l`

**"Port already in use"**
- Change PORT in `.env` file to a different port
- Or kill the process: `npx kill-port 5000`

**"Cannot find module"**
- Run `npm install` to install dependencies

## Next Steps

See [README.md](README.md) for detailed documentation.

