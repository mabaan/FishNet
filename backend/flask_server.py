# flask_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from urllib.parse import urlparse
import joblib  # For loading your trained ML model
from worker import get_USI_candidates, get_url_similarity_index, classify_usi

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Load your trained ML model and preprocessing pipeline
# Adjust the path to where your model is saved
try:
    artifacts = joblib.load('../ml/phishing_lr_model.pkl')
    ml_model = artifacts['model']
    scaler = artifacts['scaler']
    feature_columns = artifacts['columns']
    print("ML model and preprocessing pipeline loaded successfully")
    print(f"Expected features: {feature_columns}")
except Exception as e:
    print(f"Warning: Could not load ML model: {e}")
    ml_model = None
    scaler = None
    onehot_encoder = None
    feature_columns = None

@app.route('/check_usi', methods=['POST'])
def check_usi():
    """
    Step 1: Check URL Similarity Index
    Returns: USI score and verdict (LEGITIMATE, PHISHING, LIKELY_PHISHING, SEND_TO_MODEL)
    """
    try:
        data = request.json
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Extract domain from URL
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        
        # Get USI candidates and scores
        candidates = get_USI_candidates(domain, top_k=3)
        usi_scores = get_url_similarity_index(domain, candidates)
        result = classify_usi(usi_scores)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/classify', methods=['POST'])
def classify():
    """
    Step 2: ML Classification (only called if USI verdict is SEND_TO_MODEL)
    Expects: Feature dictionary matching your model's input
    Returns: prediction (0=legitimate, 1=phishing) and confidence
    """
    try:
        data = request.json
        features = data.get('features')
        
        if not features:
            return jsonify({'error': 'Features are required'}), 400
        
        if ml_model is None:
            return jsonify({'error': 'ML model not loaded'}), 500
        
        # Convert features to the format expected by your model (returns DataFrame)
        feature_df = prepare_features(features)
        
        # Make prediction (pass DataFrame directly)
        prediction = ml_model.predict(feature_df)[0]
        
        # Get prediction probability if available
        try:
            probabilities = ml_model.predict_proba(feature_df)[0]
            confidence = float(max(probabilities))
        except:
            confidence = None
        
        return jsonify({
            'prediction': int(prediction),
            'confidence': confidence,
            'verdict': 'PHISHING' if prediction == 1 else 'LEGITIMATE'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def prepare_features(features_dict):
    """
    Convert feature dictionary to DataFrame matching model's expected input.
    Applies the same preprocessing pipeline used during training:
    - Scale all features using StandardScaler
    Note: TLD is excluded due to too many unique values in training data
    Returns: Scaled DataFrame (not array) to preserve feature names for sklearn
    """
    import pandas as pd
    
    # Create dataframe with features in the exact order used during training
    feature_values = {}
    for feature_name in feature_columns:
        value = features_dict.get(feature_name, 0)
        feature_values[feature_name] = value
    
    # Create DataFrame with proper column names (required by sklearn)
    X = pd.DataFrame([feature_values])
    
    # Apply scaling and return as DataFrame to preserve feature names
    X_scaled = scaler.transform(X)
    X_scaled_df = pd.DataFrame(X_scaled, columns=feature_columns)
    
    return X_scaled_df


@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': ml_model is not None,
        'scaler_loaded': scaler is not None,
        'encoder_loaded': onehot_encoder is not None
    })


if __name__ == '__main__':
    print("Starting Flask server...")
    print("Endpoints:")
    print("  POST /check_usi - Check URL Similarity Index")
    print("  POST /classify - ML Classification")
    print("  GET /health - Health check")
    app.run(debug=True, port=5000)