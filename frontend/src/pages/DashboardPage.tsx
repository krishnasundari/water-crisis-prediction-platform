import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

import useWebSocket from "../hooks/useWebSocket";

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
  const [alerts, setAlerts] = useState<any[]>([]);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : "https://water-crisis-prediction-platform-1.onrender.com/api/v1";
  };

  const loadData = () => {
    fetch(`${getBaseURL()}/dashboard/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Error fetching dashboard stats:", err));

    fetch(`${getBaseURL()}/alerts/`)
      .then((res) => res.json())
      .then((data) => {
        // Show last 5 active alerts
        const active = data.filter((a: any) => !a.is_read).slice(0, 5);
        setAlerts(active);
      })
      .catch((err) => console.error("Error fetching dashboard alerts:", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("Telemetry sync complete. Reloading dashboard data.");
      loadData();
    }
  });

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
  const monthlyTrend = [
  { month: "Jan", risk: 45 },
  { month: "Feb", risk: 52 },
  { month: "Mar", risk: 60 },
  { month: "Apr", risk: 58 },
  { month: "May", risk: 72 },
  { month: "Jun", risk: stats.average_risk_score },
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
        <div
  style={{
    display: "flex",
    gap: "20px",
    marginBottom: "25px",
    flexWrap: "wrap",
  }}
>
  <div
    style={{
      background: "#e8f5e9",
      padding: "15px 20px",
      borderRadius: "10px",
      fontWeight: 600,
    }}
  >
    🟢 System Status : Online
  </div>

  <div
    style={{
      background: "#e3f2fd",
      padding: "15px 20px",
      borderRadius: "10px",
      fontWeight: 600,
    }}
  >
    📡 AI Prediction : Active
  </div>

  <div
    style={{
      background: "#fff3e0",
      padding: "15px 20px",
      borderRadius: "10px",
      fontWeight: 600,
    }}
  >
    🕒 Last Updated : Just Now
  </div>
</div>

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
                background: `linear-gradient(135deg, ${card.color}, ${card.color}CC)`,
color: "white",
transition: "0.3s",
cursor: "pointer",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
              }}
            >
              <h3
  style={{
    marginBottom: "15px",
    color: "white",
  }}
>
                {card.icon} {card.title}
              </h3>

              <h1
                style={{
                  color: "white",
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
    innerRadius={70}
    outerRadius={120}
    paddingAngle={4}
    label
>
                {riskData.map((_, index) => (
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
        <div
  style={{
    marginTop: "40px",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
  }}
>
  <h2>📈 Monthly Water Risk Trend</h2>

  <ResponsiveContainer width="100%" height={320}>
    <LineChart data={monthlyTrend}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line
        type="monotone"
        dataKey="risk"
        stroke="#1976d2"
        strokeWidth={3}
      />
    </LineChart>
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
          <h2>🚨 Active Operations Alerts Feed</h2>

          {alerts.length === 0 ? (
            <p style={{ color: "green", fontSize: "14px", fontWeight: "bold" }}>
              ✅ All systems stable. No active alerts or breaches logged.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
              {alerts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    background:
                      a.severity === "critical"
                        ? "#fef2f2"
                        : a.severity === "high"
                        ? "#fff7ed"
                        : "#fef8e6",
                    borderLeft: `5px solid ${
                      a.severity === "critical"
                        ? "#ef4444"
                        : a.severity === "high"
                        ? "#f97316"
                        : "#eab308"
                    }`,
                    color: "#1e293b",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span style={{
                      color:
                        a.severity === "critical"
                          ? "#dc2626"
                          : a.severity === "high"
                          ? "#ea580c"
                          : "#ca8a04"
                    }}>
                      [{a.severity}] {a.alert_type}
                    </span>
                    <span style={{ color: "#64748b" }}>
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ marginTop: "5px", lineHeight: "18px" }}>{a.message}</div>
                </div>
              ))}
            </div>
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

<div
  style={{
    lineHeight: "30px",
    fontSize: "16px",
    background: "#f9fafb",
    padding: "20px",
    borderRadius: "12px",
  }}
>
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
</div>
        </div>
      </div>
    </div>
  );
}