#!/usr/bin/env python3
# mlModels/onion_predict.py - Onion price prediction script for venv integration

import joblib
import pandas as pd
import numpy as np
import sys
import os
import json
from sklearn.preprocessing import LabelEncoder, StandardScaler

def load_model_and_encoders(model_path):
    """Load the trained model and preprocessing objects from joblib file"""
    try:
        # Load the complete model package (model + encoders + scaler)
        model_package = joblib.load(model_path)
        return model_package
    except FileNotFoundError:
        return None
    except Exception as e:
        return None

def predict_single(features):
    """
    Make single prediction
    features: [district, market, variety, year, month, rainfall_minus1, rainfall_minus2, rainfall_minus3, total_rainfall_3months, area_hectare, yield_tonne_per_hectare]
    """
    try:
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'onion.pkl')
        
        # Load the model package
        model_package = load_model_and_encoders(model_path)
        if model_package is None:
            return {'error': 'Could not load model package'}
        
        model = model_package['model']
        label_encoders = model_package['label_encoders']
        scaler = model_package.get('scaler', None)
        model_type = model_package.get('model_type', 'unknown')
        
        # Parse features
        district = features[0]
        market = features[1]
        variety = features[2]
        year = int(features[3])
        month = int(features[4])
        rainfall_minus1 = float(features[5])
        rainfall_minus2 = float(features[6])
        rainfall_minus3 = float(features[7])
        total_rainfall_3months = float(features[8])
        area_hectare = float(features[9])
        yield_tonne_per_hectare = float(features[10])
        
        # Create input DataFrame with original column names
        input_data = {
            'District': district,
            'Market Name': market,
            'Variety': variety,
            'Year': year,
            'Month': month,
            'Rainfall_Minus1': rainfall_minus1,
            'Rainfall_Minus2': rainfall_minus2,
            'Rainfall_Minus3': rainfall_minus3,
            'Total_Rainfall_3Months': total_rainfall_3months,
            'Area_Hectare': area_hectare,
            'Yield_TonnePerHectare': yield_tonne_per_hectare
        }
        
        df = pd.DataFrame([input_data])
        
        # Encode categorical variables using the same encoders from training
        for col in ["District", "Market Name", "Variety"]:
            if col in label_encoders:
                le = label_encoders[col]
                try:
                    # Transform the categorical value
                    df[col] = le.transform([df[col].iloc[0]])
                except ValueError as e:
                    # Handle unseen categories
                    return {'error': f'Unknown {col.lower()}: {df[col].iloc[0]}. Available options: {list(le.classes_)}'}
        
        # Apply scaling if the model requires it (e.g., MLP Regressor)
        if scaler is not None and model_type == 'MLP Regressor':
            df_scaled = scaler.transform(df)
            prediction = model.predict(df_scaled)
        else:
            prediction = model.predict(df)
        
        predicted_price = float(prediction[0])
        
        # Calculate confidence based on model type
        confidence = 85.0  # Default confidence
        try:
            # If it's a Random Forest or similar ensemble method
            if hasattr(model, 'estimators_'):
                # Get prediction from all trees for uncertainty estimation
                predictions = []
                for estimator in model.estimators_[:min(50, len(model.estimators_))]:
                    if scaler is not None and model_type == 'MLP Regressor':
                        pred = estimator.predict(df_scaled)
                    else:
                        pred = estimator.predict(df)
                    predictions.append(pred[0])
                
                std_dev = np.std(predictions)
                # Convert std deviation to confidence (inverse relationship)
                confidence = max(60.0, min(95.0, 90.0 - (std_dev * 2)))
                
        except Exception:
            confidence = 85.0
        
        return {
            'prediction': predicted_price,
            'confidence': round(confidence, 1),
            'model_type': model_type,
            'input_features': {
                'district': district,
                'market': market,
                'variety': variety,
                'year': year,
                'month': month,
                'rainfall_data': {
                    'minus1': rainfall_minus1,
                    'minus2': rainfall_minus2,
                    'minus3': rainfall_minus3,
                    'total3months': total_rainfall_3months
                },
                'production_data': {
                    'area_hectare': area_hectare,
                    'yield_tonne_per_hectare': yield_tonne_per_hectare
                }
            }
        }
        
    except Exception as e:
        return {'error': f'Prediction failed: {str(e)}'}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command provided'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'single':
        if len(sys.argv) < 13:  # command + 11 features
            print(json.dumps({'error': 'Insufficient arguments for single prediction'}))
            sys.exit(1)
        
        features = sys.argv[2:13]  # Get the 11 features
        result = predict_single(features)
        print(json.dumps(result))
        
    else:
        print(json.dumps({'error': f'Unknown command: {command}'}))
        sys.exit(1)

if __name__ == "__main__":
    main()
