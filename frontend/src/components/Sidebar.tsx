import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useWebSocket from "../hooks/useWebSocket";
import { 
  LayoutDashboard, 
  Home, 
  Database, 
  Brain, 
  Map, 
  FileText, 
  LineChart, 
  MessageSquare, 
  Search, 
  ShieldAlert, 
  CloudRain, 
  Droplets, 
  Activity, 
  Waves, 
  AlertTriangle, 
  LogOut 
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
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
        const unread = data.filter((a: any) => !a.is_read).length;
        setUnreadCount(unread);
      })
      .catch((err) => console.error("Error loading alerts count in sidebar:", err));
  };

  useEffect(() => {
    loadUnreadAlerts();
  }, []);

  useWebSocket((event) => {
    if (event === "sync_complete") {
      loadUnreadAlerts();
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  };

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Villages", path: "/villages", icon: Home },
    { name: "Reservoirs", path: "/reservoirs", icon: Database },
    { name: "Predictions", path: "/predictions", icon: Brain },
    { name: "Maps", path: "/maps", icon: Map },
    { name: "Reports", path: "/reports", icon: FileText },
    { name: "Analytics", path: "/analytics", icon: LineChart },
    { name: "AI Assistant", path: "/ai-assistant", icon: MessageSquare },
    { name: "Live Search", path: "/search", icon: Search },
    { name: "National Disasters", path: "/disaster-monitoring", icon: ShieldAlert },
    { name: "Weather Monitor", path: "/weather-monitoring", icon: CloudRain },
    { name: "Rainfall Monitor", path: "/rainfall-monitoring", icon: Droplets },
    { name: "Dam Monitor", path: "/dam-monitoring", icon: Activity },
    { name: "River Monitor", path: "/river-monitoring", icon: Waves },
  ];

  return (
    <div
      style={{
        width: "280px",
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #1e293b",
        flexShrink: 0,
        boxSizing: "border-box"
      }}
    >
      <h2 style={{ 
        fontSize: "1.4rem", 
        fontWeight: 900, 
        background: "linear-gradient(to right, #38bdf8, #60a5fa)", 
        WebkitBackgroundClip: "text", 
        WebkitTextFillColor: "transparent", 
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }}>
        🌊 Platform Node
      </h2>

      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          padding: "12px",
          background: "rgba(239, 68, 68, 0.1)",
          color: "#f87171",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: "10px",
          cursor: "pointer",
          marginBottom: "28px",
          fontSize: "13px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.3s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
        }}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          fontSize: "15px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <li 
              key={item.path} 
              onClick={() => navigate(item.path)}
              style={{ 
                cursor: "pointer",
                padding: "10px 14px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                transition: "all 0.2s",
                background: isActive ? "rgba(56, 189, 248, 0.15)" : "transparent",
                color: isActive ? "#38bdf8" : "#94a3b8",
                fontWeight: isActive ? "bold" : "normal"
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#94a3b8";
                }
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </li>
          );
        })}

        {/* Operational Alerts item with unread notification badge */}
        <li 
          onClick={() => navigate("/alerts")}
          style={{ 
            cursor: "pointer",
            padding: "10px 14px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            transition: "all 0.2s",
            position: "relative",
            background: location.pathname === "/alerts" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: location.pathname === "/alerts" ? "#38bdf8" : "#94a3b8",
            fontWeight: unreadCount > 0 || location.pathname === "/alerts" ? "bold" : "normal"
          }}
          onMouseEnter={(e) => {
            if (location.pathname !== "/alerts") {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.color = "white";
            }
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== "/alerts") {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }
          }}
        >
          <AlertTriangle className="w-5 h-5" />
          <span>Operations Alerts</span>
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                right: "12px",
                background: "#ef4444",
                color: "white",
                borderRadius: "10px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: "black",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)"
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