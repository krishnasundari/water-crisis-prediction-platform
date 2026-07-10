import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

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
      }}
    >
      <h2>🌊 Water Crisis</h2>

      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          padding: "10px",
          background: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        Logout
      </button>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
        }}
      >
        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/dashboard")}
        >
          📊 Dashboard
        </li>

        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/villages")}
        >
          🏘️ Villages
        </li>

        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/reservoirs")}
        >
          💧 Reservoirs
        </li>

        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/predictions")}
        >
          🤖 Predictions
        </li>

        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/maps")}
        >
          🗺️ Maps
        </li>

        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/reports")}
        >
          📄 Reports
        </li>
        <li
  style={{ cursor: "pointer", marginBottom: "12px" }}
  onClick={() => navigate("/analytics")}
>
  📈 Analytics
</li>

        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/ai-assistant")}
        >
          🤖 AI Assistant
        </li>
        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/search")}
        >
          🔍 Live Search
        </li>
        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/disaster-monitoring")}
        >
          🛡️ National Disasters
        </li>
        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/weather-monitoring")}
        >
          🌧️ Weather Monitor
        </li>
        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/rainfall-monitoring")}
        >
          🌧️ Rainfall Monitor
        </li>
        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/dam-monitoring")}
        >
          🛡️ Dam Monitor
        </li>
        <li
          style={{ cursor: "pointer", marginBottom: "12px" }}
          onClick={() => navigate("/river-monitoring")}
        >
          🌊 River Monitor
        </li>
      </ul>
    </div>
  );
}