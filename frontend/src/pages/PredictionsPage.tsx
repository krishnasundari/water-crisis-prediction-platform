import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
  fetch("http://127.0.0.1:8000/api/v1/predictions/")
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      setPredictions(data);
    })
    .catch((err) => console.error(err));
}, []);
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
        <h1>🤖 Water Crisis Predictions</h1>

        <table
          style={{
            width: "100%",
            background: "white",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Village</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
            </tr>
          </thead>

          <tbody>
  <tr>
    <td colSpan={4}>
      {JSON.stringify(predictions)}
    </td>
  </tr>
</tbody>
        </table>
      </div>
    </div>
  );
}