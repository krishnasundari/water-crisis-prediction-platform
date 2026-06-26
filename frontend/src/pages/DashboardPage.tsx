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
    safe_villages: 0,
    moderate_risk_villages: 0,
    high_risk_villages: 0,
    active_alerts: 0,
    average_risk_score: 0,
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
      color: "#1976d2",
    },
    {
      title: "Reservoirs",
      value: stats.total_reservoirs,
      icon: "💧",
      color: "#0288d1",
    },
    {
      title: "Safe",
      value: stats.safe_villages,
      icon: "🟢",
      color: "#2e7d32",
    },
    {
      title: "Moderate",
      value: stats.moderate_risk_villages,
      icon: "🟡",
      color: "#f9a825",
    },
    {
      title: "High Risk",
      value: stats.high_risk_villages,
      icon: "🔴",
      color: "#d32f2f",
    },
    {
      title: "Alerts",
      value: stats.active_alerts,
      icon: "🚨",
      color: "#ef6c00",
    },
    {
      title: "Avg Risk Score",
      value: `${stats.average_risk_score}%`,
      icon: "📈",
      color: "#6a1b9a",
    },
  ];

  const riskData = [
    {
      name: "Safe",
      value: stats.safe_villages,
    },
    {
      name: "Moderate",
      value: stats.moderate_risk_villages,
    },
    {
      name: "High",
      value: stats.high_risk_villages,
    },
  ];

  const COLORS = ["#4caf50", "#ff9800", "#f44336"];

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          background: "#f4f6f9",
          padding: "30px",
          fontFamily: "Arial",
        }}
      >
        <h1 style={{ color: "#1565c0" }}>
          🌊 Water Crisis Prediction & Management Platform
        </h1>

        <p style={{ color: "#666", marginBottom: "30px" }}>
          AI Powered Water Resource Monitoring Dashboard
        </p>

        {/* Dashboard Cards */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: "20px",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
              }}
            >
              <h3 style={{ marginBottom: "15px" }}>
                {card.icon} {card.title}
              </h3>

              <h1
                style={{
                  color: card.color,
                  fontSize: "36px",
                  margin: 0,
                }}
              >
                {card.value}
              </h1>
            </div>
          ))}
        </div>

        {/* Risk Chart */}

        <div
          style={{
            marginTop: "40px",
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
          }}
        >
          <h2>📊 Risk Distribution</h2>

          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={riskData}
                dataKey="value"
                outerRadius={120}
                label
              >
                {riskData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index]}
                  />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}

        <div
          style={{
            marginTop: "40px",
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
          }}
        >
          <h2>🚨 Recent Alerts</h2>

          {stats.active_alerts === 0 ? (
            <p style={{ color: "green" }}>
              ✅ No active alerts. Water resources are currently stable.
            </p>
          ) : (
            <ul>
              <li>⚠️ Active water crisis alerts detected.</li>
            </ul>
          )}
        </div>

        {/* AI Summary */}

        <div
          style={{
            marginTop: "40px",
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
          }}
        >
          <h2>🤖 AI Prediction Summary</h2>

          <p style={{ lineHeight: "28px" }}>
            📈 Average Risk Score :
            <b> {stats.average_risk_score}%</b>

            <br />
            <br />

            🔴 High Risk Villages :
            <b> {stats.high_risk_villages}</b>

            <br />
            <br />

            🟢 Safe Villages :
            <b> {stats.safe_villages}</b>

            <br />
            <br />

            The AI model recommends continuous monitoring of rainfall,
            groundwater level and reservoir capacity for sustainable water
            resource management.
          </p>
        </div>
      </div>
    </div>
  );
}