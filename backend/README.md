# Student-Tutor Platform Backend API

A comprehensive backend system for a Student-Tutor matching platform built with Node.js, Express, PostgreSQL, and a Python/Flask ML microservice.

## Features

### 🔐 Authentication & User Management
- JWT-based authentication with role-based access control
- User registration and login for students, tutors, and admins
- Profile management with image uploads
- Password hashing with bcrypt

### 👨‍🏫 Tutor Verification System
- Automated verification based on test scores (≥80%)
- Manual admin approval workflow
- Document and qualification management
- Auto-verification triggers

### 🤖 ML-Powered Matching System
- Python/Flask microservice for ML recommendations
- TF-IDF vectorization for content matching
- Collaborative filtering based on ratings
- Logistic regression for match probability
- Real-time tutor recommendations

### 💬 Q&A Knowledge Forum
- Question posting and answering system
- Voting mechanism (upvote/downvote)
- Best answer selection
- Subject-based categorization
- Trending questions

### ⭐ Rating & Feedback System
- Session-based rating system (1-5 stars)
- Detailed feedback categories (communication, knowledge, punctuality)
- Dynamic rating aggregation
- Anonymous rating option

### 📅 Session Booking & Scheduling
- Session request and approval workflow
- Calendar integration
- Multiple session modes (online/offline/hybrid)
- Conflict detection and resolution
- Session completion tracking

### 🔔 Notification System
- Real-time in-app notifications
- Email notifications for key events
- Notification preferences
- Bulk announcements

### 🏆 Leaderboard & Rewards
- Top-rated tutors leaderboard
- Q&A contribution rankings
- Most active students
- User ranking system

### 👨‍💼 Admin Dashboard
- User management and monitoring
- Tutor verification approval
- System analytics and reports
- Health monitoring
- System announcements

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with Sequelize ORM
- **JWT** for authentication
- **Multer** for file uploads
- **Nodemailer** for email services
- **Helmet** for security
- **Rate limiting** with express-rate-limit

### ML Microservice
- **Python** with Flask
- **scikit-learn** for machine learning
- **pandas** for data processing
- **TF-IDF** vectorization
- **Collaborative filtering**
- **Logistic regression**

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Python (v3.8 or higher)
- npm or yarn

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Environment Configuration:**
Create a `.env` file in the backend directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Student_tutor
DB_USER=postgres
DB_PASSWORD=mypassword

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# ML Microservice Configuration
ML_SERVICE_URL=http://localhost:5000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

3. **Database Setup:**
```bash
# Initialize database
node scripts/init-db.js

# Sync database models
node scripts/sync-db.js
```

4. **Start the server:**
```bash
npm start
# or for development
npm run dev
```

### ML Microservice Setup

1. **Navigate to ML service directory:**
```bash
cd backend/ml-service
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Start the ML service:**
```bash
python run_ml_service.py
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user profile
- `POST /logout` - User logout
- `POST /change-password` - Change password
- `GET /verify` - Verify JWT token

### Users (`/api/users`)
- `GET /` - Get all users (Admin)
- `GET /:user_id` - Get user by ID
- `PUT /:user_id` - Update user profile
- `PUT /:user_id/student` - Update student profile
- `PUT /:user_id/tutor` - Update tutor profile
- `POST /:user_id/tutor/documents` - Upload tutor documents
- `PUT /:user_id/deactivate` - Deactivate user (Admin)
- `PUT /:user_id/activate` - Activate user (Admin)
- `DELETE /:user_id` - Delete user (Admin)

### Tutor Verification (`/api/tutor-verification`)
- `POST /submit` - Submit verification data
- `GET /status/:tutor_id` - Get verification status
- `GET /pending` - Get pending verifications (Admin)
- `PUT /:verification_id/approve` - Approve verification (Admin)
- `PUT /:verification_id/reject` - Reject verification (Admin)
- `GET /stats` - Get verification statistics (Admin)

### Matching (`/api/matching`)
- `GET /recommendations/:student_id` - Get tutor recommendations
- `GET /similar-students/:tutor_id` - Get similar students
- `POST /train-models` - Train ML models (Admin)
- `GET /stats` - Get matching statistics (Admin)

