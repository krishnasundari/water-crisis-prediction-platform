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
  LogOut,
  Droplet
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
    <div className="w-80 min-h-screen bg-slate-900 text-slate-100 py-8 px-6 flex flex-col border-r border-slate-800 shrink-0 select-none box-border">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3.5 mb-7">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
          <Droplet className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
          Platform Node
        </h2>
      </div>

      {/* Logout Action */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 px-4.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-xl text-base font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer mb-8 outline-none"
      >
        <LogOut className="w-5 h-5" />
        <span>Sign Out</span>
      </button>

      {/* Navigation List */}
      <ul className="space-y-2 p-0 m-0 list-none text-base md:text-lg font-bold">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <li 
              key={item.path} 
              onClick={() => navigate(item.path)}
              className={`group flex items-center gap-4 py-3.5 px-4.5 rounded-xl cursor-pointer transition-all ${
                isActive 
                  ? "bg-sky-500/10 text-sky-400 font-black" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Icon className={`w-5.5 h-5.5 transition-transform group-hover:scale-105 ${
                isActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-350"
              }`} />
              <span>{item.name}</span>
            </li>
          );
        })}

        {/* Operational Alerts item with unread notification badge */}
        <li 
          onClick={() => navigate("/alerts")}
          className={`group flex items-center gap-4 py-3.5 px-4.5 rounded-xl cursor-pointer relative transition-all ${
            location.pathname === "/alerts"
              ? "bg-sky-500/10 text-sky-400 font-black"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <AlertTriangle className={`w-5.5 h-5.5 transition-transform group-hover:scale-105 ${
            location.pathname === "/alerts" ? "text-sky-400" : "text-slate-500 group-hover:text-slate-350"
          }`} />
          <span>Operations Alerts</span>
          {unreadCount > 0 && (
            <span className="absolute right-4.5 bg-red-500 text-white rounded-full px-2.5 py-0.5 text-xs font-black shadow-lg shadow-red-500/30 animate-pulse">
              {unreadCount}
            </span>
          )}
        </li>
      </ul>
    </div>
  );
}