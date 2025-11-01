# Hybrid Student-Tutor Recommendation System

A Flask-based recommendation engine that combines Content-Based Filtering (Logistic Regression) and Collaborative Filtering to provide personalized tutor recommendations for students.

## Architecture

The system implements a hybrid recommendation approach:

1. **Content-Based Filtering (Logistic Regression)**: Matches tutor profiles to student preferences based on features like subject, mode, experience, price, and ratings.
2. **Collaborative Filtering (User-Based CF)**: Uses similarity between students based on their past tutor ratings/preferences.
3. **Hybrid Combination**: Combines both scores with weights: `FinalScore = (0.6 × LogisticScore) + (0.4 × CFScore)`

## Features

- ✅ Manual implementation of cosine similarity (using NumPy)
- ✅ Manual implementation of logistic regression scoring
- ✅ Minimal library dependencies (only Flask, Flask-CORS, NumPy)
- ✅ Mock data for testing without database
- ✅ RESTful API endpoint for recommendations

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements_recommendation.txt
```

## Running the Service

Start the Flask recommendation service:

```bash
cd backend
python recommendation_app.py
```

The service will run on `http://localhost:5001`

## API Endpoints

### 1. Get Recommendations

**Endpoint:** `GET /api/recommendations` or `POST /api/recommendations`

**Parameters (GET query or POST JSON body):**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `subject` | string | No | 'Math' | Preferred subject (Math, Physics, English, etc.) |
| `mode` | string | No | 'Online' | Preferred mode (Online, Offline, Hybrid) |
| `level` | string | No | 'High School' | Academic level (High School, University, etc.) |
| `preferred_price_range` | string | No | 'medium' | Price preference (low, medium, high) |
| `experience_preference` | string | No | 'intermediate' | Experience level (beginner, intermediate, advanced) |
| `student_id` | string | No | None | Student ID for collaborative filtering |
| `top_k` | integer | No | None | Number of top recommendations to return |

**Example Request (GET):**
```
GET http://localhost:5001/api/recommendations?subject=Math&mode=Online&level=High School&top_k=5
```

**Example Request (POST):**
```json
{
  "subject": "Math",
  "mode": "Online",
  "level": "High School",
  "preferred_price_range": "medium",
  "experience_preference": "intermediate",
  "student_id": "student_1",
  "top_k": 5
}
```

**Example Response:**
```json
{
  "success": true,
  "student_preferences": {
    "subject": "Math",
    "mode": "Online",
    "level": "High School",
    "preferred_price_range": "medium",
    "experience_preference": "intermediate"
  },
  "student_id": "student_1",
  "total_recommendations": 8,
  "recommendations": [
    {
      "tutor_id": "tutor_1",
      "tutor_name": "Dr. Alice Johnson",
      "subject": "Math",
      "mode": "Online",
      "experience_years": 5,
      "hourly_rate": 800,
      "rating": 4.8,
      "location": "Kathmandu",
      "scores": {
        "logistic_score": 0.8542,
        "cf_score": 0.9400,
        "final_score": 0.8885
      }
    },
    ...
  ]
}
```

### 2. Get Mock Data

**Endpoint:** `GET /api/recommendations/mock-data`

Returns all mock students and tutors for testing.

### 3. Health Check

**Endpoint:** `GET /api/recommendations/health`

Returns service status.

## Algorithm Details

### Logistic Regression (Content-Based)

**Formula:** `P(Match) = 1 / (1 + e^(-(β₀ + Σβᵢxᵢ)))`

**Features:**
- Subject match (binary)
- Mode match (binary)
- Experience years (normalized)
- Hourly rate (normalized based on price preference)
- Education level (encoded)
- Rating (normalized)

**Model Weights:**
- Intercept (β₀): -0.5
- Subject match: 2.5
- Mode match: 1.8
- Experience: 1.2
- Price: 0.8
- Education: 1.0
- Rating: 1.5

### Collaborative Filtering

**Similarity Metric:** Cosine Similarity

**Formula:** `cos(θ) = (A · B) / (||A|| × ||B||)`

**Prediction:** Weighted average of similar users' ratings

### Hybrid Score

**Formula:** `FinalScore = (0.6 × LogisticScore) + (0.4 × CFScore)`

- 60% weight on content-based matching
- 40% weight on collaborative filtering

## File Structure

```
backend/
├── recommendation_system.py    # Core recommendation logic
├── recommendation_app.py         # Flask application
├── requirements_recommendation.txt # Python dependencies
└── RECOMMENDATION_SYSTEM_README.md # This file
```

## Integration with Main Application

The recommendation service runs as a separate Flask application on port 5001. To integrate with the main Node.js/Express server:

1. **Option 1:** Run both services separately (recommended for development)
   - Express server on port 5000
   - Recommendation service on port 5001

2. **Option 2:** Add a proxy route in Express to forward requests:
   ```javascript
   app.get('/api/recommendations', async (req, res) => {
     const response = await fetch('http://localhost:5001/api/recommendations?' + new URLSearchParams(req.query));
     const data = await response.json();
     res.json(data);
   });
   ```

## Testing

Test the recommendation system using curl or Postman:

```bash
# Get recommendations for a Math student
curl "http://localhost:5001/api/recommendations?subject=Math&mode=Online&level=High%20School&top_k=3"

# Post request with JSON
curl -X POST http://localhost:5001/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Physics",
    "mode": "Hybrid",
    "level": "University",
    "student_id": "student_2",
    "top_k": 5
  }'
```

## Future Enhancements

- [ ] Connect to PostgreSQL database instead of mock data
- [ ] Implement model training pipeline for Logistic Regression weights
- [ ] Add item-based collaborative filtering option
- [ ] Implement matrix factorization for sparse data
- [ ] Add caching for frequent queries
- [ ] Implement A/B testing framework
- [ ] Add explainability features (why this recommendation?)

## Notes

- The system uses mock data and doesn't require a database connection
- All similarity and scoring calculations use basic NumPy operations
- The logistic regression uses pre-defined weights (can be replaced with trained model)
- Cosine similarity is implemented manually without scikit-learn

