import numpy as np
import math
from typing import Dict, List, Tuple, Any


MOCK_STUDENTS = {
    'student_1': {
        'subject': 'Math',
        'mode': 'Online',
        'level': 'High School',
        'preferred_price_range': 'medium',
        'experience_preference': 'intermediate'
    },
    'student_2': {
        'subject': 'Physics',
        'mode': 'Hybrid',
        'level': 'University',
        'preferred_price_range': 'high',
        'experience_preference': 'advanced'
    },
    'student_3': {
        'subject': 'English',
        'mode': 'Offline',
        'level': 'High School',
        'preferred_price_range': 'low',
        'experience_preference': 'beginner'
    },
    'student_4': {
        'subject': 'Math',
        'mode': 'Online',
        'level': 'University',
        'preferred_price_range': 'medium',
        'experience_preference': 'advanced'
    },
    'student_5': {
        'subject': 'Computer Science',
        'mode': 'Online',
        'level': 'University',
        'preferred_price_range': 'high',
        'experience_preference': 'advanced'
    }
}

# Mock Tutor Profile Data
MOCK_TUTORS = {
    'tutor_1': {
        'tutor_id': 'tutor_1',
        'name': 'Dr. Alice Johnson',
        'subject': 'Math',
        'mode': 'Online',
        'experience_years': 5,
        'hourly_rate': 800,
        'education_level': 'PhD',
        'rating': 4.8,
        'location': 'Kathmandu'
    },
    'tutor_2': {
        'tutor_id': 'tutor_2',
        'name': 'Prof. Bob Smith',
        'subject': 'Physics',
        'mode': 'Hybrid',
        'experience_years': 8,
        'hourly_rate': 1200,
        'education_level': 'PhD',
        'rating': 4.9,
        'location': 'Lalitpur'
    },
    'tutor_3': {
        'tutor_id': 'tutor_3',
        'name': 'Ms. Carol White',
        'subject': 'English',
        'mode': 'Offline',
        'experience_years': 3,
        'hourly_rate': 500,
        'education_level': 'Masters',
        'rating': 4.5,
        'location': 'Bhaktapur'
    },
    'tutor_4': {
        'tutor_id': 'tutor_4',
        'name': 'Dr. David Brown',
        'subject': 'Math',
        'mode': 'Online',
        'experience_years': 7,
        'hourly_rate': 1000,
        'education_level': 'PhD',
        'rating': 4.7,
        'location': 'Kathmandu'
    },
    'tutor_5': {
        'tutor_id': 'tutor_5',
        'name': 'Mr. Evan Green',
        'subject': 'Computer Science',
        'mode': 'Online',
        'experience_years': 4,
        'hourly_rate': 900,
        'education_level': 'Masters',
        'rating': 4.6,
        'location': 'Kathmandu'
    },
    'tutor_6': {
        'tutor_id': 'tutor_6',
        'name': 'Ms. Fiona Blue',
        'subject': 'Math',
        'mode': 'Offline',
        'experience_years': 2,
        'hourly_rate': 600,
        'education_level': 'Bachelors',
        'rating': 4.3,
        'location': 'Lalitpur'
    },
    'tutor_7': {
        'tutor_id': 'tutor_7',
        'name': 'Dr. George Red',
        'subject': 'Physics',
        'mode': 'Online',
        'experience_years': 10,
        'hourly_rate': 1500,
        'education_level': 'PhD',
        'rating': 5.0,
        'location': 'Kathmandu'
    },
    'tutor_8': {
        'tutor_id': 'tutor_8',
        'name': 'Ms. Hannah Yellow',
        'subject': 'English',
        'mode': 'Hybrid',
        'experience_years': 6,
        'hourly_rate': 750,
        'education_level': 'Masters',
        'rating': 4.4,
        'location': 'Bhaktapur'
    }
}

MOCK_INTERACTIONS = {
    'student_1': {
        'tutor_1': 5.0,  # Highly rated
        'tutor_4': 4.5,
        'tutor_6': 3.0
    },
    'student_2': {
        'tutor_2': 5.0,
        'tutor_7': 4.8
    },
    'student_3': {
        'tutor_3': 4.5,
        'tutor_8': 4.0
    },
    'student_4': {
        'tutor_1': 4.7,
        'tutor_4': 4.9,
        'tutor_6': 2.5
    },
    'student_5': {
        'tutor_5': 4.6,
        'tutor_1': 4.0  # Math tutor
    }
}


