"""
Test script for the Recommendation System
Run this to verify the implementation works correctly
"""

from recommendation_system import (
    get_recommendations,
    compute_logistic_score,
    compute_cf_score,
    cosine_similarity_manual,
    vectorize_student,
    vectorize_tutor,
    MOCK_STUDENTS,
    MOCK_TUTORS
)
import numpy as np

def test_cosine_similarity():
    """Test cosine similarity calculation"""
    print("Testing Cosine Similarity...")
    vec1 = np.array([1, 2, 3])
    vec2 = np.array([1, 2, 3])
    similarity = cosine_similarity_manual(vec1, vec2)
    assert abs(similarity - 1.0) < 0.001, "Identical vectors should have similarity 1.0"
    print(f"  [OK] Identical vectors: {similarity:.4f}")
    
    vec1 = np.array([1, 0, 0])
    vec2 = np.array([0, 1, 0])
    similarity = cosine_similarity_manual(vec1, vec2)
    assert abs(similarity - 0.0) < 0.001, "Orthogonal vectors should have similarity 0.0"
    print(f"  [OK] Orthogonal vectors: {similarity:.4f}")
    print("  [OK] Cosine similarity test passed!\n")

def test_vectorization():
    """Test feature vectorization"""
    print("Testing Vectorization...")
    student_prefs = {
        'subject': 'Math',
        'mode': 'Online',
        'level': 'High School',
        'preferred_price_range': 'medium',
        'experience_preference': 'intermediate'
    }
    student_vec = vectorize_student(student_prefs)
    assert len(student_vec) == 5, "Student vector should have 5 features"
    print(f"  [OK] Student vector shape: {student_vec.shape}")
    
    tutor_profile = MOCK_TUTORS['tutor_1']
    tutor_vec = vectorize_tutor(tutor_profile, student_prefs)
    assert len(tutor_vec) == 6, "Tutor vector should have 6 features"
    print(f"  [OK] Tutor vector shape: {tutor_vec.shape}")
    print("  [OK] Vectorization test passed!\n")

def test_logistic_score():
    """Test logistic regression scoring"""
    print("Testing Logistic Regression Scoring...")
    student_prefs = {
        'subject': 'Math',
        'mode': 'Online',
        'level': 'High School',
        'preferred_price_range': 'medium',
        'experience_preference': 'intermediate'
    }
    tutor_profile = MOCK_TUTORS['tutor_1']
    score = compute_logistic_score(student_prefs, tutor_profile)
    assert 0 <= score <= 1, "Logistic score should be between 0 and 1"
    print(f"  [OK] Logistic score for tutor_1: {score:.4f}")
    print("  [OK] Logistic regression test passed!\n")

def test_cf_score():
    """Test collaborative filtering scoring"""
    print("Testing Collaborative Filtering Scoring...")
    student_id = 'student_1'
    tutor_id = 'tutor_2'
    score = compute_cf_score(student_id, tutor_id)
    assert 0 <= score <= 1, "CF score should be between 0 and 1"
    print(f"  [OK] CF score for student_1 -> tutor_2: {score:.4f}")
    print("  [OK] Collaborative filtering test passed!\n")

def test_recommendations():
    """Test full recommendation system"""
    print("Testing Full Recommendation System...")
    student_prefs = {
        'subject': 'Math',
        'mode': 'Online',
        'level': 'High School',
        'preferred_price_range': 'medium',
        'experience_preference': 'intermediate'
    }
    recommendations = get_recommendations(student_prefs, student_id='student_1', top_k=3)
    
    assert len(recommendations) == 3, "Should return 3 recommendations"
    assert 'tutor_id' in recommendations[0], "Recommendation should have tutor_id"
    assert 'scores' in recommendations[0], "Recommendation should have scores"
    assert 'final_score' in recommendations[0]['scores'], "Should have final_score"
    
    # Check sorting (should be descending)
    scores = [r['scores']['final_score'] for r in recommendations]
    assert scores == sorted(scores, reverse=True), "Recommendations should be sorted by final_score"
    
    print(f"  [OK] Generated {len(recommendations)} recommendations")
    print(f"  [OK] Top recommendation: {recommendations[0]['tutor_name']} (score: {recommendations[0]['scores']['final_score']:.4f})")
    print("  [OK] Full recommendation test passed!\n")

def main():
    """Run all tests"""
    print("=" * 60)
    print("RECOMMENDATION SYSTEM TEST SUITE")
    print("=" * 60 + "\n")
    
    try:
        test_cosine_similarity()
        test_vectorization()
        test_logistic_score()
        test_cf_score()
        test_recommendations()
        
        print("=" * 60)
        print("[SUCCESS] ALL TESTS PASSED!")
        print("=" * 60)
        
        # Show example recommendations
        print("\nExample Recommendations for Math student:")
        print("-" * 60)
        student_prefs = {
            'subject': 'Math',
            'mode': 'Online',
            'level': 'High School',
            'preferred_price_range': 'medium',
            'experience_preference': 'intermediate'
        }
        recommendations = get_recommendations(student_prefs, student_id='student_1', top_k=5)
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec['tutor_name']} ({rec['subject']})")
            print(f"   Logistic: {rec['scores']['logistic_score']:.4f}, "
                  f"CF: {rec['scores']['cf_score']:.4f}, "
                  f"Final: {rec['scores']['final_score']:.4f}")
        
    except AssertionError as e:
        print(f"\n[FAILED] TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n[ERROR] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())

