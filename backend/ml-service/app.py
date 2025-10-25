from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'Student_tutor'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'mypassword')
}

# Global variables for models
tfidf_vectorizer = None
collaborative_model = None
logistic_model = None
scaler = None

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def load_training_data():
    """Load training data from database"""
    conn = get_db_connection()
    if not conn:
        return None, None, None
    
    try:
        # Load students data
        students_query = """
        SELECT s.student_id, s.academic_level, s.preferred_mode, s.budget, s.learning_goals, s.subjects_of_interest,
               u.full_name, u.email
        FROM students s
        JOIN users u ON s.user_id = u.user_id
        """
        students_df = pd.read_sql(students_query, conn)
        
        # Load tutors data
        tutors_query = """
        SELECT t.tutor_id, t.bio, t.experience, t.hourly_rate, t.preferred_mode, t.average_rating, t.rating_count,
               u.full_name, u.email
        FROM tutors t
        JOIN users u ON t.user_id = u.user_id
        WHERE t.verified = true AND t.is_approved = true
        """
        tutors_df = pd.read_sql(tutors_query, conn)
        
        # Load ratings data for collaborative filtering
        ratings_query = """
        SELECT r.student_id, r.tutor_id, r.rating, r.communication_rating, r.knowledge_rating, r.punctuality_rating
        FROM ratings r
        """
        ratings_df = pd.read_sql(ratings_query, conn)
        
        return students_df, tutors_df, ratings_df
        
    except Exception as e:
        print(f"Error loading training data: {e}")
        return None, None, None
    finally:
        conn.close()

def prepare_tfidf_features(students_df, tutors_df):
    """Prepare TF-IDF features from bios and learning goals"""
    # Combine text features
    student_texts = []
    tutor_texts = []
    
    for _, student in students_df.iterrows():
        text_parts = []
        if pd.notna(student.get('learning_goals')):
            text_parts.append(str(student['learning_goals']))
        if pd.notna(student.get('academic_level')):
            text_parts.append(str(student['academic_level']))
        student_texts.append(' '.join(text_parts))
    
    for _, tutor in tutors_df.iterrows():
        text_parts = []
        if pd.notna(tutor.get('bio')):
            text_parts.append(str(tutor['bio']))
        if pd.notna(tutor.get('experience')):
            text_parts.append(str(tutor['experience']))
        tutor_texts.append(' '.join(text_parts))
    
    # Fit TF-IDF vectorizer
    all_texts = student_texts + tutor_texts
    tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
    tfidf_matrix = tfidf_vectorizer.fit_transform(all_texts)
    
    return tfidf_vectorizer, tfidf_matrix

def prepare_collaborative_features(ratings_df):
    """Prepare collaborative filtering features"""
    if ratings_df.empty:
        return np.array([])
    
    # Create user-item matrix
    user_item_matrix = ratings_df.pivot_table(
        index='student_id', 
        columns='tutor_id', 
        values='rating', 
        fill_value=0
    )
    
    # Calculate similarity matrix
    similarity_matrix = cosine_similarity(user_item_matrix)
    
    return similarity_matrix

def train_models():
    """Train all ML models"""
    global tfidf_vectorizer, collaborative_model, logistic_model, scaler
    
    print("Loading training data...")
    students_df, tutors_df, ratings_df = load_training_data()
    
    if students_df is None or tutors_df is None:
        print("Failed to load training data")
        return False
    
    print("Preparing TF-IDF features...")
    tfidf_vectorizer, tfidf_matrix = prepare_tfidf_features(students_df, tutors_df)
    
    print("Preparing collaborative filtering features...")
    similarity_matrix = prepare_collaborative_features(ratings_df)
    
    # Prepare training data for logistic regression
    X_features = []
    y_labels = []
    
    for _, student in students_df.iterrows():
        student_text = ' '.join([
            str(student.get('learning_goals', '')),
            str(student.get('academic_level', ''))
        ])
        
        for _, tutor in tutors_df.iterrows():
            tutor_text = ' '.join([
                str(tutor.get('bio', '')),
                str(tutor.get('experience', ''))
            ])
            
            # TF-IDF similarity
            combined_text = student_text + ' ' + tutor_text
            tfidf_features = tfidf_vectorizer.transform([combined_text]).toarray()[0]
            
            # Additional features
            budget_match = 1 if (pd.notna(student.get('budget')) and 
                               pd.notna(tutor.get('hourly_rate')) and 
                               student['budget'] >= tutor['hourly_rate']) else 0
            
            mode_match = 1 if (student.get('preferred_mode') == tutor.get('preferred_mode')) else 0
            
            rating_score = tutor.get('average_rating', 0) / 5.0  # Normalize to 0-1
            
            # Combine all features
            features = np.concatenate([
                tfidf_features,
                [budget_match, mode_match, rating_score]
            ])
            
            X_features.append(features)
            
            # Create labels based on ratings (if available)
            if not ratings_df.empty:
                student_rating = ratings_df[
                    (ratings_df['student_id'] == student['student_id']) & 
                    (ratings_df['tutor_id'] == tutor['tutor_id'])
                ]
                if not student_rating.empty:
                    y_labels.append(1 if student_rating['rating'].iloc[0] >= 4 else 0)
                else:
                    y_labels.append(0)  # No interaction = negative label
            else:
                y_labels.append(0)
    
    if not X_features:
        print("No training features generated")
        return False
    
    X = np.array(X_features)
    y = np.array(y_labels)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train logistic regression model
    print("Training logistic regression model...")
    logistic_model = LogisticRegression(random_state=42, max_iter=1000)
    logistic_model.fit(X_scaled, y)
    
    # Save models
    os.makedirs('models', exist_ok=True)
    joblib.dump(tfidf_vectorizer, 'models/tfidf_vectorizer.pkl')
    joblib.dump(logistic_model, 'models/logistic_model.pkl')
    joblib.dump(scaler, 'models/scaler.pkl')
    
    print("Models trained and saved successfully!")
    return True

