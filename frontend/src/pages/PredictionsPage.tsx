import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<any[]>([]);

  const [newPrediction, setNewPrediction] = useState({
    village_id: "",
    rainfall: "",
    population: "",
    reservoir_capacity: "",
    groundwater_level: "",
  });

  const loadPredictions = () => {
    fetch("http://127.0.0.1:8000/api/v1/predictions")
      .then((res) => res.json())
      .then((data) => {
  console.log(data);
  setPredictions(data);
})
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const addPrediction = async () => {
    await fetch("http://127.0.0.1:8000/api/v1/predictions/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        village_id: Number(newPrediction.village_id),
        rainfall: Number(newPrediction.rainfall),
        population: Number(newPrediction.population),
        reservoir_capacity: Number(newPrediction.reservoir_capacity),
        groundwater_level: Number(newPrediction.groundwater_level),
      }),
    });

    setNewPrediction({
      village_id: "",
      rainfall: "",
      population: "",
      reservoir_capacity: "",
      groundwater_level: "",
    });

    loadPredictions();
  };

  const deletePrediction = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/v1/predictions/${id}`, {
      method: "DELETE",
    });

    loadPredictions();
  };

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          padding: "30px",
          background: "#f5f7fa",
          minHeight: "100vh",
        }}
      >
        <h1>🤖 Predictions</h1>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <h2>Create Prediction</h2>

          <input
            placeholder="Village ID"
            value={newPrediction.village_id}
            onChange={(e) =>
              setNewPrediction({
                ...newPrediction,
                village_id: e.target.value,
              })
            }
          />

          <input
            placeholder="Rainfall"
            value={newPrediction.rainfall}
            onChange={(e) =>
              setNewPrediction({
                ...newPrediction,
                rainfall: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <input
            placeholder="Population"
            value={newPrediction.population}
            onChange={(e) =>
              setNewPrediction({
                ...newPrediction,
                population: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <input
            placeholder="Reservoir Capacity"
            value={newPrediction.reservoir_capacity}
            onChange={(e) =>
              setNewPrediction({
                ...newPrediction,
                reservoir_capacity: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <input
            placeholder="Groundwater Level"
            value={newPrediction.groundwater_level}
            onChange={(e) =>
              setNewPrediction({
                ...newPrediction,
                groundwater_level: e.target.value,
              })
            }
            style={{ marginLeft: "10px" }}
          />

          <button
            onClick={addPrediction}
            style={{
              marginLeft: "10px",
              padding: "8px 15px",
              background: "#1565c0",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Predict
          </button>
        </div>

        <table
          style={{
            width: "100%",
            background: "white",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Village</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
              <th>Delete</th>
            </tr>
          </thead>

          <tbody>
            {predictions.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.village_id}</td>
                <td>{p.risk_score}</td>
                <td>{p.risk_level}</td>
                <td>
                  <button
                    onClick={() => deletePrediction(p.id)}
                    style={{
                      background: "red",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}