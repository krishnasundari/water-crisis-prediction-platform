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