def load_models():
    """Load pre-trained models"""
    global tfidf_vectorizer, logistic_model, scaler
    
    try:
        tfidf_vectorizer = joblib.load('models/tfidf_vectorizer.pkl')
        logistic_model = joblib.load('models/logistic_model.pkl')
        scaler = joblib.load('models/scaler.pkl')
        print("Models loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

@app.route('/ml/train', methods=['POST'])
def train_endpoint():
    """Endpoint to train ML models"""
    try:
        success = train_models()
        if success:
            return jsonify({
                'success': True,
                'message': 'Models trained successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to train models'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Training error: {str(e)}'
        }), 500

@app.route('/ml/recommend/<int:student_id>', methods=['GET'])
def recommend_tutors(student_id):
    """Get tutor recommendations for a student"""
    try:
        # Load models if not already loaded
        if tfidf_vectorizer is None or logistic_model is None or scaler is None:
            if not load_models():
                return jsonify({
                    'success': False,
                    'message': 'Models not available. Please train models first.'
                }), 500
        
        # Get student data
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        try:
            # Get student data
            student_query = """
            SELECT s.student_id, s.academic_level, s.preferred_mode, s.budget, s.learning_goals, s.subjects_of_interest
            FROM students s
            WHERE s.student_id = %s
            """
            student_df = pd.read_sql(student_query, conn, params=[student_id])
            
            if student_df.empty:
                return jsonify({
                    'success': False,
                    'message': 'Student not found'
                }), 404
            
            student = student_df.iloc[0]
            
            # Get all verified tutors
            tutors_query = """
            SELECT t.tutor_id, t.bio, t.experience, t.hourly_rate, t.preferred_mode, t.average_rating, t.rating_count
            FROM tutors t
            WHERE t.verified = true AND t.is_approved = true
            """
            tutors_df = pd.read_sql(tutors_query, conn)
            
            if tutors_df.empty:
                return jsonify({
                    'success': False,
                    'message': 'No verified tutors available'
                }), 404
            
            # Generate recommendations
            recommendations = []
            
            for _, tutor in tutors_df.iterrows():
                # Prepare features
                student_text = ' '.join([
                    str(student.get('learning_goals', '')),
                    str(student.get('academic_level', ''))
                ])
                
                tutor_text = ' '.join([
                    str(tutor.get('bio', '')),
                    str(tutor.get('experience', ''))
                ])
                
                # TF-IDF features
                combined_text = student_text + ' ' + tutor_text
                tfidf_features = tfidf_vectorizer.transform([combined_text]).toarray()[0]
                
                # Additional features
                budget_match = 1 if (pd.notna(student.get('budget')) and 
                                   pd.notna(tutor.get('hourly_rate')) and 
                                   student['budget'] >= tutor['hourly_rate']) else 0
                
                mode_match = 1 if (student.get('preferred_mode') == tutor.get('preferred_mode')) else 0
                
                rating_score = tutor.get('average_rating', 0) / 5.0
                
                # Combine features
                features = np.concatenate([
                    tfidf_features,
                    [budget_match, mode_match, rating_score]
                ])
                
                # Scale features
                features_scaled = scaler.transform([features])
                
                # Get prediction probability
                match_probability = logistic_model.predict_proba(features_scaled)[0][1]
                
                recommendations.append({
                    'tutor_id': int(tutor['tutor_id']),
                    'match_probability': float(match_probability),
                    'budget_match': bool(budget_match),
                    'mode_match': bool(mode_match),
                    'rating_score': float(rating_score)
                })
            
            # Sort by match probability
            recommendations.sort(key=lambda x: x['match_probability'], reverse=True)
            
            return jsonify({
                'success': True,
                'data': {
                    'student_id': student_id,
                    'recommendations': recommendations[:10],  # Top 10 recommendations
                    'total_tutors': len(tutors_df)
                }
            })
            
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Recommendation error: {str(e)}'
        }), 500

@app.route('/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'message': 'ML service is running',
        'models_loaded': tfidf_vectorizer is not None and logistic_model is not None
    })

if __name__ == '__main__':
    # Try to load existing models on startup
    load_models()
    
    # Start the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)
