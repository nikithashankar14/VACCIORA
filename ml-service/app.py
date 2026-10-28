"""
app.py
Vacciora ML Risk Prediction Microservice (Flask on port 5001)
"""

import os
import joblib
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__)

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model.pkl")
loaded_artifact = None
model_version = "fallback-rule-v1"
is_trained_model_loaded = False

def load_model():
    global loaded_artifact, model_version, is_trained_model_loaded
    if os.path.exists(MODEL_PATH):
        try:
            loaded_artifact = joblib.load(MODEL_PATH)
            model_version = loaded_artifact.get("model_version", "v1.0.0-gbc-uip")
            is_trained_model_loaded = True
            app.logger.info(f"Loaded trained model artifact: {model_version}")
            print(f"[ML-SERVICE] Loaded trained model: {model_version}")
        except Exception as e:
            app.logger.warning(f"Error loading model.pkl: {e}. Falling back to rule-based scorer.")
            print(f"[ML-SERVICE WARNING] Error loading model.pkl: {e}. Falling back to rule-based scorer.")
            is_trained_model_loaded = False
    else:
        app.logger.warning("model.pkl not found. Running with rule-based fallback scorer.")
        print("[ML-SERVICE WARNING] model.pkl not found. Running with rule-based fallback scorer.")
        is_trained_model_loaded = False

load_model()

def rule_based_scorer(features):
    """
    Guaranteed fallback scorer if model.pkl is missing or corrupt.
    Uses identical weighted logistic formula.
    """
    past_delay = float(features.get("pastDelayCount", 0))
    avg_delay = float(features.get("avgDelayDays", 0))
    missed_appts = float(features.get("missedAppointmentCount", 0))
    ack_rate = float(features.get("reminderAckRate", 0.5))
    dist_km = float(features.get("distanceToCenterKm", 5.0))
    gap_days = float(features.get("previousDoseGapDays", 0))
    
    z = (
        - 1.8
        + 0.45 * past_delay
        + 0.045 * avg_delay
        + 0.65 * missed_appts
        - 1.60 * ack_rate
        + 0.08 * dist_km
        + 0.025 * gap_days
    )
    score = float(1.0 / (1.0 + np.exp(-z)))
    return round(score, 4)

def determine_contributing_factors(features, score):
    factors = []
    past_delay = float(features.get("pastDelayCount", 0))
    avg_delay = float(features.get("avgDelayDays", 0))
    missed_appts = float(features.get("missedAppointmentCount", 0))
    ack_rate = float(features.get("reminderAckRate", 1.0))
    dist_km = float(features.get("distanceToCenterKm", 0))
    gap_days = float(features.get("previousDoseGapDays", 0))
    
    if past_delay >= 2:
        factors.append(f"History of {int(past_delay)} delayed vaccinations")
    if avg_delay >= 14:
        factors.append(f"High historical average dose delay ({avg_delay:.0f} days)")
    if missed_appts >= 1:
        factors.append(f"{int(missed_appts)} unfulfilled scheduled appointments")
    if ack_rate < 0.4:
        factors.append("Low reminder acknowledgement and interaction rate")
    if dist_km >= 12.0:
        factors.append(f"Significant travel distance to vaccination facility ({dist_km:.1f} km)")
    if gap_days >= 15:
        factors.append(f"Extended interval elapsed since prior dose ({gap_days:.0f} days overdue)")
        
    if not factors:
        if score < 0.35:
            factors.append("Consistent vaccination history and prompt attendance")
        else:
            factors.append("Moderate risk profile based on combined transit and timing metrics")
            
    return factors

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "vacciora-ml-prediction",
        "modelVersion": model_version,
        "isTrainedModelLoaded": is_trained_model_loaded
    })

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True) or {}
    
    features = {
        "pastDelayCount": float(data.get("pastDelayCount", 0)),
        "avgDelayDays": float(data.get("avgDelayDays", 0)),
        "missedAppointmentCount": float(data.get("missedAppointmentCount", 0)),
        "reminderAckRate": float(data.get("reminderAckRate", 0.5)),
        "distanceToCenterKm": float(data.get("distanceToCenterKm", 5.0)),
        "previousDoseGapDays": float(data.get("previousDoseGapDays", 0))
    }
    
    if is_trained_model_loaded and loaded_artifact and "model" in loaded_artifact:
        try:
            model = loaded_artifact["model"]
            feature_order = loaded_artifact.get("feature_names", list(features.keys()))
            X_input = np.array([[features[k] for k in feature_order]])
            
            # Predict probability of class 1 (delayed/missed dose)
            probabilities = model.predict_proba(X_input)[0]
            risk_score = round(float(probabilities[1]), 4)
            current_model_version = model_version
        except Exception as err:
            app.logger.error(f"Inference error: {err}. Using fallback.")
            risk_score = rule_based_scorer(features)
            current_model_version = "fallback-rule-v1"
    else:
        risk_score = rule_based_scorer(features)
        current_model_version = "fallback-rule-v1"
        
    # Categorize risk
    if risk_score < 0.35:
        risk_category = "low"
    elif risk_score < 0.70:
        risk_category = "medium"
    else:
        risk_category = "high"
        
    contributing_factors = determine_contributing_factors(features, risk_score)
    
    return jsonify({
        "riskScore": risk_score,
        "riskCategory": risk_category,
        "contributingFactors": contributing_factors,
        "modelVersion": current_model_version
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
