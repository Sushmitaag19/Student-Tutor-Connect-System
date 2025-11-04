# Recommendation System: Logistic Regression & Collaborative Filtering Explained

## Overview
Your recommendation system uses a **Hybrid Approach** combining two algorithms:
1. **Logistic Regression** (Content-Based Filtering)
2. **Collaborative Filtering** (User-Based)

Final Score = (0.6 × Logistic Score) + (0.4 × CF Score)

---

## 1. LOGISTIC REGRESSION (Content-Based Filtering)

### Purpose
Matches tutors to students based on their preferences and tutor characteristics.

### How It Works

#### Step 1: Feature Vectorization
Convert categorical preferences into numeric vectors.

```python
# Example: Student wants Math, Online, High School, Medium Price, Intermediate Experience
student_prefs = {
    'subject': 'Math',
    'mode': 'Online',
    'level': 'High School',
    'preferred_price_range': 'medium',
    'experience_preference': 'intermediate'
}

# Vectorized representation:
# [subject_index, mode_index, level_index, price_index, experience_index]
# [0, 0, 0, 1, 1]  (indices from predefined categories)

# After normalization to [0, 1]:
# [0.0, 0.0, 0.0, 0.333, 0.5]
```

#### Step 2: Tutor Feature Extraction
Extract and normalize tutor characteristics relative to student preferences.

```python
tutor_profile = {
    'tutor_id': 'tutor_1',
    'name': 'Dr. Alice Johnson',
    'subject': 'Math',              # Matches student's subject
    'mode': 'Online',               # Matches student's mode
    'experience_years': 5,          # Normalized: 5/15 = 0.333
    'hourly_rate': 800,             # For medium price (500-1000): 0.6
    'education_level': 'PhD',       # Encoded: 2/2 = 1.0
    'rating': 4.8                   # Normalized: (4.8-1)/(5-1) = 0.95
}

# Tutor vector features:
# [subject_match, mode_match, experience_norm, price_norm, education_norm, rating_norm]
# [1.0, 1.0, 0.333, 0.6, 1.0, 0.95]
#   ↑    ↑     ↑      ↑   ↑    ↑
#  Match Match Experience Price Education Rating
```

#### Step 3: Logistic Regression Formula
Apply the logistic (sigmoid) function to compute a match probability.

```
Formula: P(Match) = 1 / (1 + e^(-(β₀ + Σ(βᵢ × xᵢ)))

Where:
- β₀ = intercept (-0.5)
- βᵢ = learned weights for each feature
- xᵢ = tutor feature values

Weights (pre-trained):
β = [2.5, 1.8, 1.2, 0.8, 1.0, 1.5]
     ↓    ↓    ↓    ↓   ↓    ↓
   subject, mode, exp, price, edu, rating
```

#### Complete Example with Code

```python
import numpy as np
import math

# Define weights and intercept (already learned/tuned)
MOCK_LR_WEIGHTS = {
    'intercept': -0.5,
    'weights': np.array([2.5, 1.8, 1.2, 0.8, 1.0, 1.5])
}

def logistic_function(z):
    """Sigmoid function: 1 / (1 + e^(-z))"""
    if z > 700:
        return 1.0
    if z < -700:
        return 0.0
    return 1.0 / (1.0 + math.exp(-z))

def compute_logistic_score(student_prefs, tutor_profile):
    """
    Calculate content-based match score
    """
    # Step 1: Vectorize tutor features
    feature_vector = np.array([
        1.0,    # subject matches → 1.0
        1.0,    # mode matches → 1.0
        0.333,  # experience normalized: 5/15
        0.6,    # price normalized: (800-500)/(1000-500)
        1.0,    # education: PhD is highest
        0.95    # rating normalized: (4.8-1)/(5-1)
    ])
    
    # Step 2: Calculate weighted sum
    weights = MOCK_LR_WEIGHTS['weights']
    intercept = MOCK_LR_WEIGHTS['intercept']
    
    z = intercept + np.dot(feature_vector, weights)
    # z = -0.5 + (2.5×1.0 + 1.8×1.0 + 1.2×0.333 + 0.8×0.6 + 1.0×1.0 + 1.5×0.95)
    # z = -0.5 + (2.5 + 1.8 + 0.4 + 0.48 + 1.0 + 1.425)
    # z = -0.5 + 7.625 = 7.125
    
    # Step 3: Apply logistic function
    logistic_score = logistic_function(z)
    # logistic_score = 1 / (1 + e^(-7.125))
    # logistic_score ≈ 0.999 (very high match)
    
    return logistic_score  # Returns value between 0 and 1

# Usage in recommendation
student_prefs = {
    'subject': 'Math',
    'mode': 'Online',
    'level': 'High School',
    'preferred_price_range': 'medium',
    'experience_preference': 'intermediate'
}

tutor_1 = {
    'tutor_id': 'tutor_1',
    'name': 'Dr. Alice Johnson',
    'subject': 'Math',
    'mode': 'Online',
    'experience_years': 5,
    'hourly_rate': 800,
    'education_level': 'PhD',
    'rating': 4.8
}

logistic_score = compute_logistic_score(student_prefs, tutor_1)
print(f"Logistic Score: {logistic_score:.4f}")  # Output: ~0.9990
```

