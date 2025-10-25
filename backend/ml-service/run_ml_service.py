#!/usr/bin/env python3
"""
Script to run the ML microservice
"""
import os
import sys
import subprocess

def install_requirements():
    """Install Python requirements"""
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("Requirements installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Error installing requirements: {e}")
        return False
    return True

def run_service():
    """Run the ML service"""
    try:
        # Set environment variables
        os.environ['DB_HOST'] = os.getenv('DB_HOST', 'localhost')
        os.environ['DB_PORT'] = os.getenv('DB_PORT', '5432')
        os.environ['DB_NAME'] = os.getenv('DB_NAME', 'Student_tutor')
        os.environ['DB_USER'] = os.getenv('DB_USER', 'postgres')
        os.environ['DB_PASSWORD'] = os.getenv('DB_PASSWORD', 'mypassword')
        
        # Run the Flask app
        from app import app
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print(f"Error running service: {e}")

if __name__ == '__main__':
    print("Starting ML Microservice...")
    
    # Install requirements
    if not install_requirements():
        sys.exit(1)
    
    # Run the service
    run_service()
