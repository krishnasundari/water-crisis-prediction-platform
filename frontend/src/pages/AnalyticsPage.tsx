import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const API_BASE = "http://127.0.0.1:8000/api/v1";

export default function AnalyticsPage() {
  const [riskData, setRiskData] = useState({
    safe: 0,
    moderate: 0,
    high: 0,
  });

  const [reservoirs, setReservoirs] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);

  const [alerts, setAlerts] = useState({
    total: 0,
    unread: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  });

  const pieData = [
    {
      name: "Safe",
      value: riskData.safe,
    },
    {
      name: "Moderate",
      value: riskData.moderate,
    },
    {
      name: "High",
      value: riskData.high,
    },
  ];

  const COLORS = [
    "#22c55e",
    "#f59e0b",
    "#ef4444",
  ];

  useEffect(() => {
    fetch(`${API_BASE}/analytics/risk-distribution`)
      .then((res) => res.json())
      .then((data) => setRiskData(data))
      .catch(console.error);

    fetch(`${API_BASE}/analytics/reservoir-utilization`)
      .then((res) => res.json())
      .then((data) => setReservoirs(data))
      .catch(console.error);

    fetch(`${API_BASE}/analytics/district-summary`)
      .then((res) => res.json())
      .then((data) => setDistricts(data))
      .catch(console.error);

    fetch(`${API_BASE}/analytics/monthly-predictions`)
      .then((res) => res.json())
      .then((data) => setPredictions(data))
      .catch(console.error);

    fetch(`${API_BASE}/analytics/alerts-summary`)
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch(console.error);
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
        <h1 style={{ marginBottom: "25px" }}>
          📈 Analytics Dashboard
        </h1>

        {/* Summary Cards */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6,1fr)",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "18px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h4>Total Alerts</h4>
            <h2>{alerts.total}</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "18px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h4>Unread</h4>
            <h2>{alerts.unread}</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "18px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h4>Safe</h4>
            <h2>{riskData.safe}</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "18px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h4>Moderate</h4>
            <h2>{riskData.moderate}</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "18px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h4>High Risk</h4>
            <h2>{riskData.high}</h2>
          </div>

          <div
            style={{
              background: "white",
              padding: "18px",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h4>Critical</h4>
            <h2>{alerts.critical}</h2>
          </div>
        </div>

        {/* Charts */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "25px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h2>📊 Risk Distribution</h2>

            <PieChart width={420} height={300}>
              <Pie
                data={pieData}
                dataKey="value"
                outerRadius={95}
                label
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index]}
                  />
                ))}
              </Pie>

              <Tooltip />

              <Legend />
            </PieChart>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h2>💧 Reservoir Utilization</h2>

            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart data={reservoirs}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="utilization"
                  fill="#2563eb"
                  name="Utilization %"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
                {/* District Summary */}

        <div
          style={{
            background: "white",
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h2>🏘️ District Summary</h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "15px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#1976d2",
                  color: "white",
                }}
              >
                <th style={{ padding: "10px" }}>District</th>
                <th style={{ padding: "10px" }}>Villages</th>
                <th style={{ padding: "10px" }}>Population</th>
              </tr>
            </thead>

            <tbody>
              {districts.map((district) => (
                <tr
                  key={district.district}
                  style={{
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  <td style={{ padding: "10px" }}>
                    {district.district}
                  </td>

                  <td style={{ padding: "10px" }}>
                    {district.villages}
                  </td>

                  <td style={{ padding: "10px" }}>
                    {district.population}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Monthly Predictions */}

        <div
          style={{
            background: "white",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <h2>📈 Monthly Predictions</h2>

          <ResponsiveContainer
            width="100%"
            height={350}
          >
            <LineChart data={predictions}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="prediction_date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString()
                }
              />

              <YAxis />

              <Tooltip
                labelFormatter={(value) =>
                  new Date(value).toLocaleString()
                }
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="risk_score"
                stroke="#ef4444"
                strokeWidth={3}
                name="Risk Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