### Questions (`/api/questions`)
- `GET /` - Get all questions
- `GET /:question_id` - Get question by ID
- `POST /` - Create new question
- `PUT /:question_id` - Update question
- `DELETE /:question_id` - Delete question
- `PUT /:question_id/resolve` - Mark as resolved
- `GET /student/:student_id` - Get questions by student
- `GET /trending/trending` - Get trending questions

### Answers (`/api/answers`)
- `GET /question/:question_id` - Get answers for question
- `GET /:answer_id` - Get answer by ID
- `POST /` - Create new answer
- `PUT /:answer_id` - Update answer
- `DELETE /:answer_id` - Delete answer
- `PUT /:answer_id/best` - Mark as best answer
- `POST /:answer_id/vote` - Vote on answer
- `GET /user/:user_id` - Get answers by user

### Ratings (`/api/ratings`)
- `POST /` - Submit rating
- `GET /tutor/:tutor_id` - Get tutor ratings
- `GET /student/:student_id` - Get student ratings
- `GET /:rating_id` - Get rating by ID
- `PUT /:rating_id` - Update rating
- `DELETE /:rating_id` - Delete rating
- `GET /tutor/:tutor_id/stats` - Get rating statistics

### Sessions (`/api/sessions`)
- `GET /` - Get all sessions
- `GET /:session_id` - Get session by ID
- `POST /` - Create session request
- `PUT /:session_id/accept` - Accept session (Tutor)
- `PUT /:session_id/reject` - Reject session (Tutor)
- `PUT /:session_id/complete` - Complete session
- `PUT /:session_id/cancel` - Cancel session
- `PUT /:session_id` - Update session
- `DELETE /:session_id` - Delete session
- `GET /stats/overview` - Get session statistics

### Notifications (`/api/notifications`)
- `GET /` - Get user notifications
- `GET /unread-count` - Get unread count
- `PUT /:notification_id/read` - Mark as read
- `PUT /mark-all-read` - Mark all as read
- `DELETE /:notification_id` - Delete notification
- `DELETE /delete-all` - Delete all notifications
- `GET /:notification_id` - Get notification by ID

### Leaderboard (`/api/leaderboard`)
- `GET /top-tutors` - Get top rated tutors
- `GET /top-contributors` - Get top Q&A contributors
- `GET /active-students` - Get most active students
- `GET /top-session-tutors` - Get top session tutors
- `GET /user-ranking/:user_id` - Get user ranking
- `GET /stats` - Get leaderboard statistics

### Admin (`/api/admin`)
- `GET /dashboard/overview` - Get dashboard overview
- `GET /users` - Get user management data
- `GET /tutor-verifications` - Get verification requests
- `GET /reports` - Get system reports
- `GET /system/health` - Get system health
- `GET /settings` - Get system settings
- `POST /announcements` - Send system announcement
- `GET /activity-log` - Get admin activity log

## Database Schema

The system uses the following main tables:

- **users** - User accounts and authentication
- **students** - Student profiles and preferences
- **tutors** - Tutor profiles and qualifications
- **subjects** - Available subjects/courses
- **tutor_subjects** - Tutor-subject relationships
- **sessions** - Booking and scheduling
- **ratings** - Feedback and ratings
- **questions** - Q&A forum questions
- **answers** - Q&A forum answers
- **votes** - Answer voting system
- **notifications** - User notifications
- **tutor_verifications** - Verification data

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection with Helmet
- CORS configuration

## ML Integration

The ML microservice provides:
- **TF-IDF vectorization** for content matching
- **Collaborative filtering** based on user ratings
- **Logistic regression** for match probability
- Real-time recommendations
- Model training and retraining

## Deployment

### Production Considerations

1. **Environment Variables:**
   - Set strong JWT secrets
   - Configure production database
   - Set up email service
   - Configure ML service URL

2. **Database:**
   - Use connection pooling
   - Set up regular backups
   - Monitor performance

3. **Security:**
   - Use HTTPS
   - Set up proper CORS
   - Configure rate limiting
   - Monitor for attacks

4. **Monitoring:**
   - Set up logging
   - Monitor system health
   - Track performance metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.
