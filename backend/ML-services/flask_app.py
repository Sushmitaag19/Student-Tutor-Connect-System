from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pickle
import os
from typing import Dict, List, Any

# Import all necessary components from improved_recommendation.py
from improved_recommendation import (
    HybridTutorRecommender,
    gen_students,
    gen_tutors,
    generate_interactions,
    build_id_maps,
    split_train_test,
    sample_lr_dataset,
    SUBJECTS,
    LEVELS,
    CITIES,
    LEARNING_STYLES,
    TEACHING_STYLES,
    time_overlap_mask
)

app = Flask(__name__)
CORS(app)

# Global variable to store trained model and data
trained_model = None
students_data = None
tutors_data = None

MODEL_PATH = 'trained_model.pkl'


def train_and_save_model():
    """Train the model and save it to disk"""
    print("Training new model...")
    
    # Generate data
    n_students = 300
    n_tutors = 180
    # Data generation now includes the 'profile_text' field
    students = gen_students(n_students)
    tutors = gen_tutors(n_tutors)
    
    sid_to_idx, tid_to_idx, _, _ = build_id_maps(students, tutors)
    interactions_all = generate_interactions(students, tutors, sid_to_idx, tid_to_idx)
    interactions_train, _ = split_train_test(interactions_all, test_holdout_per_user=1)
    
    # sample_lr_dataset now handles 11 features (including TF-IDF)
    X_train, y_train, _, _ = sample_lr_dataset(
        students, tutors, interactions_train, 
        sid_to_idx, tid_to_idx, neg_ratio=1.0
    )
    
    # Train model
    # Alpha=0.70 balances Content-Based (70%) with dynamic CF (30%)
    hybrid = HybridTutorRecommender(alpha=0.70) 
    hybrid.fit(students, tutors, X_train, y_train, interactions_train)
    
    # Save model
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump({
            'model': hybrid,
            'students': students,
            'tutors': tutors
        }, f)
    
    print("Model trained and saved successfully!")
    return hybrid, students, tutors


def load_or_train_model():
    """Load existing model or train new one"""
    global trained_model, students_data, tutors_data
    
    if os.path.exists(MODEL_PATH):
        print("Loading existing model...")
        try:
            with open(MODEL_PATH, 'rb') as f:
                data = pickle.load(f)
                trained_model = data['model']
                students_data = data['students']
                tutors_data = data['tutors']
            print("Model loaded successfully!")
        except (EOFError, pickle.UnpicklingError):
            print("Model file corrupted. Retraining...")
            trained_model, students_data, tutors_data = train_and_save_model()
    else:
        trained_model, students_data, tutors_data = train_and_save_model()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': trained_model is not None
    })


@app.route('/train', methods=['POST'])
def train_model():
    """Endpoint to retrain the model"""
    try:
        global trained_model, students_data, tutors_data
        trained_model, students_data, tutors_data = train_and_save_model()
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully',
            'num_students': len(students_data),
            'num_tutors': len(tutors_data)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/recommend', methods=['POST'])
