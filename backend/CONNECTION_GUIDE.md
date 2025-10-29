# Database Connection Verification Guide

This guide provides step-by-step instructions to verify the connection between the frontend and PostgreSQL database `Student_tutor`.

## Prerequisites

1. **PostgreSQL Server** must be installed and running
2. **Node.js and npm** installed
3. **Database `Student_tutor`** exists with proper schema

## Step 1: Verify PostgreSQL Installation

### On Windows:
```bash
# Check if PostgreSQL is running
sc query postgresql-x64-[version]

# Or check in Task Manager for postgres.exe process
```

### On Linux/Mac:
```bash
# Check if PostgreSQL service is running
sudo systemctl status postgresql
# or
pg_isready
```

## Step 2: Create the Database

Run the database setup script to create tables and insert test data:

```bash
cd backend
psql -U postgres -f database_setup.sql
```

Or manually:
```bash
psql -U postgres
CREATE DATABASE Student_tutor;
\c Student_tutor
# Then copy and paste the contents of database_setup.sql
```

## Step 3: Configure Environment Variables

The configuration is in `backend/connection.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Student_tutor
DB_USER=postgres
DB_PASSWORD=your_password_here
```

**Important:** Update the `DB_PASSWORD` with your actual PostgreSQL password.

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

## Step 5: Start the Backend Server

```bash
npm start
```

You should see:
```
📡 Initializing database connection with config: { ... }
✅ Database connected successfully
📊 Connection details: { database: 'Student_tutor', host: 'localhost', port: 5432 }
🚀 Server running on http://localhost:5000
```

## Step 6: Test Database Connection

### Test 1: Verify Server is Running
```bash
curl http://localhost:5000
```

Expected response:
```json
{
  "message": "Student Tutor Connect System API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

### Test 2: Test Database Connection
```bash
curl http://localhost:5000/api/test/connection
```

Expected response:
```json
{
  "status": "success",
  "message": "Database connection established",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "postgres_version": "PostgreSQL 14.x",
  "connection_info": {
    "host": "localhost",
    "port": "5432",
    "database": "Student_tutor"
  }
}
```

### Test 3: Verify Database Schema
```bash
curl http://localhost:5000/api/test/schema
```

Expected response:
```json
{
  "status": "success",
  "message": "Schema check completed",
  "tables": ["students", "tutors", "users"],
  "table_count": 3,
  "expected_tables": ["users", "students", "tutors"],
  "all_tables_present": true
}
```

### Test 4: Test Read Operation (Admin User)
```bash
curl http://localhost:5000/api/test/admin
```

Expected response:
```json
{
  "status": "success",
  "message": "Admin user retrieved successfully",
  "admin_user": {
    "user_id": 1,
    "full_name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "total_admins": 1
}
```

### Test 5: Test Write Operation (Register New User)

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test Student",
    "email": "test@example.com",
    "password": "test123",
    "role": "student"
  }'
```

Expected response:
```json
{
  "message": "User registered successfully",
  "user": {
    "user_id": 2,
    "full_name": "Test Student",
    "email": "test@example.com",
    "role": "student",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

## Troubleshooting

### Error: "Failed to connect to database"

**Possible causes:**
1. PostgreSQL service is not running
2. Wrong database credentials
3. Database doesn't exist
4. Connection refused on the specified port

**Solutions:**
- Check PostgreSQL is running: `sudo systemctl status postgresql` (Linux) or check Task Manager (Windows)
- Verify credentials in `connection.env`
- Create database: `psql -U postgres -c "CREATE DATABASE Student_tutor;"`
- Check port: `psql -U postgres -c "SHOW port;"`

### Error: "Authentication failed"

**Possible causes:**
1. Incorrect password in `connection.env`
2. PostgreSQL password authentication method issue

**Solutions:**
- Update `DB_PASSWORD` in `connection.env`
- Check `pg_hba.conf` for authentication settings

### Error: "Database does not exist"

**Solution:**
```bash
# Create the database
createdb -U postgres Student_tutor

# Or via psql
psql -U postgres
CREATE DATABASE Student_tutor;
\q
```

## Security Features Implemented

✅ **Parameterized Queries** - Prevents SQL injection  
✅ **Password Hashing** - Uses bcrypt for secure password storage  
✅ **Input Validation** - Validates email format, password length, role values  
✅ **Transaction Management** - Ensures data integrity  
✅ **Error Handling** - Comprehensive error messages  
✅ **Connection Pooling** - Efficient database connections

## API Endpoints

### Test Endpoints
- `GET /api/test/connection` - Test database connection
- `GET /api/test/admin` - Retrieve admin user
- `GET /api/test/users` - List all users
- `GET /api/test/schema` - Verify database schema

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Student Endpoints
- `POST /api/student/profile` - Create student profile
- `GET /api/student/profile/:user_id` - Get student profile

### Tutor Endpoints
- `POST /api/tutor/profile` - Create tutor profile
- `GET /api/tutor/profile/:user_id` - Get tutor profile
- `GET /api/tutor/all` - Get all tutors

## Database Schema

The database uses the following structure:

### Tables
1. **users** - Core user information
2. **students** - Student-specific profiles
3. **tutors** - Tutor-specific profiles

### Relationships
- `students.user_id` → `users.user_id` (Foreign Key with CASCADE)
- `tutors.user_id` → `users.user_id` (Foreign Key with CASCADE)

## Next Steps

1. ✅ Connection verified
2. ✅ Database schema validated
3. ✅ Read operations tested
4. ✅ Write operations tested
5. 🔄 Integrate with frontend forms
6. 🔄 Add authentication middleware
7. 🔄 Implement JWT tokens

## Testing Checklist

- [ ] PostgreSQL service is running
- [ ] Database `Student_tutor` exists
- [ ] Backend server starts without errors
- [ ] Connection test passes
- [ ] Schema validation passes
- [ ] Admin user can be retrieved
- [ ] New user registration works
- [ ] Login functionality works

---

For more information, see `README.md` and `QUICK_START.md`


