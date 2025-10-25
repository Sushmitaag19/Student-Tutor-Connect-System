# Student-Tutor Platform API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All API responses follow this format:
```json
{
  "success": true|false,
  "message": "Description of the result",
  "data": { ... }
}
```

---

## Authentication Endpoints (`/api/auth`)

### Register User
**POST** `/api/auth/register`

**Body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student|tutor|admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "user_id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student"
    },
    "token": "jwt-token-here"
  }
}
```

### Login User
**POST** `/api/auth/login`

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "studentProfile": { ... }
    },
    "token": "jwt-token-here"
  }
}
```

### Get Current User
**GET** `/api/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "is_active": true,
      "last_login": "2024-01-01T00:00:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z",
      "studentProfile": { ... }
    }
  }
}
```

---

## User Management Endpoints (`/api/users`)

### Get All Users (Admin)
**GET** `/api/users?page=1&limit=10&role=student&search=john`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role (student|tutor|admin)
- `search` (optional): Search by name or email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "user_id": 1,
        "full_name": "John Doe",
        "email": "john@example.com",
        "role": "student",
        "is_active": true,
        "studentProfile": { ... }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

### Get User by ID
**GET** `/api/users/:user_id`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "studentProfile": { ... }
    }
  }
}
```

### Update User Profile
**PUT** `/api/users/:user_id`

**Body:**
```json
{
  "full_name": "John Smith",
  "email": "johnsmith@example.com"
}
```

### Update Student Profile
**PUT** `/api/users/:user_id/student`

**Body:**
```json
{
  "academic_level": "High School",
  "preferred_mode": "online",
  "budget": 50.00,
  "availability": "Weekends",
  "learning_goals": "Learn advanced mathematics",
  "subjects_of_interest": ["Mathematics", "Physics"]
}
```

### Update Tutor Profile
**PUT** `/api/users/:user_id/tutor`

**Body:**
```json
{
  "bio": "Experienced math tutor with 5 years of experience",
  "experience": "Teaching high school and college mathematics",
  "hourly_rate": 75.00,
  "preferred_mode": "online",
  "availability": "Monday-Friday 6-9 PM",
  "qualifications": ["Bachelor's in Mathematics", "Teaching Certificate"]
}
```

---

## Tutor Verification Endpoints (`/api/tutor-verification`)

### Submit Verification Data
**POST** `/api/tutor-verification/submit`

**Body:**
```json
{
  "test_score": 85,
  "qualifications": ["Bachelor's in Mathematics", "Teaching Certificate"],
  "documents": ["degree.pdf", "certificate.pdf"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification data submitted successfully",
  "data": {
    "verification": {
      "verification_id": 1,
      "tutor_id": 1,
      "test_score": 85,
      "is_auto_verified": true,
      "is_approved": false
    }
  }
}
```

### Get Verification Status
**GET** `/api/tutor-verification/status/:tutor_id`

**Response:**
```json
{
  "success": true,
  "data": {
    "verification": {
      "verification_id": 1,
      "tutor_id": 1,
      "test_score": 85,
      "is_auto_verified": true,
      "is_approved": false,
      "tutor": { ... }
    }
  }
}
```

### Get Pending Verifications (Admin)
**GET** `/api/tutor-verification/pending?page=1&limit=10`

### Approve Verification (Admin)
**PUT** `/api/tutor-verification/:verification_id/approve`

**Body:**
```json
{
  "approval_notes": "All qualifications verified successfully"
}
```

### Reject Verification (Admin)
**PUT** `/api/tutor-verification/:verification_id/reject`

**Body:**
```json
{
  "approval_notes": "Insufficient qualifications"
}
```

---

## Matching Endpoints (`/api/matching`)

### Get Tutor Recommendations
**GET** `/api/matching/recommendations/:student_id?limit=10&subject_id=1&min_rating=4.0&max_rate=100`

**Query Parameters:**
- `limit` (optional): Number of recommendations (default: 10)
- `subject_id` (optional): Filter by subject
- `min_rating` (optional): Minimum tutor rating
- `max_rate` (optional): Maximum hourly rate

**Response:**
```json
{
  "success": true,
  "data": {
    "student_id": 1,
    "recommendations": [
      {
        "tutor_id": 1,
        "user": {
          "full_name": "Jane Smith",
          "email": "jane@example.com"
        },
        "bio": "Experienced math tutor",
        "hourly_rate": 75.00,
        "average_rating": 4.8,
        "rating_count": 25,
        "match_probability": 0.92,
        "budget_match": true,
        "mode_match": true,
        "is_recommended": true,
        "subjects": [
          {
            "name": "Mathematics",
            "proficiency_level": "expert"
          }
        ]
      }
    ],
    "total_tutors": 50,
    "ml_service_available": true
  }
}
```

### Get Similar Students
**GET** `/api/matching/similar-students/:tutor_id?limit=10`

### Train ML Models (Admin)
**POST** `/api/matching/train-models`

### Get Matching Statistics (Admin)
**GET** `/api/matching/stats`

---

## Question Endpoints (`/api/questions`)

### Get All Questions
**GET** `/api/questions?page=1&limit=10&subject_id=1&is_resolved=false&search=math`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `subject_id` (optional): Filter by subject
- `is_resolved` (optional): Filter by resolution status
- `is_urgent` (optional): Filter urgent questions
- `search` (optional): Search in title and content
- `sort_by` (optional): Sort field (default: created_at)
- `sort_order` (optional): Sort order (ASC|DESC)

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "question_id": 1,
        "title": "How to solve quadratic equations?",
        "content": "I'm struggling with quadratic equations...",
        "tags": ["mathematics", "algebra"],
        "is_urgent": false,
        "is_resolved": false,
        "view_count": 15,
        "answer_count": 3,
        "created_at": "2024-01-01T00:00:00.000Z",
        "student": {
          "user": {
            "full_name": "John Doe"
          }
        },
        "subject": {
          "name": "Mathematics"
        },
        "answers": [ ... ]
      }
    ],
    "pagination": { ... }
  }
}
```

### Get Question by ID
**GET** `/api/questions/:question_id`

### Create Question
**POST** `/api/questions`

**Body:**
```json
{
  "title": "How to solve quadratic equations?",
  "content": "I'm struggling with quadratic equations and need help understanding the concept.",
  "subject_id": 1,
  "tags": ["mathematics", "algebra"],
  "is_urgent": false
}
```

### Update Question
**PUT** `/api/questions/:question_id`

### Delete Question
**DELETE** `/api/questions/:question_id`

### Mark Question as Resolved
**PUT** `/api/questions/:question_id/resolve`

### Get Trending Questions
**GET** `/api/questions/trending/trending?limit=10`

---

## Answer Endpoints (`/api/answers`)

### Get Answers for Question
**GET** `/api/answers/question/:question_id?page=1&limit=10&sort_by=created_at&sort_order=DESC`

### Get Answer by ID
**GET** `/api/answers/:answer_id`

### Create Answer
**POST** `/api/answers`

**Body:**
```json
{
  "question_id": 1,
  "content": "Here's how to solve quadratic equations step by step..."
}
```

### Update Answer
**PUT** `/api/answers/:answer_id`

### Delete Answer
**DELETE** `/api/answers/:answer_id`

### Mark as Best Answer
**PUT** `/api/answers/:answer_id/best`

### Vote on Answer
**POST** `/api/answers/:answer_id/vote`

**Body:**
```json
{
  "vote_type": "upvote|downvote"
}
```

---

## Rating Endpoints (`/api/ratings`)

### Submit Rating
**POST** `/api/ratings`

**Body:**
```json
{
  "tutor_id": 1,
  "session_id": 1,
  "rating": 5,
  "feedback": "Excellent tutor, very helpful!",
  "communication_rating": 5,
  "knowledge_rating": 5,
  "punctuality_rating": 4,
  "is_anonymous": false
}
```

### Get Tutor Ratings
**GET** `/api/ratings/tutor/:tutor_id?page=1&limit=10&sort_by=created_at&sort_order=DESC`

### Get Student Ratings
**GET** `/api/ratings/student/:student_id?page=1&limit=10`

### Get Rating by ID
**GET** `/api/ratings/:rating_id`

### Update Rating
**PUT** `/api/ratings/:rating_id`

### Delete Rating
**DELETE** `/api/ratings/:rating_id`

### Get Rating Statistics
**GET** `/api/ratings/tutor/:tutor_id/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "tutor_id": 1,
    "total_ratings": 25,
    "average_rating": 4.8,
    "rating_distribution": {
      "1": 0,
      "2": 1,
      "3": 2,
      "4": 7,
      "5": 15
    },
    "average_communication": 4.9,
    "average_knowledge": 4.8,
    "average_punctuality": 4.6
  }
}
```

---

## Session Endpoints (`/api/sessions`)

### Get All Sessions
**GET** `/api/sessions?page=1&limit=10&status=completed&student_id=1&tutor_id=1&subject_id=1&date_from=2024-01-01&date_to=2024-12-31`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status (pending|accepted|rejected|completed|cancelled)
- `student_id` (optional): Filter by student
- `tutor_id` (optional): Filter by tutor
- `subject_id` (optional): Filter by subject
- `date_from` (optional): Start date filter
- `date_to` (optional): End date filter
- `sort_by` (optional): Sort field (default: scheduled_date)
- `sort_order` (optional): Sort order (ASC|DESC)

### Get Session by ID
**GET** `/api/sessions/:session_id`

### Create Session Request
**POST** `/api/sessions`

**Body:**
```json
{
  "tutor_id": 1,
  "subject_id": 1,
  "title": "Advanced Calculus Session",
  "description": "Need help with integration techniques",
  "scheduled_date": "2024-01-15T18:00:00.000Z",
  "duration_minutes": 90,
  "mode": "online",
  "location": "Online via Zoom",
  "meeting_link": "https://zoom.us/j/123456789"
}
```

### Accept Session Request (Tutor)
**PUT** `/api/sessions/:session_id/accept`

### Reject Session Request (Tutor)
**PUT** `/api/sessions/:session_id/reject`

**Body:**
```json
{
  "reason": "Schedule conflict"
}
```

### Complete Session
**PUT** `/api/sessions/:session_id/complete`

### Cancel Session
**PUT** `/api/sessions/:session_id/cancel`

**Body:**
```json
{
  "reason": "Emergency came up"
}
```

### Update Session
**PUT** `/api/sessions/:session_id`

### Delete Session
**DELETE** `/api/sessions/:session_id`

### Get Session Statistics
**GET** `/api/sessions/stats/overview?student_id=1&tutor_id=1&date_from=2024-01-01&date_to=2024-12-31`

---

## Notification Endpoints (`/api/notifications`)

### Get User Notifications
**GET** `/api/notifications?page=1&limit=20&is_read=false&type=session_request`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `is_read` (optional): Filter by read status
- `type` (optional): Filter by notification type

### Get Unread Count
**GET** `/api/notifications/unread-count`

### Mark Notification as Read
**PUT** `/api/notifications/:notification_id/read`

### Mark All as Read
**PUT** `/api/notifications/mark-all-read`

### Delete Notification
**DELETE** `/api/notifications/:notification_id`

### Delete All Notifications
**DELETE** `/api/notifications/delete-all`

### Get Notification by ID
**GET** `/api/notifications/:notification_id`

---

## Leaderboard Endpoints (`/api/leaderboard`)

### Get Top Rated Tutors
**GET** `/api/leaderboard/top-tutors?limit=10&min_ratings=1`

### Get Top Q&A Contributors
**GET** `/api/leaderboard/top-contributors?limit=10&period=all`

**Query Parameters:**
- `limit` (optional): Number of results (default: 10)
- `period` (optional): Time period (week|month|all)

### Get Most Active Students
**GET** `/api/leaderboard/active-students?limit=10&period=all`

### Get Top Session Tutors
**GET** `/api/leaderboard/top-session-tutors?limit=10&period=all`

### Get User Ranking
**GET** `/api/leaderboard/user-ranking/:user_id`

### Get Leaderboard Statistics
**GET** `/api/leaderboard/stats`

---

## Admin Endpoints (`/api/admin`)

### Get Dashboard Overview
**GET** `/api/admin/dashboard/overview?period=30`

**Query Parameters:**
- `period` (optional): Number of days (default: 30)

### Get User Management Data
**GET** `/api/admin/users?page=1&limit=20&role=student&status=active&search=john&sort_by=created_at&sort_order=DESC`

### Get Tutor Verification Requests
**GET** `/api/admin/tutor-verifications?page=1&limit=20&status=pending&sort_by=created_at&sort_order=DESC`

### Get System Reports
**GET** `/api/admin/reports?type=sessions&period=30&start_date=2024-01-01&end_date=2024-12-31`

**Query Parameters:**
- `type` (optional): Report type (sessions|users|revenue|qa)
- `period` (optional): Number of days
- `start_date` (optional): Start date
- `end_date` (optional): End date

### Get System Health
**GET** `/api/admin/system/health`

### Get System Settings
**GET** `/api/admin/settings`

### Send System Announcement
**POST** `/api/admin/announcements`

**Body:**
```json
{
  "title": "System Maintenance",
  "message": "The system will be under maintenance from 2-4 AM",
  "target_role": "student"
}
```

### Get Admin Activity Log
**GET** `/api/admin/activity-log?page=1&limit=50&type=tutor_approved&start_date=2024-01-01&end_date=2024-12-31`

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Full name must be between 2 and 40 characters",
    "Please provide a valid email address"
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Registration**: 3 requests per hour per IP
- **Session Booking**: 10 requests per hour per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## File Uploads

### Upload Tutor Documents
**POST** `/api/users/:user_id/tutor/documents`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `documents`: Array of files (max 5 files, 5MB each)

**Supported File Types:**
- Images: jpeg, jpg, png, gif
- Documents: pdf, doc, docx

### Upload Profile Picture
**PUT** `/api/users/:user_id/tutor`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `profile_picture`: Single image file
- Other tutor profile fields

---

## Webhooks and Notifications

The system sends email notifications for:

- New session requests
- Session acceptance/rejection
- New answers to questions
- Rating received
- Tutor verification approval/rejection
- System announcements

Email templates are customizable and support HTML formatting.

---

## Testing

### Health Check
**GET** `/health`

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### ML Service Health
**GET** `http://localhost:5000/ml/health`

**Response:**
```json
{
  "success": true,
  "message": "ML service is running",
  "models_loaded": true
}
```

---

## SDKs and Libraries

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get user profile
const user = await api.get('/auth/me');

// Create session
const session = await api.post('/sessions', {
  tutor_id: 1,
  subject_id: 1,
  title: 'Math Session',
  scheduled_date: '2024-01-15T18:00:00.000Z',
  duration_minutes: 60,
  mode: 'online'
});
```

### Python
```python
import requests

headers = {'Authorization': f'Bearer {token}'}
base_url = 'http://localhost:3000/api'

# Get user profile
response = requests.get(f'{base_url}/auth/me', headers=headers)
user = response.json()

# Create session
session_data = {
    'tutor_id': 1,
    'subject_id': 1,
    'title': 'Math Session',
    'scheduled_date': '2024-01-15T18:00:00.000Z',
    'duration_minutes': 60,
    'mode': 'online'
}
response = requests.post(f'{base_url}/sessions', json=session_data, headers=headers)
session = response.json()
```

---

## Support

For API support and questions:
- Create an issue in the repository
- Contact the development team
- Check the system health endpoint for service status