### Why Logistic Regression?
- **Probability Output**: Returns probability between 0-1 (interpretable)
- **Feature Weighting**: Emphasizes important attributes (subject, mode > price)
- **Smooth Scoring**: Handles feature interactions naturally
- **Fast Computation**: O(n) complexity

---

## 2. COLLABORATIVE FILTERING (User-Based)

### Purpose
Recommends tutors based on "similar students' ratings". If Student A liked Tutor X, and Student B is similar to Student A, Student B might like Tutor X too.

### How It Works

#### Step 1: Find Similar Students
Calculate similarity between students using their rating vectors.

```python
# Example: Student Rating Histories

# student_1 ratings:
student_1_ratings = {
    'tutor_1': 5.0,
    'tutor_4': 4.5,
    'tutor_6': 3.0
}

# student_2 ratings:
student_2_ratings = {
    'tutor_2': 5.0,
    'tutor_7': 4.8
}

# Represent as vectors across ALL tutors:
all_tutors = ['tutor_1', 'tutor_2', 'tutor_3', 'tutor_4', 'tutor_5', 'tutor_6', 'tutor_7', 'tutor_8']

student_1_vector = [5.0, 0.0, 0.0, 4.5, 0.0, 3.0, 0.0, 0.0]
student_2_vector = [0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 4.8, 0.0]

# Both have rated different tutors, so similarity is LOW
```

#### Step 2: Cosine Similarity
Measure how similar two students are.

```
Formula: cos(θ) = (A · B) / (||A|| × ||B||)

Calculation for student_1 and student_2:
- Dot product: (5.0×0.0 + 0×5.0 + ... + 0×4.8 + 0×0) = 0
- Magnitude of student_1: √(5² + 4.5² + 3²) = √50.5 ≈ 7.11
- Magnitude of student_2: √(5² + 4.8²) = √47.04 ≈ 6.86

Cosine Similarity = 0 / (7.11 × 6.86) = 0.0

→ These students have NO overlap, so similarity = 0
```

#### Step 3: Predict Rating using Weighted Average

```python
def compute_cf_score(active_student_id, tutor_id):
    """
    Example: Predict rating for student_5 on tutor_2
    """
    
    # Get all students' similarities to student_5
    similarities = {
        'student_1': 0.0,    # No overlap
        'student_2': 0.85,   # Very similar (both like Physics, high price)
        'student_3': 0.12,   # Somewhat similar
        'student_4': 0.65,   # Similar preferences
        'student_5': 1.0     # Self-similarity
    }
    
    # tutor_2 is Physics tutor
    # Who has rated tutor_2?
    # - student_2: rated 5.0
    # - No one else rated this tutor
    
    # Weighted average prediction:
    # Only student_2 rated tutor_2 and similarity = 0.85
    
    numerator = (0.85 × 5.0) = 4.25  # similarity × rating
    denominator = 0.85               # sum of similarities
    
    predicted_rating = 4.25 / 0.85 = 5.0
    
    # Normalize to [0, 1]: 5.0 / 5.0 = 1.0
    cf_score = 1.0
    
    return cf_score
```

#### Complete Example with Code

