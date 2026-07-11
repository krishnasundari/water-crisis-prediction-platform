import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useWebSocket from "../hooks/useWebSocket";

export default function Sidebar() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");
  };

  const loadUnreadAlerts = () => {
    fetch(`${getBaseURL()}/alerts/`)
      .then((res) => res.json())
      .then((data) => {
        // Count unread alerts
        const unread = data.filter((a: any) => !a.is_read).length;
        setUnreadCount(unread);
      })
      .catch((err) => console.error("Error loading alerts count in sidebar:", err));
  };

  useEffect(() => {
    loadUnreadAlerts();
  }, []);

  // Listen to WebSocket broadcasts to update notification count
  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("WebSocket Sidebar: syncing unread alerts count.");
      loadUnreadAlerts();
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  };

  return (
    <div
      style={{
        width: "220px",
        height: "100vh",
        background: "#0f172a",
        color: "white",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px border-slate-800"
      }}
    >
      <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", background: "linear-gradient(to right, #38bdf8, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "15px" }}>
        🌊 Platform Node
      </h2>

      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          padding: "8px",
          background: "#ef4444/20",
          color: "#f87171",
          border: "1px solid #ef4444/30",
          borderRadius: "8px",
          cursor: "pointer",
          marginBottom: "20px",
          fontSize: "12px",
          fontWeight: "bold"
        }}
      >
        Sign Out
      </button>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          fontSize: "13px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
          📊 Dashboard
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/villages")}>
          🏘️ Villages
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/reservoirs")}>
          💧 Reservoirs
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/predictions")}>
          🤖 Predictions
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/maps")}>
          🗺️ Maps
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/reports")}>
          📄 Reports
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/analytics")}>
          📈 Analytics
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/ai-assistant")}>
          🤖 AI Assistant
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/search")}>
          🔍 Live Search
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/disaster-monitoring")}>
          🛡️ National Disasters
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/weather-monitoring")}>
          🌧️ Weather Monitor
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/rainfall-monitoring")}>
          🌧️ Rainfall Monitor
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/dam-monitoring")}>
          🛡️ Dam Monitor
        </li>
        <li style={{ cursor: "pointer" }} onClick={() => navigate("/river-monitoring")}>
          🌊 River Monitor
        </li>
        <li style={{ cursor: "pointer", position: "relative", fontWeight: unreadCount > 0 ? "bold" : "normal" }} onClick={() => navigate("/alerts")}>
          🚨 Operations Alerts
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                right: "10px",
                background: "#ef4444",
                color: "white",
                borderRadius: "10px",
                padding: "2px 6px",
                fontSize: "10px",
                fontWeight: "black",
                animation: "pulse 2s infinite"
              }}
            >
              {unreadCount}
            </span>
          )}
        </li>
      </ul>
    </div>
  );
}