import os
import joblib
import numpy as np

# ----------------------------------------------------
# Load trained model and scaler
# ----------------------------------------------------

BASE_DIR = os.path.dirname(__file__)

MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "scaler.pkl")

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)


# ----------------------------------------------------
# Predict Water Crisis Risk
# ----------------------------------------------------

def predict_water_crisis(
    rainfall: float,
    population: int,
    reservoir_capacity: float,
    groundwater_level: float,
):
    """
    Predict water crisis risk using trained ML model.

    Returns
    -------
    {
        "risk_score": float,
        "risk_level": str
    }
    """

    features = np.array([
        [
            rainfall,
            population,
            reservoir_capacity,
            groundwater_level,
        ]
    ])

    features = scaler.transform(features)

    prediction = model.predict(features)[0]

    probabilities = model.predict_proba(features)[0]

    confidence = round(float(max(probabilities) * 100), 2)

    if prediction == 0:
        level = "Safe"

    elif prediction == 1:
        level = "Moderate"

    else:
        level = "High"

    return {
        "risk_score": confidence,
        "risk_level": level,
    }

from datetime import datetime

def predict_flood_risk(
    rainfall: float,
    river_level: float,
    danger_level: float,
    reservoir_capacity: float,
    humidity: float,
    cloud_cover: float,
):
    """
    Combine weather parameters, precipitation levels, river stages, 
    and dam capacities to predict flood probability, severity, 
    confidence scores, and expected impacts.
    """
    # 1. Rainfall weight (max 40% impact)
    rain_contrib = min(40.0, rainfall * 2.5)
    
    # 2. River status weight (max 35% impact)
    river_ratio = (river_level / danger_level) if danger_level > 0 else 0.5
    river_contrib = min(35.0, river_ratio * 30.0)
    
    # 3. Reservoir saturation weight (max 15% impact)
    dam_contrib = min(15.0, (reservoir_capacity / 100.0) * 15.0)
    
    # 4. Humidity and cloud density (max 10% impact)
    weather_contrib = min(10.0, (humidity / 100.0) * 5.0 + (cloud_cover / 100.0) * 5.0)
    
    prob = round(rain_contrib + river_contrib + dam_contrib + weather_contrib, 2)
    prob = min(100.0, max(0.0, prob))
    
    # 5. Severity threshold bands
    if prob >= 85.0:
        severity = "Severe"
        impact = "Evacuation protocols triggered. Low-lying sectors face deep flooding and bank overtopping."
    elif prob >= 60.0:
        severity = "High"
        impact = "Significant overflow warning. Agricultural basins and structural areas face runoffs."
    elif prob >= 30.0:
        severity = "Moderate"
        impact = "Minor street pooling and slow urban drainage. Active monitoring of surrounding catchments."
    else:
        severity = "Safe"
        impact = "No flooding or overflow risks detected. Surrounding river systems flowing stably."
        
    # 6. Confidence Score based on parameter intensity
    conf = round(70.0 + (rainfall * 0.4) + (river_ratio * 10.0), 2)
    conf = min(98.0, max(60.0, conf))
    
    return {
        "flood_probability": prob,
        "flood_severity": severity,
        "confidence_score": conf,
        "expected_impact": impact,
        "prediction_time": datetime.now()
    }


# ----------------------------------------------------
# Test
# ----------------------------------------------------

if __name__ == "__main__":

    result = predict_water_crisis(
        rainfall=45,
        population=18000,
        reservoir_capacity=25,
        groundwater_level=10,
    )

    print(result)