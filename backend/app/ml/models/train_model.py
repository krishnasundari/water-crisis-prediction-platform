import os
import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score


# -----------------------------
# Generate Training Dataset
# -----------------------------
np.random.seed(42)

rows = 5000

rainfall = np.random.uniform(0, 300, rows)
population = np.random.randint(500, 50000, rows)
reservoir_capacity = np.random.uniform(5, 100, rows)
groundwater_level = np.random.uniform(2, 50, rows)

risk = []

for i in range(rows):

    score = 0

    if rainfall[i] < 60:
        score += 35

    if population[i] > 15000:
        score += 20

    if reservoir_capacity[i] < 40:
        score += 30

    if groundwater_level[i] < 15:
        score += 15

    if score >= 70:
        risk.append(2)      # High

    elif score >= 40:
        risk.append(1)      # Moderate

    else:
        risk.append(0)      # Safe


df = pd.DataFrame({
    "rainfall": rainfall,
    "population": population,
    "reservoir_capacity": reservoir_capacity,
    "groundwater_level": groundwater_level,
    "risk": risk
})

# -----------------------------
# Features
# -----------------------------
X = df[
    [
        "rainfall",
        "population",
        "reservoir_capacity",
        "groundwater_level"
    ]
]

y = df["risk"]

# -----------------------------
# Split
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)

# -----------------------------
# Scaling
# -----------------------------
scaler = StandardScaler()

X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# -----------------------------
# Model
# -----------------------------
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42
)

model.fit(X_train, y_train)

prediction = model.predict(X_test)

accuracy = accuracy_score(
    y_test,
    prediction
)

print(f"\nModel Accuracy : {accuracy*100:.2f}%")

# -----------------------------
# Save Files
# -----------------------------
BASE_DIR = os.path.dirname(__file__)

joblib.dump(
    model,
    os.path.join(BASE_DIR, "model.pkl")
)

joblib.dump(
    scaler,
    os.path.join(BASE_DIR, "scaler.pkl")
)

print("\nModel Saved Successfully.")
print("model.pkl")
print("scaler.pkl")