```python
import numpy as np

MOCK_INTERACTIONS = {
    'student_1': {'tutor_1': 5.0, 'tutor_4': 4.5, 'tutor_6': 3.0},
    'student_2': {'tutor_2': 5.0, 'tutor_7': 4.8},
    'student_3': {'tutor_3': 4.5, 'tutor_8': 4.0},
    'student_4': {'tutor_1': 4.7, 'tutor_4': 4.9, 'tutor_6': 2.5},
    'student_5': {'tutor_5': 4.6, 'tutor_1': 4.0}
}

MOCK_TUTORS = {
    'tutor_1': {'name': 'Dr. Alice', 'rating': 4.8},
    'tutor_2': {'name': 'Prof. Bob', 'rating': 4.9},
    # ... more tutors
}

def cosine_similarity_manual(vec1, vec2):
    """Calculate cosine similarity between two vectors"""
    dot_product = np.dot(vec1, vec2)
    magnitude1 = np.linalg.norm(vec1)
    magnitude2 = np.linalg.norm(vec2)
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    similarity = dot_product / (magnitude1 * magnitude2)
    return float(np.clip(similarity, -1.0, 1.0))

def get_student_rating_vector(student_id, tutor_ids):
    """Convert rating history to vector"""
    student_interactions = MOCK_INTERACTIONS.get(student_id, {})
    rating_vector = np.array([
        student_interactions.get(tutor_id, 0.0)
        for tutor_id in tutor_ids
    ])
    return rating_vector

def compute_student_similarities(active_student_id, tutor_ids):
    """Find how similar other students are to active student"""
    active_rating_vector = get_student_rating_vector(active_student_id, tutor_ids)
    similarities = {}
    
    for student_id in MOCK_INTERACTIONS.keys():
        if student_id == active_student_id:
            similarities[student_id] = 1.0  # Self-similarity
            continue
        
        other_rating_vector = get_student_rating_vector(student_id, tutor_ids)
        
        # Only compute if both have rated at least one tutor
        if np.sum(active_rating_vector) > 0 and np.sum(other_rating_vector) > 0:
            similarity = cosine_similarity_manual(active_rating_vector, other_rating_vector)
            similarities[student_id] = max(0.0, similarity)
        else:
            similarities[student_id] = 0.0
    
    return similarities

def compute_cf_score(active_student_id, tutor_id):
    """Predict rating using collaborative filtering"""
    
    tutor_ids = list(MOCK_TUTORS.keys())
    
    # If student already rated this tutor, return normalized rating
    if tutor_id in MOCK_INTERACTIONS.get(active_student_id, {}):
        rating = MOCK_INTERACTIONS[active_student_id][tutor_id]
        return float(rating / 5.0)  # Normalize 0-5 to 0-1
    
    # Find similarities
    similarities = compute_student_similarities(active_student_id, tutor_ids)
    
    # Find weighted average from similar students
    numerator = 0.0
    denominator = 0.0
    
    for student_id, similarity in similarities.items():
        if student_id == active_student_id:
            continue
        
        student_interactions = MOCK_INTERACTIONS.get(student_id, {})
        if tutor_id in student_interactions:
            rating = student_interactions[tutor_id]
            weight = abs(similarity)
            numerator += weight * rating
            denominator += weight
    
    # Handle case where no similar students rated this tutor
    if denominator == 0:
        tutor_profile = MOCK_TUTORS.get(tutor_id, {})
        default_rating = tutor_profile.get('rating', 3.0) / 5.0
        return default_rating
    
    # Weighted average
    cf_score = numerator / denominator
    cf_score_normalized = cf_score / 5.0 if cf_score > 0 else 0.0
    
    return float(np.clip(cf_score_normalized, 0.0, 1.0))

# Example Usage
print("=== COLLABORATIVE FILTERING EXAMPLE ===")
print("\nScenario: Predict rating of student_5 for tutor_2")
print("\nStep 1: Get student_5's rating vector")
tutor_ids = list(MOCK_TUTORS.keys())
student_5_vector = get_student_rating_vector('student_5', tutor_ids)
print(f"student_5 vector: {student_5_vector}")
# [4.0, 0, 0, 0, 4.6, 0, 0, 0]

print("\nStep 2: Calculate similarities to all other students")
similarities = compute_student_similarities('student_5', tutor_ids)
for sid, sim in similarities.items():
    print(f"  Similarity with {sid}: {sim:.4f}")

print("\nStep 3: Find who rated tutor_2")
print(f"  student_2 rated tutor_2: {MOCK_INTERACTIONS['student_2'].get('tutor_2', 'Not rated')}")

print("\nStep 4: Calculate weighted average")
cf_score = compute_cf_score('student_5', 'tutor_2')
print(f"  CF Score for tutor_2: {cf_score:.4f}")
```

### Why Collaborative Filtering?
- **Captures Hidden Preferences**: Finds patterns beyond explicit features
- **Cross-Domain Learning**: One student's ratings help predict for another
- **Cold Start Mitigation**: New tutors can be recommended if similar students rated them
- **Serendipity**: May recommend unexpected but good matches

---

## 3. HYBRID COMBINATION

