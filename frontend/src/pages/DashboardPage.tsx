import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_villages: 0,
    total_reservoirs: 0,
    high_risk_villages: 0,
    active_alerts: 0,
  });

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        console.error("Error fetching dashboard stats:", err);
      });
  }, []);

  const cards = [
    {
      title: "Total Villages",
      value: stats.total_villages,
      icon: "🏘️",
    },
    {
      title: "Reservoirs",
      value: stats.total_reservoirs,
      icon: "💧",
    },
    {
      title: "High Risk Villages",
      value: stats.high_risk_villages,
      icon: "⚠️",
    },
    {
      title: "Active Alerts",
      value: stats.active_alerts,
      icon: "🚨",
    },
  ];

  const riskData = [
    { name: "Safe", value: 1 },
    { name: "Moderate", value: 1 },
    { name: "High", value: 1 },
  ];

  const COLORS = ["#4caf50", "#ff9800", "#f44336"];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          backgroundColor: "#f5f7fa",
          padding: "30px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1 style={{ color: "#1565c0" }}>
          🌊 Water Crisis Prediction & Management Platform
        </h1>

        <p style={{ color: "#555" }}>
          AI Powered Water Resource Monitoring Dashboard
        </p>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginTop: "30px",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              }}
            >
              <h3>
                {card.icon} {card.title}
              </h3>

              <h1 style={{ color: "#1976d2" }}>{card.value}</h1>
            </div>
          ))}
        </div>

        {/* Risk Distribution Chart */}
        <div
          style={{
            marginTop: "40px",
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h2>📊 Risk Distribution</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskData}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {riskData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div
          style={{
            marginTop: "40px",
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h2>🚨 Recent Alerts</h2>

          <ul>
            <li>Village A - Water level critically low</li>
            <li>Village B - Drought risk increased</li>
            <li>Village C - Reservoir below 30%</li>
          </ul>
        </div>

        {/* AI Summary */}
        <div
          style={{
            marginTop: "30px",
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h2>🤖 AI Prediction Summary</h2>

          <p>
            Based on rainfall trends and reservoir levels, 8 villages may face
            water shortages within the next 30 days.
          </p>
        </div>
      </div>
    </div>
  );
}