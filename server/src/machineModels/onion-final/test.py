import joblib

try:
    model = joblib.load('onion.pkl')
    print("✓ Loaded with joblib")
    print(f"Model: {model}")
except Exception as e:
    print(f"Joblib failed: {e}")
