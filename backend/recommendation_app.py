
from flask import Flask, request, jsonify
from recommendation_system import get_recommendations, MOCK_STUDENTS, MOCK_TUTORS

app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response


@app.route('/api/recommendations', methods=['GET', 'POST'])
def recommendations():
   
    try:
        # Get parameters from GET or POST
        if request.method == 'POST':
            data = request.get_json() or {}
        else:
            data = request.args.to_dict()
        
        # Extract student preferences
        student_prefs = {
            'subject': data.get('subject', 'Math'),
            'mode': data.get('mode', 'Online'),
            'level': data.get('level', 'High School'),
            'preferred_price_range': data.get('preferred_price_range', 'medium'),
            'experience_preference': data.get('experience_preference', 'intermediate')
        }
        
        # Optional parameters
        student_id = data.get('student_id', None)
        top_k = data.get('top_k')
        if top_k:
            try:
                top_k = int(top_k)
            except (ValueError, TypeError):
                top_k = None
        
        # Get recommendations
        recommendations = get_recommendations(
            student_prefs=student_prefs,
            student_id=student_id,
            top_k=top_k
        )
        
        # Format response
        response = {
            'success': True,
            'student_preferences': student_prefs,
            'student_id': student_id,
            'total_recommendations': len(recommendations),
            'recommendations': recommendations
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'An error occurred while generating recommendations'
        }), 500

@app.route('/api/recommendations/mock-data', methods=['GET'])
def get_mock_data():

    return jsonify({
        'success': True,
        'mock_students': MOCK_STUDENTS,
        'mock_tutors': MOCK_TUTORS
    }), 200

@app.route('/api/recommendations/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Recommendation System',
        'version': '1.0.0'
    }), 200


if __name__ == '__main__':
    print("Starting Recommendation System Flask App...")
    print("Available endpoints:")
    print("  - GET/POST /api/recommendations - Get tutor recommendations")
    print("  - GET /api/recommendations/mock-data - Get mock data")
    print("  - GET /api/recommendations/health - Health check")
    app.run(host='0.0.0.0', port=5001, debug=True)

