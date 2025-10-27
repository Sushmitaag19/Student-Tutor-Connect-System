# Student-Tutor Connect System Backend

A secure and efficient Node.js backend API with PostgreSQL database for the Student-Tutor Connect System.

## Features

- ✅ Secure database connection with connection pooling
- ✅ Parameterized queries to prevent SQL injection
- ✅ Password hashing with bcrypt
- ✅ Environment variable configuration
- ✅ Transaction support for data integrity
- ✅ Comprehensive error handling
- ✅ RESTful API endpoints

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Setup PostgreSQL database**
   
   Run the following SQL commands in your PostgreSQL client (e.g., psql, pgAdmin):
   
   ```sql
   CREATE DATABASE Student_tutor;

   \c Student_tutor

   CREATE TABLE users(
       user_id SERIAL PRIMARY KEY,
       full_name VARCHAR(40) NOT NULL,
       email VARCHAR(40) UNIQUE,
       password VARCHAR(40) NOT NULL,
       role VARCHAR(10) CHECK (role in ('student', 'tutor', 'admin')) NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE students(
       student_id SERIAL NOT NULL,
       user_id INT UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
       academic_level VARCHAR(50),
       preferred_mode VARCHAR(10) CHECK(preferred_mode IN ('online', 'offline', 'hybrid')),
       budget NUMERIC(10, 2),
       availability TEXT
   );

   CREATE TABLE tutors(
       tutor_id SERIAL PRIMARY KEY,
       user_id INT UNIQUE references users(user_id) ON DELETE CASCADE,
       bio TEXT,
       experience TEXT,
       hourly_rate NUMERIC(10, 2),
       preferred_mode VARCHAR(10) CHECK(preferred_mode IN ('online', 'offline', 'hybrid')),
       verified BOOLEAN DEFAULT FALSE,
       availability TEXT,
       profile_picture VARCHAR(255)
   );
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `backend` directory:
   
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your database credentials:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=Student_tutor
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your_secret_key_here
   APP_NAME=Student Tutor Connect System
   ```

## Running the Application

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "student"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### Tutor Endpoints

#### Create Tutor Profile
```http
POST /api/tutor/profile
Content-Type: application/json

{
  "user_id": 1,
  "bio": "Experienced tutor with 5 years of experience",
  "experience": "Teaching Mathematics and Physics",
  "hourly_rate": 25.50,
  "preferred_mode": "online",
  "availability": "Weekdays 9am-5pm",
  "profile_picture": "https://example.com/pic.jpg"
}
```

#### Get Tutor Profile
```http
GET /api/tutor/profile/:user_id
```

#### Get All Tutors
```http
GET /api/tutor/all
```

### Student Endpoints

#### Create Student Profile
```http
POST /api/student/profile
Content-Type: application/json

{
  "user_id": 2,
  "academic_level": "High School",
  "preferred_mode": "online",
  "budget": 100.00,
  "availability": "Weekends"
}
```

#### Get Student Profile
```http
GET /api/student/profile/:user_id
```

## Security Features

### 1. SQL Injection Prevention
All queries use parameterized statements with placeholders (`$1`, `$2`, etc.), preventing SQL injection attacks.

Example:
```javascript
await client.query('SELECT * FROM users WHERE email = $1', [email]);
```

### 2. Password Security
Passwords are hashed using bcrypt with a salt rounds of 10:
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

### 3. Connection Pooling
The database connection uses a pool to manage multiple concurrent connections efficiently:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

### 4. Environment Variables
Sensitive credentials are stored in `.env` file and loaded using `dotenv` package.

### 5. Input Validation
All endpoints validate required fields and data formats before processing.

### 6. Transaction Support
Critical operations use database transactions to ensure data consistency.

## File Structure

```
backend/
├── db.js                 # Database connection pool
├── server.js             # Express server setup
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── tutor.js         # Tutor routes
│   └── student.js       # Student routes
├── .env                 # Environment variables (not in git)
├── .env.example         # Environment variables template
├── package.json         # Dependencies
└── README.md           # This file
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

Status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## Testing the API

You can test the API using tools like:
- **Postman**
- **curl**
- **Thunder Client** (VS Code extension)

### Example: Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "password": "test123",
    "role": "tutor"
  }'
```

### Example: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "test123"
  }'
```

## Next Steps

To further enhance the API:

1. **Add JWT authentication** - Use jsonwebtoken for secure session management
2. **Add middleware** - Create authentication and authorization middleware
3. **Add logging** - Implement winston or morgan for request logging
4. **Add rate limiting** - Use express-rate-limit to prevent abuse
5. **Add CORS configuration** - Restrict CORS to specific origins
6. **Add validation middleware** - Use express-validator or joi

## Troubleshooting

**Database connection error:**
- Verify PostgreSQL is running
- Check `.env` file credentials
- Ensure database exists

**Port already in use:**
- Change `PORT` in `.env` file
- Or kill the process using the port

**Module not found:**
- Run `npm install` to install dependencies

## License

ISC

## Support

For issues or questions, please contact the development team.

