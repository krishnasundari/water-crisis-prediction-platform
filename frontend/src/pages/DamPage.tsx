import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import useWebSocket from "../hooks/useWebSocket";

// Map center adjustment component
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Leaflet markers color generator
const getMarkerIcon = (status: string) => {
  let color = "blue";
  if (status === "Breached" || status === "Critical") {
    color = "red";
  } else if (status === "Warning") {
    color = "orange";
  } else {
    color = "green";
  }
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
};

export default function DamPage() {
  const [dams, setDams] = useState<any[]>([]);
  const [selectedDam, setSelectedDam] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : "https://water-crisis-prediction-platform-1.onrender.com/api/v1";
  };

  const loadDams = async () => {
    try {
      const res = await fetch(`${getBaseURL()}/reservoirs/`);
      const data = await res.json();
      
      // Fetch live status for all dams to resolve percentages and marker colors
      const detailedDams = await Promise.all(
        data.map(async (dam: any) => {
          const detailRes = await fetch(`${getBaseURL()}/reservoirs/${dam.id}/live-status`);
          return detailRes.json();
        })
      );
      
      setDams(detailedDams);
      
      // Default select the first dam if none selected
      if (detailedDams.length > 0 && !selectedDam) {
        setSelectedDam(detailedDams[0]);
        loadHistory(detailedDams[0].id);
      } else if (selectedDam) {
        // Keep selected dam updated with live values
        const updatedSelected = detailedDams.find((d) => d.id === selectedDam.id);
        if (updatedSelected) {
          setSelectedDam(updatedSelected);
        }
      }
    } catch (err) {
      console.error("Error loading reservoirs:", err);
    }
  };

  const loadHistory = async (id: number) => {
    try {
      const res = await fetch(`${getBaseURL()}/reservoirs/${id}/history`);
      const historyData = await res.json();
      setHistory(historyData);
    } catch (err) {
      console.error("Error loading reservoir history:", err);
    }
  };

  useEffect(() => {
    loadDams();
  }, []);

  // WebSocket Live Sync Listener
  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("WebSocket: Telemetry sync completed. Refreshing dam monitoring portal.");
      loadDams();
      if (selectedDam) {
        loadHistory(selectedDam.id);
      }
    }
  });

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "Breached":
        return "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-extrabold";
      case "Critical":
        return "bg-red-500/10 text-red-300 border border-red-500/20 font-bold";
      case "Warning":
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold";
      default:
        return "bg-green-500/20 text-green-400 border border-green-500/30";
    }
  };

  const mapCenter: [number, number] = selectedDam
    ? [selectedDam.latitude || 20.5937, selectedDam.longitude || 78.9629]
    : [20.5937, 78.9629];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* HEADER NAVBAR */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-400 via-sky-400 to-blue-300 bg-clip-text text-transparent">
              🛡️ Dam & Reservoir Operations Monitoring Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Active Storage Volumetrics, Inflow Rates, Release Outflows & Downstream Alert Interlock
            </p>
          </div>
        </header>

        {/* CONTAINER MAIN VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

          {/* NO RESERVOIR DATA */}
          {dams.length === 0 && (
            <div className="text-center py-20 bg-slate-800/40 rounded-3xl border border-slate-700/50 p-8">
              <span className="text-6xl">🌊</span>
              <h3 className="text-xl font-bold text-slate-300 mt-4">No Registered Reservoirs Found</h3>
              <p className="text-slate-400 max-w-md mx-auto mt-2 text-sm">
                Add dams and reservoirs in the database to enable live satellite level tracking and mapping overlays.
              </p>
            </div>
          )}

          {dams.length > 0 && selectedDam && (
            <div className="space-y-6">
              
              {/* INTERACTIVE GEOGRAPHIC GIS MAP */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Geographic telemetry</span>
                  <h3 className="text-lg font-bold text-slate-100 mt-1">National Reservoirs Status Map</h3>
                </div>

                <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-slate-700">
                  <MapContainer center={mapCenter} zoom={7} style={{ height: "100%", width: "100%" }}>
                    <ChangeView center={mapCenter} zoom={7} />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />

                    {dams.map((dam) => (
                      <Marker
                        key={dam.id}
                        position={[dam.latitude || 0, dam.longitude || 0]}
                        icon={getMarkerIcon(dam.overflow_status)}
                        eventHandlers={{
                          click: () => {
                            setSelectedDam(dam);
                            loadHistory(dam.id);
                          },
                        }}
                      >
                        <Popup>
                          <div className="text-slate-800 font-bold text-xs space-y-1">
                            <h4 className="font-extrabold capitalize">{dam.name} Reservoir</h4>
                            <p>Storage: {dam.storage_percentage}%</p>
                            <p>Status: {dam.overflow_status}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              {/* CORE METRICS AND STORAGE RING */}
              <div className="grid lg:grid-cols-3 gap-6">
                
                {/* Dam Select Panel & Circular Gauge */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Operations summary</span>
                    
                    {/* Dam Selector Dropdown */}
                    <div className="mt-2">
                      <select
                        value={selectedDam.id}
                        onChange={(e) => {
                          const damId = Number(e.target.value);
                          const damObj = dams.find((d) => d.id === damId);
                          if (damObj) {
                            setSelectedDam(damObj);
                            loadHistory(damObj.id);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 capitalize"
                      >
                        {dams.map((dam) => (
                          <option key={dam.id} value={dam.id}>
                            🌊 {dam.name} Reservoir ({dam.district}, {dam.state})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Circular Storage Progress Bar */}
                  <div className="flex items-center justify-center py-6">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="68"
                          className="stroke-current text-slate-700/40"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="68"
                          className="stroke-current transition-all duration-1000"
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray={427}
                          strokeDashoffset={427 - (427 * selectedDam.storage_percentage) / 100}
                          style={{
                            stroke:
                              selectedDam.overflow_status === "Breached" || selectedDam.overflow_status === "Critical"
                                ? "#ef4444"
                                : selectedDam.overflow_status === "Warning"
                                ? "#f59e0b"
                                : "#10b981",
                          }}
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-3xl font-black text-white font-mono">
                          {selectedDam.storage_percentage}%
                        </span>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">
                          Storage Used
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStatusBadgeStyles(selectedDam.overflow_status)}`}>
                      ⚠️ Overflow Alert: {selectedDam.overflow_status}
                    </span>
                  </div>
                </div>

                {/* Operations Volumetrics Grid */}
                <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 grid grid-cols-2 gap-4">
                  {[
                    { label: "Water Level", val: `${selectedDam.current_level} MCM`, icon: "📏", desc: "Current stored volume" },
                    { label: "Max Capacity", val: `${selectedDam.capacity} MCM`, icon: "🎛️", desc: "Design structural boundary limit" },
                    { label: "Inflow Ingress", val: `${selectedDam.inflow} MCM/h`, icon: "📥", desc: "Simulated satellite runoff speed" },
                    { label: "Release Outflow", val: `${selectedDam.outflow} MCM/h`, icon: "📤", desc: "Controlled spillway discharge rate" },
                  ].map((card) => (
                    <div key={card.label} className="bg-slate-900/60 border border-slate-700/30 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400 font-semibold">{card.label}</span>
                        <span className="text-2xl">{card.icon}</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-white mt-2">{card.val}</div>
                      <div className="text-[10px] text-slate-500 italic mt-1">{card.desc}</div>
                    </div>
                  ))}
                </div>

              </div>

              {/* HISTORICAL TRENDS & FLOW RATES */}
              {history.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-6">
                  
                  {/* Storage Volumetrics Area Chart */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Volumetric history</span>
                      <h3 className="text-lg font-bold text-slate-100 mt-1">Water Storage Trend (Last 15 Cycles)</h3>
                    </div>

                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155/30" />
                          <XAxis
                            dataKey="recorded_at"
                            tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            stroke="#94a3b8"
                            fontSize={10}
                          />
                          <YAxis stroke="#94a3b8" fontSize={10} />
                          <Tooltip
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                            contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569" }}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="water_level" name="Water Level (MCM)" stroke="#2dd4bf" strokeWidth={2.5} fillOpacity={1} fill="url(#volGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Inflow vs Outflow line chart */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Inflow vs Discharge</span>
                      <h3 className="text-lg font-bold text-slate-100 mt-1">Hydrological Flow Balances</h3>
                    </div>

                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155/30" />
                          <XAxis
                            dataKey="recorded_at"
                            tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            stroke="#94a3b8"
                            fontSize={10}
                          />
                          <YAxis stroke="#94a3b8" fontSize={10} />
                          <Tooltip
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                            contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569" }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="inflow" name="Inflow (MCM/h)" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="outflow" name="Outflow (MCM/h)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
