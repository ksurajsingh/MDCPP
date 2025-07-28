#!/usr/bin/env python3
# mlModels/cotton_predict.py - Cotton price prediction script for testing

import joblib
import pandas as pd
import numpy as np
import sys
import os
import json

def load_model(model_path):
    """Load the trained model from joblib file"""
    try:
        model = joblib.load(model_path)
        return model
    except FileNotFoundError:
        return None
    except Exception as e:
        return None

def predict_single(features):
    """
    Make single prediction for cotton
    features: [district, market, variety, year, month, rainfall_minus1, rainfall_minus2, rainfall_minus3, total_rainfall_3months, area_hectare, yield_tonne_per_hectare]
    """
    try:
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, 'cotton_model.pkl')
        
        # Load the model
        model = load_model(model_path)
        if model is None:
            return {'error': 'Could not load cotton model'}
        
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
        
        # Create input DataFrame (same structure as training data)
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
        
        # Make prediction
        prediction = model.predict(df)
        predicted_price = float(prediction[0])
        
        # Simple confidence calculation
        confidence = 85.0  # Default confidence
        try:
            if hasattr(model, 'estimators_'):
                # For ensemble methods
                predictions = []
                for estimator in model.estimators_[:min(20, len(model.estimators_))]:
                    pred = estimator.predict(df)
                    predictions.append(pred[0])
                
                std_dev = np.std(predictions)
                confidence = max(60.0, min(95.0, 90.0 - (std_dev * 2)))
        except Exception:
            confidence = 85.0
        
        return {
            'prediction': predicted_price,
            'confidence': round(confidence, 1),
            'crop_type': 'cotton',
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
        return {'error': f'Cotton prediction failed: {str(e)}'}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command provided'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'single':
        if len(sys.argv) < 13:  # command + 11 features
            print(json.dumps({'error': 'Insufficient arguments for cotton prediction'}))
            sys.exit(1)
        
        features = sys.argv[2:13]  # Get the 11 features
        result = predict_single(features)
        print(json.dumps(result))
        
    elif command == 'test':
        # Test with dummy cotton data
        dummy_features = [
            'Raichur',      # district
            'Raichur',      # market
            'Cotton',       # variety
            '2024',         # year
            '10',           # month (October - cotton harvest season)
            '45.2',         # rainfall_minus1
            '67.8',         # rainfall_minus2
            '23.4',         # rainfall_minus3
            '136.4',        # total_rainfall_3months
            '15000.0',      # area_hectare
            '1.2'           # yield_tonne_per_hectare
        ]
        
        print("🧪 Testing cotton model with dummy data...")
        result = predict_single(dummy_features)
        print(json.dumps(result, indent=2))
        
    else:
        print(json.dumps({'error': f'Unknown command: {command}'}))
        sys.exit(1)

if __name__ == "__main__":
    main()