def encode_categorical_feature(value: str, categories: List[str]) -> int:
    """Encode categorical feature to numeric index"""
    try:
        return categories.index(value)
    except ValueError:
        return 0  

def normalize_numeric_feature(value: float, min_val: float, max_val: float) -> float:
    """Normalize numeric feature to [0, 1] range"""
    if max_val == min_val:
        return 0.5
    return (value - min_val) / (max_val - min_val)

def vectorize_student(student_prefs: Dict[str, Any]) -> np.ndarray:
   
    subjects = ['Math', 'Physics', 'English', 'Computer Science', 'Chemistry', 'Biology', 'Nepali']
    modes = ['Online', 'Offline', 'Hybrid']
    levels = ['High School', 'University', 'Middle School', 'Primary']
    price_ranges = ['low', 'medium', 'high']
    experience_levels = ['beginner', 'intermediate', 'advanced']
    
    vector = np.array([
        encode_categorical_feature(student_prefs.get('subject', 'Math'), subjects),
        encode_categorical_feature(student_prefs.get('mode', 'Online'), modes),
        encode_categorical_feature(student_prefs.get('level', 'High School'), levels),
        encode_categorical_feature(student_prefs.get('preferred_price_range', 'medium'), price_ranges),
        encode_categorical_feature(student_prefs.get('experience_preference', 'intermediate'), experience_levels)
    ], dtype=float)
    
    # Normalize to [0, 1]
    max_vals = np.array([len(subjects)-1, len(modes)-1, len(levels)-1, len(price_ranges)-1, len(experience_levels)-1])
    vector = vector / (max_vals + 1e-10)  # Avoid division by zero
    
    return vector

def vectorize_tutor(tutor_profile: Dict[str, Any], student_prefs: Dict[str, Any]) -> np.ndarray:
    
    subjects = ['Math', 'Physics', 'English', 'Computer Science', 'Chemistry', 'Biology', 'Nepali']
    modes = ['Online', 'Offline', 'Hybrid']
    education_levels = ['Bachelors', 'Masters', 'PhD']
    
    # Subject match (1 if matches student's preferred subject)
    subject_match = 1.0 if tutor_profile.get('subject') == student_prefs.get('subject') else 0.0
    
    # Mode match (1 if matches student's preferred mode)
    mode_match = 1.0 if tutor_profile.get('mode') == student_prefs.get('mode') else 0.0
    
    # Normalize experience years (0-15 years range)
    experience_years = tutor_profile.get('experience_years', 0)
    experience_norm = normalize_numeric_feature(experience_years, 0, 15)
    
    # Normalize hourly rate (based on student's price preference)
    hourly_rate = tutor_profile.get('hourly_rate', 0)
    student_price_pref = student_prefs.get('preferred_price_range', 'medium')
    
    # Define price ranges
    price_ranges = {
        'low': (0, 600),
        'medium': (500, 1000),
        'high': (800, 2000)
    }
    min_price, max_price = price_ranges.get(student_price_pref, (0, 1500))
    price_norm = normalize_numeric_feature(hourly_rate, min_price, max_price)
    
    # Education level (encoded)
    education_encoded = encode_categorical_feature(
        tutor_profile.get('education_level', 'Bachelors'),
        education_levels
    )
    education_norm = education_encoded / (len(education_levels) - 1) if len(education_levels) > 1 else 0.5
    
    # Rating normalized (1-5 scale)
    rating = tutor_profile.get('rating', 3.0)
    rating_norm = normalize_numeric_feature(rating, 1.0, 5.0)
    
    vector = np.array([
        subject_match,
        mode_match,
        experience_norm,
        price_norm,
        education_norm,
        rating_norm
    ])
    
    return vector

# ============================================================================
# LOGISTIC REGRESSION (CONTENT-BASED FILTERING)
# ============================================================================

# Mock learned weights (beta) for Logistic Regression
# Weights correspond to features: [subject_match, mode_match, experience, price, education, rating]
# Plus intercept (beta_0)
MOCK_LR_WEIGHTS = {
    'intercept': -0.5,  # beta_0
    'weights': np.array([
        2.5,   # subject_match (high importance)
        1.8,   # mode_match (high importance)
        1.2,   # experience_norm
        0.8,   # price_norm
        1.0,   # education_norm
        1.5    # rating_norm
    ])
}

def logistic_function(z: float) -> float:
    """Logistic (sigmoid) function: 1 / (1 + e^(-z))"""
    # Prevent overflow
    if z > 700:
        return 1.0
    if z < -700:
        return 0.0
    return 1.0 / (1.0 + math.exp(-z))

