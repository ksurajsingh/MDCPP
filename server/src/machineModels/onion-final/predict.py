#!/usr/bin/env python3
# mlModels/onion_predict.py - Onion price prediction script for venv integration

import pickle
import pandas as pd
import numpy as np
import sys
import os
import json
import joblib
from sklearn.preprocessing import LabelEncoder

def load_model(model_path):
    """Load the trained model from pickle file"""
    try:
        with open(model_path, 'rb') as file:
            model = pickle.load(file)
        return model
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
        
        # Load the model
        model = joblib.load(model_path)
        if model is None:
            return {'error': 'Could not load model'}
        
        # Parse features
        districtEncodes={
                'Belagaum':'0',
                'Bidar':'1',
                'Dharwad':'2',
                'Gadag':'3',
                'Haveri':'4'
                }
        marketEncodes={
                 'Belgaum':'0',
                 'Dharwar':'1',
                 'Gadag':'2', 
                 'Haveri':'3', 
                 'Hubli (Amaragol)':'4', 
                 'Ranebennur':'5' 
                }
        varietyEncodes={
                'Pusa-Red':'0',
                'White':'1',
                'Puna':'2',
                'Telagi':'3',
                'Onion':'4',
                'Other':'5',
                'Local':'6'
                }
        district = districtEncodes[features[0]]
        market = marketEncodes[features[1]]
        variety = varietyEncodes[features[2]]
        year = int(features[3])
        month = int(features[4])
        rainfall_minus1 = float(features[5])
        rainfall_minus2 = float(features[6])
        rainfall_minus3 = float(features[7])
        total_rainfall_3months = float(features[8])
        area_hectare = float(features[9])
        yield_tonne_per_hectare = float(features[10])
        
        # Create input DataFrame
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
        
        # Handle categorical variables if needed
        # Note: This assumes your model can handle categorical data directly
        # If your model requires encoded categorical variables, you'll need to 
        # load the same encoders used during training

        
        # Make prediction
        prediction = model.predict(df)
        predicted_price = float(prediction[0])
        
        # Calculate confidence (this is a placeholder - adjust based on your model)
        # You might want to use prediction intervals or model uncertainty here
        confidence = 85.0  # Placeholder confidence score
        
        return {
            'prediction': predicted_price,
            'confidence': confidence,
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