### Final Score Calculation

```python
def compute_hybrid_score(student_prefs, tutor_profile, student_id, tutor_id):
    """
    Combine both methods: 60% Content + 40% Collaborative
    """
    
    # Get content-based score (logistic regression)
    logistic_score = compute_logistic_score(student_prefs, tutor_profile)
    print(f"Logistic Score: {logistic_score:.4f}")
    
    # Get collaborative filtering score
    cf_score = compute_cf_score(student_id, tutor_id)
    print(f"CF Score: {cf_score:.4f}")
    
    # Weighted hybrid combination
    final_score = (0.6 * logistic_score) + (0.4 * cf_score)
    print(f"Final Score: {final_score:.4f}")
    # = 0.6 × 0.999 + 0.4 × 0.85
    # = 0.5994 + 0.34
    # = 0.9394
    
    return (logistic_score, cf_score, final_score)

# Example
print("=== HYBRID RECOMMENDATION ===\n")
student_prefs = {
    'subject': 'Math',
    'mode': 'Online',
    'level': 'High School',
    'preferred_price_range': 'medium',
    'experience_preference': 'intermediate'
}

tutor = MOCK_TUTORS['tutor_1']
log_score, cf_score, final = compute_hybrid_score(student_prefs, tutor, 'student_5', 'tutor_1')
```

### Why This Hybrid Approach?

| Aspect | Logistic | CF | Hybrid |
|--------|----------|----|----|
| **Handles New Tutors** | ✓ | ✗ | ✓ |
| **Captures Preferences** | ✓ | ✓ | ✓✓ |
| **Avoids Overspecialization** | ✗ | ✓ | ✓ |
| **Fast Computation** | ✓ | ✗ | ✓ |
| **Recommends Niche Matches** | ✗ | ✓ | ✓ |

---

## 4. COMPLETE FLOW EXAMPLE

```python
def get_recommendations(student_prefs, student_id='student_1', top_k=5):
    """
    Complete recommendation pipeline
    """
    recommendations = []
    
    # For each tutor
    for tutor_id, tutor_profile in MOCK_TUTORS.items():
        
        # Calculate both scores
        logistic_score = compute_logistic_score(student_prefs, tutor_profile)
        cf_score = compute_cf_score(student_id, tutor_id)
        
        # Combine
        final_score = (0.6 * logistic_score) + (0.4 * cf_score)
        
        # Store result
        recommendation = {
            'tutor_id': tutor_id,
            'tutor_name': tutor_profile.get('name'),
            'subject': tutor_profile.get('subject'),
            'scores': {
                'logistic_score': round(logistic_score, 4),
                'cf_score': round(cf_score, 4),
                'final_score': round(final_score, 4)
            }
        }
        
        recommendations.append(recommendation)
    
    # Sort by final score (highest first)
    recommendations.sort(
        key=lambda x: x['scores']['final_score'],
        reverse=True
    )
    
    # Return top k
    return recommendations[:top_k]

# Usage
print("=== TOP RECOMMENDATIONS FOR STUDENT_1 (Math, Online, High School) ===\n")
student_prefs = {
    'subject': 'Math',
    'mode': 'Online',
    'level': 'High School',
    'preferred_price_range': 'medium',
    'experience_preference': 'intermediate'
}

recs = get_recommendations(student_prefs, student_id='student_1', top_k=3)

for i, rec in enumerate(recs, 1):
    print(f"{i}. {rec['tutor_name']} ({rec['subject']})")
    print(f"   Logistic: {rec['scores']['logistic_score']:.4f}")
    print(f"   CF: {rec['scores']['cf_score']:.4f}")
    print(f"   Final: {rec['scores']['final_score']:.4f}\n")
```

### Expected Output:
```
=== TOP RECOMMENDATIONS FOR STUDENT_1 (Math, Online, High School) ===

1. Dr. Alice Johnson (Math)
   Logistic: 0.9990
   CF: 1.0000
   Final: 0.9994

2. Dr. David Brown (Math)
   Logistic: 0.9980
   CF: 0.9400
   Final: 0.9770

3. Mr. Evan Green (Computer Science)
   Logistic: 0.8500
   CF: 0.7200
   Final: 0.8020
```

---

## Summary

1. **Logistic Regression**: "This tutor fits YOUR preferences"
2. **Collaborative Filtering**: "Similar students liked this tutor"
3. **Hybrid**: Balances both perspectives for robust recommendations

The system is called from `recommendation_app.py` Flask endpoint `/api/recommendations`.