def compute_logistic_score(student_prefs: Dict[str, Any], tutor_profile: Dict[str, Any]) -> float:
    """
    Compute Content-Based Match Score using Logistic Regression
    
    Formula: P(Match) = 1 / (1 + e^(-(β₀ + Σβᵢxᵢ)))
    
    Args:
        student_prefs: Student preference dictionary
        tutor_profile: Tutor profile dictionary
    
    Returns:
        LogisticScore: Probability between 0 and 1
    """
    # Vectorize student and tutor
    student_vector = vectorize_student(student_prefs)
    tutor_vector = vectorize_tutor(tutor_profile, student_prefs)
    
    # Create feature difference vector (how well tutor matches student preferences)
    # For subject and mode, we use the match indicators directly
    # For numeric features, we use the tutor's normalized values
    feature_vector = tutor_vector
    
    # Compute z = β₀ + Σ(βᵢ × xᵢ)
    weights = MOCK_LR_WEIGHTS['weights']
    intercept = MOCK_LR_WEIGHTS['intercept']
    
    # Ensure vectors have same length
    if len(feature_vector) != len(weights):
        # Pad or truncate if needed
        min_len = min(len(feature_vector), len(weights))
        feature_vector = feature_vector[:min_len]
        weights = weights[:min_len]
    
    z = intercept + np.dot(feature_vector, weights)
    
    # Apply logistic function
    logistic_score = logistic_function(z)
    
    return float(logistic_score)

# ============================================================================
# COLLABORATIVE FILTERING (USER-BASED)
# ============================================================================

