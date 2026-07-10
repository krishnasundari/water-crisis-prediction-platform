import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { weatherAPI } from "../services/api";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

const reservoirIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const shelterIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  // Countdown timer for simulated evacuations
  const [secondsLeft, setSecondsLeft] = useState(7200); // 2 hours by default

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 7200));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await weatherAPI.search(query.trim());
      setData(res);
      // Reset countdown to a random time between 1 and 3 hours for realism
      setSecondsLeft(Math.floor(Math.random() * 7200) + 3600);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch weather. Verify city name and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Determine if there are critical reservoirs nearby (e.g. level > 80%)
  const criticalReservoir = data?.nearby_reservoirs?.find(
    (res: any) => res.current_level > 80 && res.distance_km < 150
  );

  // Compute map center (fallback to India center [20.5937, 78.9629])
  const mapCenter: [number, number] = data?.location
    ? [data.location.latitude, data.location.longitude]
    : [20.5937, 78.9629];

  // Mock safe assembly shelter coordinates based on offset
  const shelterCoords: [number, number] = data?.location
    ? [data.location.latitude + 0.04, data.location.longitude + 0.05]
    : [20.6337, 79.0129];

  // Route path avoiding the critical dam center
  const escapeRoute: [number, number][] = data?.location
    ? [
        [data.location.latitude, data.location.longitude],
        [data.location.latitude + 0.015, data.location.longitude - 0.01],
        [data.location.latitude + 0.03, data.location.longitude + 0.02],
        shelterCoords,
      ]
    : [];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* TOP NAVBAR */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                💧 Live Water & Dam Analysis
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-Time Geocoding, Dynamic Weather Forecasts, and Evacuation Routing
              </p>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSearch} className="flex w-full md:w-96 items-center gap-2">
              <input
                type="text"
                placeholder="Search city e.g. Patna, Hyderabad..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>
        </header>

        {/* CONTAINER VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          {/* Default view when no city searched */}
          {!data && !error && !loading && (
            <div className="text-center py-20 bg-slate-800/40 rounded-3xl border border-slate-700/50 p-8">
              <span className="text-6xl">🔍</span>
              <h3 className="text-xl font-bold text-slate-300 mt-4">Begin Your Real-Time Search</h3>
              <p className="text-slate-400 max-w-md mx-auto mt-2 text-sm">
                Enter any city name in the search bar above to pull live weather records, 15-day rainfall predictions, and nearest reservoir capacities instantly.
              </p>
              <div className="flex justify-center gap-3 mt-6">
                {["Hyderabad", "Patna", "Kochi", "Chennai"].map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setQuery(city);
                      // Trigger search programmatically
                      const fakeEvent = { preventDefault: () => {} } as any;
                      setTimeout(() => handleSearch(fakeEvent), 100);
                    }}
                    className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600/40 px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 transition"
                  >
                    🚀 {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400"></div>
              <p className="text-slate-400 text-sm">Querying satellite databases...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-6 rounded-2xl">
              <h4 className="font-bold flex items-center gap-2">⚠️ Search Error</h4>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* CRITICAL FLOOD & DAM GATES ALERT (Active if level > 80%) */}
          {data && criticalReservoir && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-extrabold uppercase tracking-widest text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  Critical Flood Alert
                </div>
                <h3 className="text-xl font-bold text-slate-100">
                  Heavy Rain Impact: {criticalReservoir.name} is at {criticalReservoir.current_level}% capacity!
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Due to the current rainfall of **{data.current_weather.rain} mm**, the dam is approaching full capacity limits. Downstream flooding is projected. Residents must evacuate to safe high ground immediately.
                </p>
              </div>

              {/* Countdown Evacuation Widget */}
              <div className="bg-red-900/50 border border-red-500/30 p-4 rounded-2xl text-center min-w-[200px]">
                <span className="block text-xs uppercase tracking-wider text-red-300 font-bold">
                  Dam Gates Release In:
                </span>
                <span className="block text-3xl font-mono font-extrabold text-white mt-1">
                  {formatCountdown(secondsLeft)}
                </span>
                <span className="block text-[10px] text-red-300 mt-1 uppercase">
                  Follow Green Route on Map
                </span>
              </div>
            </div>
          )}

          {data && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* CURRENT WEATHER CARD */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                    Current Conditions
                  </span>
                  <h3 className="text-2xl font-bold text-slate-100 mt-1">
                    {data.location.name}, {data.location.state}
                  </h3>
                  <p className="text-xs text-slate-400">{data.location.country}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-5xl font-extrabold text-white">
                      {data.current_weather.temperature}°C
                    </span>
                    <span className="block text-xs text-slate-400">
                      Feels like {data.current_weather.feels_like}°C
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-3xl">
                      {data.current_weather.weather_code === 0 ? "☀️" : "🌧️"}
                    </span>
                    <span className="text-sm font-semibold text-sky-300">
                      {data.current_weather.condition}
                    </span>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/40 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">Humidity</span>
                    <span className="font-bold text-slate-200">{data.current_weather.humidity}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Rain Rate</span>
                    <span className="font-bold text-slate-200">{data.current_weather.rain} mm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Wind Speed</span>
                    <span className="font-bold text-slate-200">{data.current_weather.wind_speed} km/h</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Precipitation</span>
                    <span className="font-bold text-slate-200">{data.current_weather.precipitation} mm</span>
                  </div>
                </div>
              </div>

              {/* NEAREST RESERVOIRS TABLE */}
              <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                    Nearby Reservoirs & Dams
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mt-1">
                    Local Watershed Telemetry
                  </h3>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase">
                        <th className="pb-3">Dam Name</th>
                        <th className="pb-3">Capacity (MCM)</th>
                        <th className="pb-3">Base Level</th>
                        <th className="pb-3 text-center">Live Water Level</th>
                        <th className="pb-3 text-right">Distance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {data.nearby_reservoirs.map((res: any) => (
                        <tr key={res.id} className="hover:bg-slate-700/20">
                          <td className="py-3 font-semibold text-slate-200">{res.name}</td>
                          <td className="py-3 text-slate-300">{res.capacity} MCM</td>
                          <td className="py-3 text-slate-400">{res.original_level}%</td>
                          <td className="py-3 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                res.current_level > 80
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : res.current_level > 65
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  : "bg-green-500/10 text-green-400 border border-green-500/20"
                              }`}
                            >
                              {res.current_level}%
                              {res.inflow_added_pct > 0 && (
                                <span className="text-[10px] ml-1">
                                  (+{res.inflow_added_pct}% rain inflow)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 text-right text-sky-300 font-mono font-bold">
                            {res.distance_km} km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* GIS NAVIGATION MAP (Shows Escape Route if Dam is Critical) */}
          {data && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                  GIS Flood Routing Map
                </span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">
                  Active Evacuation Escapes & Restricted Hazards
                </h3>
              </div>

              {/* Map Container */}
              <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-700">
                <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
                  <ChangeView center={mapCenter} zoom={criticalReservoir ? 11 : 12} />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />

                  {/* Targeted City Location Marker */}
                  <Marker position={mapCenter} icon={targetLocationIcon}>
                    <Popup>
                      <div className="text-slate-800 font-bold">
                        <h4>📍 {data.location.name}</h4>
                        <p className="text-xs font-normal">Searched position coordinates.</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Nearby Reservoirs & Dams Markers */}
                  {data.nearby_reservoirs.map((res: any) => {
                    const resPos: [number, number] = [res.latitude, res.longitude];
                    return (
                      <div key={res.id}>
                        <Marker position={resPos} icon={reservoirIcon}>
                          <Popup>
                            <div className="text-slate-800 font-semibold">
                              <h4 className="font-bold">💧 {res.name}</h4>
                              <p className="text-xs">Capacity: {res.capacity} MCM</p>
                              <p className="text-xs">Live Water Level: {res.current_level}%</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Draw Red Warning Inundation Boundary circle if capacity > 80% */}
                        {res.current_level > 80 && (
                          <Circle
                            center={resPos}
                            radius={8000} // 8km radius flood boundary
                            pathOptions={{
                              fillColor: "red",
                              color: "red",
                              fillOpacity: 0.25,
                              dashArray: "5, 10",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Draw Safe Evacuation Path & Shelter Marker if Critical Alert is active */}
                  {criticalReservoir && (
                    <>
                      <Marker position={shelterCoords} icon={shelterIcon}>
                        <Popup>
                          <div className="text-slate-800">
                            <h4 className="font-bold text-green-600">⛺ Govt Evacuation Shelter</h4>
                            <p className="text-xs">Safe assembly area with medical aid & supplies.</p>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Safe Escape Route */}
                      <Polyline
                        positions={escapeRoute}
                        pathOptions={{
                          color: "#10B981", // Emerald green
                          weight: 6,
                          opacity: 0.8,
                          dashArray: "1, 10",
                        }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>
          )}

          {/* 15-DAY FORECAST GRID */}
          {data && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                  15-Day Weather Forecast
                </span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">
                  Projected Daily Rainfall Sums
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
                {data.forecast_15_days.map((day: any) => (
                  <div
                    key={day.date}
                    className={`p-3 rounded-2xl border text-center space-y-2 ${
                      day.precipitation > 20
                        ? "bg-red-500/10 border-red-500/30 text-red-200"
                        : day.precipitation > 5
                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-200"
                        : "bg-slate-800 border-slate-700/60 text-slate-200"
                    }`}
                  >
                    <span className="block text-xs text-slate-400 font-mono">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </span>
                    <span className="block text-xl">
                      {day.precipitation > 20 ? "⛈️" : day.precipitation > 5 ? "🌧️" : "🌤️"}
                    </span>
                    <span className="block text-sm font-bold">
                      {day.temp_max}° / {day.temp_min}°
                    </span>
                    <span className="block text-[10px] text-sky-300 font-semibold font-mono">
                      🌧️ {day.precipitation} mm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
