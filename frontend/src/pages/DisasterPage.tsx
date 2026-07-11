import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useWebSocket from "../hooks/useWebSocket";

// Helper component to center map on search results
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Custom Map Icons
const targetLocationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function DisasterPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");
  };

  const loadAlerts = () => {
    fetch(`${getBaseURL()}/alerts/`)
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch((err) => console.error("Error fetching alerts:", err));
  };

  // Fetch active alerts on mount
  useEffect(() => {
    loadAlerts();
  }, []);

  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("Telemetry sync complete. Refreshing disaster monitoring components.");
      loadAlerts();
      if (data?.location?.name) {
        fetch(`${getBaseURL()}/predictions/disaster/live?query=${encodeURIComponent(data.location.name)}`)
          .then((res) => res.json())
          .then((result) => setData(result))
          .catch((err) => console.error(err));
      }
    }
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(`${getBaseURL()}/predictions/disaster/live?query=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Location not found.");
      }
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to query weather satellites. Try Patna, Kochi, or Dehradun.");
    } finally {
      setLoading(false);
    }
  };

  const mapCenter: [number, number] = data?.location
    ? [data.location.latitude, data.location.longitude]
    : [20.5937, 78.9629];

  // Helper to choose hazard color theme
  const getHazardStyles = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
      case "critical":
        return {
          bg: "bg-red-500/10 border-red-500/30",
          text: "text-red-400",
          fill: "#ef4444",
          badge: "bg-red-500/20 text-red-400 border border-red-500/30",
        };
      case "moderate":
        return {
          bg: "bg-yellow-500/10 border-yellow-500/30",
          text: "text-yellow-400",
          fill: "#f59e0b",
          badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        };
      default:
        return {
          bg: "bg-green-500/10 border-green-500/30",
          text: "text-green-400",
          fill: "#10b981",
          badge: "bg-green-500/20 text-green-400 border border-green-500/30",
        };
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* HEADER NAVBAR */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                🛡️ National Disaster Monitoring Platform
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-Time AI Multi-Hazard Risk Assessments (Floods, Wildfires, Landslides, Droughts)
              </p>
            </div>

            {/* Location Query Box */}
            <form onSubmit={handleSearch} className="flex w-full sm:w-96 items-center gap-2">
              <input
                type="text"
                placeholder="Search city e.g. Patna, Kochi, Dehradun..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </form>
          </div>
        </header>

        {/* CONTAINER VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          
          {/* Default Inactive State */}
          {!data && !error && !loading && (
            <div className="text-center py-20 bg-slate-800/40 rounded-3xl border border-slate-700/50 p-8">
              <span className="text-6xl">📡</span>
              <h3 className="text-xl font-bold text-slate-300 mt-4">AI Disaster Engine Ready</h3>
              <p className="text-slate-400 max-w-md mx-auto mt-2 text-sm">
                Enter any location in the search bar above to trigger the satellite telemetry lookup and evaluate multi-hazard susceptibility instantly.
              </p>
              <div className="flex justify-center gap-3 mt-6">
                {["Kochi", "Dehradun", "Patna"].map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setQuery(city);
                      const fakeEvent = { preventDefault: () => {} } as any;
                      setTimeout(() => handleSearch(fakeEvent), 100);
                    }}
                    className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600/40 px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 transition"
                  >
                    🔥 Analyze {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
              <p className="text-slate-400 text-sm">Querying global satellite networks & running AI inference...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-6 rounded-2xl">
              <h4 className="font-bold flex items-center gap-2">⚠️ Lookup Failure</h4>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* ACTIVE ANALYZED VIEW */}
          {data && (
            <div className="space-y-6">
              
              {/* LOCATION SUMMARY BANNER */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-red-400 font-bold">Analyzed Incident Coordinates</span>
                  <h3 className="text-2xl font-bold text-slate-100 mt-1">
                    {data.location.name}, {data.location.state}
                  </h3>
                  <p className="text-xs text-slate-400">{data.location.country} • Lat: {data.location.latitude} | Lon: {data.location.longitude}</p>
                </div>

                {/* Weather details */}
                <div className="flex flex-wrap gap-4 text-xs font-mono bg-slate-900/60 p-4 rounded-2xl border border-slate-700/30">
                  <div>🌡️ Temp: <span className="text-white font-bold">{data.weather.temperature}°C</span></div>
                  <div>💧 Humidity: <span className="text-white font-bold">{data.weather.humidity}%</span></div>
                  <div>💨 Wind: <span className="text-white font-bold">{data.weather.wind_speed} km/h</span></div>
                  <div>🌧️ Rain Rate: <span className="text-sky-400 font-bold">{data.weather.rain} mm/h</span></div>
                </div>
              </div>

              {/* HAZARD RISK CARDS ROW */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(data.hazards).map(([name, hazard]: any) => {
                  const styles = getHazardStyles(hazard.level);
                  
                  return (
                    <div
                      key={name}
                      className={`border rounded-3xl p-6 flex flex-col justify-between space-y-4 ${styles.bg}`}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono">
                            {name} Risk
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${styles.badge}`}>
                            {hazard.level}
                          </span>
                        </div>

                        {/* Circular Progress Gauge */}
                        <div className="flex items-center justify-center py-6">
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="56"
                                cy="56"
                                r="48"
                                className="stroke-current text-slate-700/40"
                                strokeWidth="8"
                                fill="transparent"
                              />
                              <circle
                                cx="56"
                                cy="56"
                                r="48"
                                className="stroke-current transition-all duration-1000"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={301.6}
                                strokeDashoffset={301.6 - (301.6 * hazard.score) / 100}
                                style={{ stroke: styles.fill }}
                              />
                            </svg>
                            <span className="absolute text-2xl font-black text-white font-mono">
                              {Math.round(hazard.score)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed text-center">
                        {hazard.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* GIS HEATMAP OVERLAY AND MITIGATION GUIDES */}
              <div className="grid lg:grid-cols-3 gap-6">
                
                {/* GIS Maps Container */}
                <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-red-400 font-bold">GIS Hazard Map</span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">Active Incident Map Overlays</h3>
                  </div>

                  <div className="h-[350px] w-full rounded-2xl overflow-hidden border border-slate-700">
                    <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }}>
                      <ChangeView center={mapCenter} zoom={11} />
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />

                      <Marker position={mapCenter} icon={targetLocationIcon}>
                        <Popup>
                          <div className="text-slate-800 font-bold">
                            <h4>📍 Incident Coordinates</h4>
                            <p className="text-xs font-normal">Latitude: {data.location.latitude}</p>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Map circles overlays based on active risks */}
                      {Object.entries(data.hazards).map(([name, hazard]: any) => {
                        if (hazard.level.toLowerCase() === "safe") return null;

                        const colors = {
                          flood: "red",
                          wildfire: "orange",
                          landslide: "yellow",
                          drought: "brown",
                        };
                        const fillColor = (colors as any)[name] || "blue";

                        return (
                          <Circle
                            key={name}
                            center={mapCenter}
                            radius={name === "drought" ? 15000 : 7000}
                            pathOptions={{
                              color: fillColor,
                              fillColor: fillColor,
                              fillOpacity: 0.2,
                              weight: 2,
                              dashArray: "5, 10",
                            }}
                          />
                        );
                      })}
                    </MapContainer>
                  </div>
                </div>

                {/* MITIGATION PROCEDURES */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-red-400 font-bold">Mitigation Console</span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">Recommended Actions</h3>
                  </div>

                  <div className="space-y-4 flex-1 mt-4 overflow-y-auto pr-1">
                    {Object.entries(data.hazards).map(([name, hazard]: any) => {
                      if (hazard.level.toLowerCase() === "safe") return null;
                      
                      let guideText = "";
                      if (name === "flood") {
                        guideText = "Reroute water flows into drainage basins, trigger floodgate releases, check lowlands elevation points.";
                      } else if (name === "wildfire") {
                        guideText = "Issue wind-hazard safety codes, dispatch moisture containment breaks, restrict forest area entry.";
                      } else if (name === "landslide") {
                        guideText = "Stabilize mountain roads, activate soil telemetry alarms, redirect traffic away from steep slopes.";
                      } else {
                        guideText = "Ration agricultural reservoirs, activate regional groundwater recovery models, declare water alert.";
                      }

                      return (
                        <div key={name} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/30 space-y-1">
                          <span className="text-xs uppercase font-extrabold font-mono text-red-400 tracking-wider">
                            🚨 {name} Mitigation
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {guideText}
                          </p>
                        </div>
                      );
                    })}

                    {Object.values(data.hazards).every((h: any) => h.level.toLowerCase() === "safe") && (
                      <div className="text-center py-10 text-slate-500 italic text-sm">
                        🟢 All hazards safe. Normal monitoring.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ACTIVE ALERTS TABLE LIST */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-red-400 font-bold">Alert Feed</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">Recent Multi-Hazard System Notifications</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase font-mono">
                    <th className="pb-3">Alert Type</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">Message</th>
                    <th className="pb-3 text-right">Acknowledge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {alerts.slice(0, 5).map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-700/10">
                      <td className="py-4 font-bold text-slate-200 capitalize">
                        {alert.alert_type} Alert
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            alert.severity === "critical" || alert.severity === "high"
                              ? "bg-red-500/15 text-red-400 border border-red-500/20"
                              : alert.severity === "medium"
                              ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                              : "bg-green-500/15 text-green-400 border border-green-500/20"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-4 text-slate-300">{alert.message}</td>
                      <td className="py-4 text-right">
                        <span className="text-slate-500 text-xs font-semibold">Logged</span>
                      </td>
                    </tr>
                  ))}
                  {alerts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 italic">
                        No active disaster alerts generated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
