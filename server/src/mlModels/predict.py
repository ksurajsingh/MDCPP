# python_scripts/predict.py
import sys
import json
import pickle
import numpy as np
import pandas as pd
import os

def load_model():
    """Load the pretrained model"""
    try:
        # Adjust the path to your model file
        model_path = os.path.join(os.path.dirname(__file__), 'xgboost_price_model.pkl')
        with open(model_path, 'rb') as file:
            model = pickle.load(file)
        return model
    except Exception as e:
        print(json.dumps({"error": f"Failed to load model: {str(e)}"}))
        sys.exit(1)

def predict_single(model, features):
    """Make single prediction"""
    try:
        # Convert features to numpy array
        input_data = np.array([features])
        
        # Make prediction
        prediction = model.predict(input_data)[0]
        
        # Get prediction probability/confidence if available
        confidence = None
        if hasattr(model, 'predict_proba'):
            try:
                proba = model.predict_proba(input_data)[0]
                confidence = float(max(proba))
            except:
                pass
        
        result = {
            "prediction": float(prediction),
            "confidence": confidence
        }
        
        return result
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}

def predict_batch(model, csv_path):
    """Make batch predictions from CSV"""
    try:
        # Load data
        data = pd.read_csv(csv_path)
        
        # Expected columns
        expected_cols = ['Year', 'Month', 'Rainfall_Minus1', 'Rainfall_Minus2', 
                        'Rainfall_Minus3', 'Total_Rainfall_3Months', 
                        'Area (Hectare)', 'Yield (Tonne/Hectare)']
        
        # Check if all columns exist
        missing_cols = set(expected_cols) - set(data.columns)
        if missing_cols:
            return {"error": f"Missing columns: {list(missing_cols)}"}
        
        # Select features in correct order
        features = data[expected_cols]
        
        # Make predictions
        predictions = model.predict(features)
        
        result = {
            "predictions": [float(pred) for pred in predictions],
            "total_processed": len(predictions)
        }
        
        return result
    except Exception as e:
        return {"error": f"Batch prediction failed: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python predict.py <single|batch> [args...]"}))
        sys.exit(1)
    
    # Load model
    model = load_model()
    
    prediction_type = sys.argv[1]
    
    if prediction_type == "single":
        if len(sys.argv) != 10:
            print(json.dumps({"error": "Single prediction requires 8 feature values"}))
            sys.exit(1)
        
        try:
            # Parse features from command line arguments
            features = [float(arg) for arg in sys.argv[2:]]
            result = predict_single(model, features)
            print(json.dumps(result))
        except ValueError as e:
            print(json.dumps({"error": f"Invalid feature values: {str(e)}"}))
            sys.exit(1)
    
    elif prediction_type == "batch":
        if len(sys.argv) != 3:
            print(json.dumps({"error": "Batch prediction requires CSV file path"}))
            sys.exit(1)
        
        csv_path = sys.argv[2]
        if not os.path.exists(csv_path):
            print(json.dumps({"error": f"CSV file not found: {csv_path}"}))
            sys.exit(1)
        
        result = predict_batch(model, csv_path)
        print(json.dumps(result))
    
    else:
        print(json.dumps({"error": "Invalid prediction type. Use 'single' or 'batch'"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