def cosine_similarity_manual(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Calculate cosine similarity between two vectors using basic NumPy operations
    
    Formula: cos(θ) = (A · B) / (||A|| × ||B||)
    
    Args:
        vec1: First vector
        vec2: Second vector
    
    Returns:
        Cosine similarity score between -1 and 1 (typically 0 to 1 for non-negative vectors)
    """
    # Dot product
    dot_product = np.dot(vec1, vec2)
    
    # Magnitudes (L2 norm)
    magnitude1 = np.linalg.norm(vec1)
    magnitude2 = np.linalg.norm(vec2)
    
    # Avoid division by zero
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    # Cosine similarity
    similarity = dot_product / (magnitude1 * magnitude2)
    
    # Clamp to [-1, 1] (though for rating vectors it should be [0, 1])
    return float(np.clip(similarity, -1.0, 1.0))

def get_student_rating_vector(student_id: str, tutor_ids: List[str]) -> np.ndarray:
    """
    Get rating vector for a student across all tutors
    
    Returns a vector where each element is the rating for a tutor,
    or 0 if no rating exists
    """
    student_interactions = MOCK_INTERACTIONS.get(student_id, {})
    rating_vector = np.array([
        student_interactions.get(tutor_id, 0.0)
        for tutor_id in tutor_ids
    ])
    return rating_vector

def compute_student_similarities(active_student_id: str, tutor_ids: List[str]) -> Dict[str, float]:
    """
    Compute similarity between active student and all other students
    
    Args:
        active_student_id: ID of the student requesting recommendations
        tutor_ids: List of all tutor IDs
    
    Returns:
        Dictionary mapping student_id to similarity score
    """
    active_rating_vector = get_student_rating_vector(active_student_id, tutor_ids)
    similarities = {}
    
    for student_id in MOCK_INTERACTIONS.keys():
        if student_id == active_student_id:
            similarities[student_id] = 1.0  # Self-similarity
            continue
        
        other_rating_vector = get_student_rating_vector(student_id, tutor_ids)
        
        # Only compute similarity if both students have at least one rating
        if np.sum(active_rating_vector) > 0 and np.sum(other_rating_vector) > 0:
            similarity = cosine_similarity_manual(active_rating_vector, other_rating_vector)
            similarities[student_id] = max(0.0, similarity)  # Keep non-negative
        else:
            similarities[student_id] = 0.0
    
    return similarities

def compute_cf_score(active_student_id: str, tutor_id: str) -> float:
    """
    Compute Collaborative Filtering score using User-Based CF
    
    Predicts rating by weighted average of similar users' ratings
    
    Args:
        active_student_id: ID of the student requesting recommendations
        tutor_id: ID of the tutor to predict rating for
    
    Returns:
        CFScore: Predicted rating/preference score
    """
    # Get all tutor IDs
    tutor_ids = list(MOCK_TUTORS.keys())
    
    # Check if active student has already rated this tutor
    if tutor_id in MOCK_INTERACTIONS.get(active_student_id, {}):
        # If already rated, return the normalized actual rating (0-1 range)
        rating = MOCK_INTERACTIONS[active_student_id][tutor_id]
        return float(rating / 5.0)  # Normalize 0-5 to 0-1
    
    # Compute similarities with other students
    similarities = compute_student_similarities(active_student_id, tutor_ids)
    
    # Find students who have rated this tutor
    numerator = 0.0
    denominator = 0.0
    
    for student_id, similarity in similarities.items():
        if student_id == active_student_id:
            continue
        
        student_interactions = MOCK_INTERACTIONS.get(student_id, {})
        if tutor_id in student_interactions:
            rating = student_interactions[tutor_id]
            # Use absolute value of similarity as weight (in case of negative)
            weight = abs(similarity)
            numerator += weight * rating
            denominator += weight
    
    # If no similar students have rated this tutor, return default score
    if denominator == 0:
        # Return average rating of tutor if available, or neutral score
        tutor_profile = MOCK_TUTORS.get(tutor_id, {})
        default_rating = tutor_profile.get('rating', 3.0) / 5.0  # Normalize to 0-1
        return default_rating
    
    # Weighted average prediction
    if denominator == 0:
        cf_score = 0.0
    else:
        cf_score = numerator / denominator
    
    # Normalize to 0-1 range (assuming ratings are 0-5)
    # Ratings in MOCK_INTERACTIONS are already 0-5, so normalize
    cf_score_normalized = cf_score / 5.0 if cf_score > 0 else 0.0
    
    return float(np.clip(cf_score_normalized, 0.0, 1.0))

# ============================================================================
# HYBRID RECOMMENDATION
# ============================================================================

def compute_hybrid_score(
    student_prefs: Dict[str, Any],
    tutor_profile: Dict[str, Any],
    student_id: str,
    tutor_id: str
) -> Tuple[float, float, float]:
    """
    Compute hybrid recommendation score
    
    FinalScore = (0.6 × LogisticScore) + (0.4 × CFScore)
    
    Args:
        student_prefs: Student preference dictionary
        tutor_profile: Tutor profile dictionary
        student_id: Student ID for CF
        tutor_id: Tutor ID for CF
    
    Returns:
        Tuple of (LogisticScore, CFScore, FinalScore)
    """
    # Content-based score
    logistic_score = compute_logistic_score(student_prefs, tutor_profile)
    
    # Collaborative filtering score
    cf_score = compute_cf_score(student_id, tutor_id)
    
    # Hybrid combination
    final_score = (0.6 * logistic_score) + (0.4 * cf_score)
    
    return (logistic_score, cf_score, final_score)

def get_recommendations(
    student_prefs: Dict[str, Any],
    student_id: str = None,
    top_k: int = None
) -> List[Dict[str, Any]]:
    """
    Get ranked list of tutor recommendations
    
    Args:
        student_prefs: Student preference dictionary
        student_id: Optional student ID for CF (if None, uses content-based only)
        top_k: Optional number of top recommendations to return
    
    Returns:
        List of tutor recommendations sorted by FinalScore (descending)
    """
    recommendations = []
    
    # Use a default student_id if not provided
    if student_id is None:
        student_id = 'student_1'  # Default
    
    # Check if student exists in interactions, if not, create a new entry
    if student_id not in MOCK_INTERACTIONS:
        MOCK_INTERACTIONS[student_id] = {}
    
    # Calculate scores for all tutors
    for tutor_id, tutor_profile in MOCK_TUTORS.items():
        logistic_score, cf_score, final_score = compute_hybrid_score(
            student_prefs,
            tutor_profile,
            student_id,
            tutor_id
        )
        
        recommendation = {
            'tutor_id': tutor_id,
            'tutor_name': tutor_profile.get('name', 'Unknown'),
            'subject': tutor_profile.get('subject'),
            'mode': tutor_profile.get('mode'),
            'experience_years': tutor_profile.get('experience_years'),
            'hourly_rate': tutor_profile.get('hourly_rate'),
            'rating': tutor_profile.get('rating'),
            'location': tutor_profile.get('location'),
            'scores': {
                'logistic_score': round(logistic_score, 4),
                'cf_score': round(cf_score, 4),
                'final_score': round(final_score, 4)
            }
        }
        
        recommendations.append(recommendation)
    
    # Sort by final score (descending)
    recommendations.sort(key=lambda x: x['scores']['final_score'], reverse=True)
    
    # Return top_k if specified
    if top_k is not None and top_k > 0:
        recommendations = recommendations[:top_k]
    
    return recommendations