def get_recommendations():
    """
    Get tutor recommendations for a student
    """
    try:
        if trained_model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please train the model first.'
            }), 503
        
        data = request.get_json()
        top_n = data.get('top_n', 5)
        
        if 'student_id' in data:
            student_id = data['student_id']
            
            if student_id not in trained_model.sid_to_idx:
                return jsonify({
                    'success': False,
                    'error': f'Student {student_id} not found in training data'
                }), 404
            
            recommendations = trained_model.recommend(student_id, top_n=top_n)
            student_profile = trained_model.get_student_profile(student_id)
            
        else:
            return jsonify({
                'success': False,
                'error': 'student_id must be provided'
            }), 400
        
        # Format response with tutor details
        results = []
        for tutor_id, score in recommendations:
            tutor_profile = trained_model.get_tutor_profile(tutor_id)
            
            # Calculate match indicators
            matches = {
                'subject': student_profile['preferred_subject'] == tutor_profile['subject_specialization'],
                'level': student_profile['preferred_level'] == tutor_profile['teaching_level'],
                'location': student_profile['location'] == tutor_profile['tutor_location'],
                'style': student_profile['learning_style'] == tutor_profile['teaching_style'],
                'time': bool(time_overlap_mask(student_profile['availability'], tutor_profile['available_slots'])),
                'budget': student_profile.get('max_budget', 0) >= tutor_profile.get('hourly_rate', float('inf')) 
            }
            
            results.append({
                'tutor_id': tutor_id,
                'score': float(score),
                'profile': {
                    'subject': tutor_profile['subject_specialization'],
                    'level': tutor_profile['teaching_level'],
                    'location': tutor_profile['tutor_location'],
                    'teaching_style': tutor_profile['teaching_style'],
                    'hourly_rate': tutor_profile.get('hourly_rate'),
                    'profile_text': tutor_profile.get('profile_text') # NEW FIELD
                },
                'matches': matches,
                'match_count': sum(matches.values())
            })
        
        return jsonify({
            'success': True,
            'student_id': student_id,
            'student_profile': {
                'subject': student_profile['preferred_subject'],
                'level': student_profile['preferred_level'],
                'location': student_profile['location'],
                'learning_style': student_profile['learning_style'],
                'max_budget': student_profile.get('max_budget'),
                'profile_text': student_profile.get('profile_text') # NEW FIELD
            },
            'recommendations': results,
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/students', methods=['GET'])
def get_students():
    """Get list of all students"""
    try:
        if students_data is None:
            return jsonify({
                'success': False,
                'error': 'No student data available'
            }), 503
        
        students = []
        for s in students_data:
            students.append({
                'student_id': s['student_id'],
                'subject': s['preferred_subject'],
                'level': s['preferred_level'],
                'location': s['location'],
                'learning_style': s['learning_style'],
                'max_budget': s['max_budget'],
                'profile_text': s['profile_text'] # NEW FIELD
            })
        
        return jsonify({
            'success': True,
            'students': students,
            'count': len(students)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tutors', methods=['GET'])
def get_tutors():
    """Get list of all tutors"""
    try:
        if tutors_data is None:
            return jsonify({
                'success': False,
                'error': 'No tutor data available'
            }), 503
        
        tutors = []
        for t in tutors_data:
            tutors.append({
                'tutor_id': t['tutor_id'],
                'subject': t['subject_specialization'],
                'level': t['teaching_level'],
                'location': t['tutor_location'],
                'teaching_style': t['teaching_style'],
                'hourly_rate': t['hourly_rate'],
                'profile_text': t['profile_text'] # NEW FIELD
            })
        
        return jsonify({
            'success': True,
            'tutors': tutors,
            'count': len(tutors)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/metadata', methods=['GET'])
def get_metadata():
    """Get available options for subjects, levels, cities, etc."""
    # Assuming constants are correctly imported from improved_recommendation
    return jsonify({
        'success': True,
        'metadata': {
            'subjects': SUBJECTS.tolist(),
            'levels': LEVELS.tolist(),
            'cities': CITIES.tolist(),
            'learning_styles': LEARNING_STYLES.tolist(),
            'teaching_styles': TEACHING_STYLES.tolist()
        }
    })


@app.route('/student/<student_id>', methods=['GET'])
def get_student_details(student_id):
    """Get detailed information about a specific student"""
    try:
        if trained_model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 503
        
        if student_id not in trained_model.sid_to_idx:
            return jsonify({
                'success': False,
                'error': f'Student {student_id} not found'
            }), 404
        
        student_profile = trained_model.get_student_profile(student_id)
        
        return jsonify({
            'success': True,
            'student': {
                'student_id': student_id,
                'subject': student_profile['preferred_subject'],
                'level': student_profile['preferred_level'],
                'location': student_profile['location'],
                'learning_style': student_profile['learning_style'],
                'availability': int(student_profile['availability']),
                'max_budget': student_profile['max_budget'],
                'profile_text': student_profile['profile_text'] # NEW FIELD
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tutor/<tutor_id>', methods=['GET'])
def get_tutor_details(tutor_id):
    """Get detailed information about a specific tutor"""
    try:
        if trained_model is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded'
            }), 503
        
        if tutor_id not in trained_model.tid_to_idx:
            return jsonify({
                'success': False,
                'error': f'Tutor {tutor_id} not found'
            }), 404
        
        tutor_profile = trained_model.get_tutor_profile(tutor_id)
        
        return jsonify({
            'success': True,
            'tutor': {
                'tutor_id': tutor_id,
                'subject': tutor_profile['subject_specialization'],
                'level': tutor_profile['teaching_level'],
                'location': tutor_profile['tutor_location'],
                'teaching_style': tutor_profile['teaching_style'],
                'available_slots': int(tutor_profile['available_slots']),
                'hourly_rate': tutor_profile['hourly_rate'],
                'profile_text': tutor_profile['profile_text'] # NEW FIELD
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # Load or train model on startup
    load_or_train_model()
    
    # Run the Flask app
    # Set the port to 5001 or ensure it's different from the Node.js server (5000)
    app.run(
        host='0.0.0.0',
        port=5001, # Using 5001 to avoid conflict with Node.js server
        debug=True
    )