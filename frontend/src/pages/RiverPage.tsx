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

// Leaflet markers color generator based on danger level ratios
const getMarkerIcon = (level: number, danger: number) => {
  let color = "blue";
  if (level >= danger) {
    color = "red";
  } else if (level >= 0.8 * danger) {
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

export default function RiverPage() {
  const [rivers, setRivers] = useState<any[]>([]);
  const [selectedRiver, setSelectedRiver] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : "https://water-crisis-prediction-platform-1.onrender.com/api/v1";
  };

  const loadRivers = async () => {
    try {
      const res = await fetch(`${getBaseURL()}/rivers/`);
      const data = await res.json();
      
      // Fetch live status for all rivers to resolve alert markers
      const detailedRivers = await Promise.all(
        data.map(async (river: any) => {
          const detailRes = await fetch(`${getBaseURL()}/rivers/${river.id}/live-status`);
          return detailRes.json();
        })
      );
      
      setRivers(detailedRivers);
      
      // Default select the first river if none selected
      if (detailedRivers.length > 0 && !selectedRiver) {
        setSelectedRiver(detailedRivers[0]);
        loadHistory(detailedRivers[0].id);
      } else if (selectedRiver) {
        // Keep selected river updated with live values
        const updatedSelected = detailedRivers.find((r) => r.id === selectedRiver.id);
        if (updatedSelected) {
          setSelectedRiver(updatedSelected);
        }
      }
    } catch (err) {
      console.error("Error loading rivers:", err);
    }
  };

  const loadHistory = async (id: number) => {
    try {
      const res = await fetch(`${getBaseURL()}/rivers/${id}/history`);
      const historyData = await res.json();
      setHistory(historyData);
    } catch (err) {
      console.error("Error loading river history:", err);
    }
  };

  useEffect(() => {
    loadRivers();
  }, []);

  // WebSocket Live Sync Listener
  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("WebSocket: Telemetry sync completed. Refreshing river monitoring portal.");
      loadRivers();
      if (selectedRiver) {
        loadHistory(selectedRiver.id);
      }
    }
  });

  const getStatusBadgeStyles = (level: number, danger: number) => {
    if (level >= danger) {
      return "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-extrabold";
    } else if (level >= 0.8 * danger) {
      return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold";
    } else {
      return "bg-green-500/20 text-green-400 border border-green-500/30";
    }
  };

  const mapCenter: [number, number] = selectedRiver
    ? [selectedRiver.latitude || 20.5937, selectedRiver.longitude || 78.9629]
    : [20.5937, 78.9629];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* HEADER NAVBAR */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-sky-400 to-teal-300 bg-clip-text text-transparent">
              🌊 National River Systems Monitoring Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Active Gauge Depths, Danger Limit Crossings, Discharge Flow Rates & Automated Flood Warnings
            </p>
          </div>
        </header>

        {/* CONTAINER MAIN VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

          {/* NO RIVER DATA */}
          {rivers.length === 0 && (
            <div className="text-center py-20 bg-slate-800/40 rounded-3xl border border-slate-700/50 p-8">
              <span className="text-6xl">🌊</span>
              <h3 className="text-xl font-bold text-slate-300 mt-4">No Registered Rivers Found</h3>
              <p className="text-slate-400 max-w-md mx-auto mt-2 text-sm">
                Seeding database table rivers or adding rivers will populate this monitor map.
              </p>
            </div>
          )}

          {rivers.length > 0 && selectedRiver && (
            <div className="space-y-6">
              
              {/* GEOGRAPHIC GIS MAP */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-blue-400 font-bold font-mono">Geographic telemetry</span>
                  <h3 className="text-lg font-bold text-slate-100 mt-1">Active River Gauge Basins Map</h3>
                </div>

                <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-slate-700">
                  <MapContainer center={mapCenter} zoom={7} style={{ height: "100%", width: "100%" }}>
                    <ChangeView center={mapCenter} zoom={7} />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />

                    {rivers.map((river) => (
                      <Marker
                        key={river.id}
                        position={[river.latitude || 0, river.longitude || 0]}
                        icon={getMarkerIcon(river.river_level, river.danger_level)}
                        eventHandlers={{
                          click: () => {
                            setSelectedRiver(river);
                            loadHistory(river.id);
                          },
                        }}
                      >
                        <Popup>
                          <div className="text-slate-800 font-bold text-xs space-y-1">
                            <h4 className="font-extrabold capitalize">{river.name} River</h4>
                            <p>Level: {river.river_level}m</p>
                            <p>Danger Level: {river.danger_level}m</p>
                            <p>Trend: {river.trend}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>

              {/* CORE METRICS GRID */}
              <div className="grid lg:grid-cols-3 gap-6">
                
                {/* River Select Panel & Level Gauge */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-blue-400 font-bold font-mono">River selector</span>
                    
                    {/* River Selector Dropdown */}
                    <div className="mt-2">
                      <select
                        value={selectedRiver.id}
                        onChange={(e) => {
                          const riverId = Number(e.target.value);
                          const riverObj = rivers.find((r) => r.id === riverId);
                          if (riverObj) {
                            setSelectedRiver(riverObj);
                            loadHistory(riverObj.id);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                      >
                        {rivers.map((river) => (
                          <option key={river.id} value={river.id}>
                            🌊 {river.name} River ({river.latitude.toFixed(2)}N, {river.longitude.toFixed(2)}E)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Visual Level Progress Bar */}
                  <div className="py-6 space-y-3">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Gauge Level depth</span>
                      <span className="font-mono font-bold text-white">{selectedRiver.river_level}m / {selectedRiver.danger_level}m</span>
                    </div>
                    
                    {/* Linear Warning Bar */}
                    <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/60">
                      <div
                        className="h-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, selectedRiver.percentage_of_danger)}%`,
                          backgroundColor:
                            selectedRiver.river_level >= selectedRiver.danger_level
                              ? "#ef4444"
                              : selectedRiver.river_level >= 0.8 * selectedRiver.danger_level
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      />
                    </div>

                    <div className="text-center text-[10px] text-slate-400 italic">
                      River is at {selectedRiver.percentage_of_danger}% of critical danger level mark
                    </div>
                  </div>

                  <div className="text-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStatusBadgeStyles(selectedRiver.river_level, selectedRiver.danger_level)}`}>
                      {selectedRiver.river_level >= selectedRiver.danger_level
                        ? "🚨 DANGER BREACHED"
                        : selectedRiver.river_level >= 0.8 * selectedRiver.danger_level
                        ? "⚠️ WARNING STATE"
                        : "🟢 SAFE LEVEL"}
                    </span>
                  </div>
                </div>

                {/* Operations Volumetrics Grid */}
                <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 grid grid-cols-2 gap-4">
                  {[
                    { label: "River Level", val: `${selectedRiver.river_level} m`, icon: "📏", desc: "Active depth at sensor station" },
                    { label: "Danger Level", val: `${selectedRiver.danger_level} m`, icon: "🚨", desc: "Critical flooding threshold level" },
                    { label: "Discharge Velocity", val: `${selectedRiver.flow_rate} m³/s`, icon: "💨", desc: "Cubic meters of water per second" },
                    {
                      label: "Trend Outlook",
                      val: selectedRiver.trend === "Rising" ? "Rising 📈" : "Falling 📉",
                      icon: "📈",
                      desc: "Gauge projection direction"
                    },
                  ].map((card) => (
                    <div key={card.label} className="bg-slate-900/60 border border-slate-700/30 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400 font-semibold">{card.label}</span>
                        <span className="text-2xl">{card.icon}</span>
                      </div>
                      <div className={`text-2xl font-black font-mono mt-2 ${
                        card.label === "Trend Outlook"
                          ? selectedRiver.trend === "Rising"
                            ? "text-red-400"
                            : "text-green-400"
                          : "text-white"
                      }`}>{card.val}</div>
                      <div className="text-[10px] text-slate-500 italic mt-1">{card.desc}</div>
                    </div>
                  ))}
                </div>

              </div>

              {/* HISTORICAL TRENDS */}
              {history.length > 0 && (
                <div className="grid lg:grid-cols-2 gap-6">
                  
                  {/* Gauge Level Area Chart */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-blue-400 font-bold font-mono">Gauge history</span>
                      <h3 className="text-lg font-bold text-slate-100 mt-1">Water Depth Trend (Last 15 Cycles)</h3>
                    </div>

                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
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
                          <Area type="monotone" dataKey="river_level" name="River Level (m)" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#riverGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Flow rate line chart */}
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-blue-400 font-bold font-mono">Discharge history</span>
                      <h3 className="text-lg font-bold text-slate-100 mt-1">Discharge Velocities (m³/s)</h3>
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
                          <Line type="monotone" dataKey="flow_rate" name="Flow Rate (m³/s)" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 4 }} />
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
