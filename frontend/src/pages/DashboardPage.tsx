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
import { getBaseURL } from "../utils/api";

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

  const loadData = () => {
    fetch(`${getBaseURL()}/dashboard/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Error fetching dashboard stats:", err));

    fetch(`${getBaseURL()}/alerts/`)
      .then((res) => res.json())
      .then((data) => {
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
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f9" }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          padding: "48px 40px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxSizing: "border-box",
          maxWidth: "calc(100% - 280px)"
        }}
      >
        <h1 style={{ color: "#0f172a", fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "20px" }}>
          🌊 Water Crisis Prediction & Management Platform
        </h1>

        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "32px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "#e8f5e9",
              padding: "18px 24px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "16px",
              color: "#1b5e20",
              border: "1px solid #c8e6c9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
          >
            🟢 System Status : Online
          </div>

          <div
            style={{
              background: "#e3f2fd",
              padding: "18px 24px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "16px",
              color: "#0d47a1",
              border: "1px solid #bbdefb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
          >
            📡 AI Prediction : Active
          </div>

          <div
            style={{
              background: "#fff3e0",
              padding: "18px 24px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "16px",
              color: "#e65100",
              border: "1px solid #ffe0b2",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
          >
            🕒 Last Updated : Just Now
          </div>
        </div>

        <p style={{ color: "#475569", fontSize: "18px", fontWeight: 500, marginBottom: "36px" }}>
          AI Powered Water Resource Monitoring Dashboard
        </p>

        {/* Dashboard Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                background: `linear-gradient(135deg, ${card.color}, ${card.color}CC)`,
                color: "white",
                transition: "all 0.3s",
                cursor: "pointer",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
              }}
            >
              <h3
                style={{
                  marginBottom: "12px",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: 800,
                  opacity: 0.9,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>{card.icon}</span>
                <span>{card.title}</span>
              </h3>

              <h1
                style={{
                  color: "white",
                  fontSize: "46px",
                  fontWeight: 900,
                  margin: 0,
                  letterSpacing: "-0.02em"
                }}
              >
                {card.value}
              </h1>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div
          style={{
            marginTop: "48px",
            background: "white",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0"
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginBottom: "24px" }}>📊 Risk Distribution</h2>

          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie
                data={riskData}
                dataKey="value"
                innerRadius={80}
                outerRadius={135}
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
            marginTop: "48px",
            background: "white",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0"
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginBottom: "24px" }}>📈 Monthly Water Risk Trend</h2>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 13, fontWeight: "bold" }} />
              <YAxis tick={{ fontSize: 13, fontWeight: "bold" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 13, fontWeight: "bold" }} />
              <Line
                type="monotone"
                dataKey="risk"
                stroke="#1976d2"
                strokeWidth={4}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts Section */}
        <div
          style={{
            marginTop: "48px",
            background: "white",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0"
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginBottom: "20px" }}>🚨 Active Operations Alerts Feed</h2>

          {alerts.length === 0 ? (
            <p style={{ color: "#10b981", fontSize: "16px", fontWeight: "bold" }}>
              ✅ All systems stable. No active alerts or breaches logged.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "20px" }}>
              {alerts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "18px 24px",
                    borderRadius: "12px",
                    fontSize: "15px",
                    background:
                      a.severity === "critical"
                        ? "#fef2f2"
                        : a.severity === "high"
                        ? "#fff7ed"
                        : "#fef8e6",
                    borderLeft: `6px solid ${
                      a.severity === "critical"
                        ? "#ef4444"
                        : a.severity === "high"
                        ? "#f97316"
                        : "#eab308"
                    }`,
                    color: "#1e293b",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span style={{
                      color:
                        a.severity === "critical"
                          ? "#dc2626"
                          : a.severity === "high"
                          ? "#ea580c"
                          : "#ca8a04"
                    }}>
                      [{a.severity}] {a.alert_type} | 📡 {a.data_source || 'AI Prediction Engine'}
                    </span>
                    <span style={{ color: "#64748b" }}>
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ marginTop: "8px", lineHeight: "24px", fontWeight: 550 }}>{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Summary Section */}
        <div
          style={{
            marginTop: "48px",
            background: "white",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0"
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginBottom: "20px" }}>🤖 AI Prediction Summary</h2>

          <div
            style={{
              lineHeight: "36px",
              fontSize: "18px",
              background: "#f9fafb",
              padding: "24px",
              borderRadius: "12px",
              color: "#334155"
            }}
          >
            📈 Average Risk Score :
            <b style={{ fontSize: "22px", color: "#6a1b9a", marginLeft: "6px" }}> {stats.average_risk_score}%</b>

            <br />
            <br />

            🔴 High Risk Villages :
            <b style={{ fontSize: "22px", color: "#d32f2f", marginLeft: "6px" }}> {stats.high_risk_villages}</b>

            <br />
            <br />

            🟢 Safe Villages :
            <b style={{ fontSize: "22px", color: "#2e7d32", marginLeft: "6px" }}> {stats.safe_villages}</b>

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