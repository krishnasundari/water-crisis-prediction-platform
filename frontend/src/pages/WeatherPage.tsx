import { useState } from "react";
import Sidebar from "../components/Sidebar";
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

export default function WeatherPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");
  };

  const loadHistory = (cityName: string) => {
    fetch(`${getBaseURL()}/weather/history?query=${encodeURIComponent(cityName)}`)
      .then((res) => res.json())
      .then((historyData) => setHistory(historyData))
      .catch((err) => console.error("Error loading weather history:", err));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(`${getBaseURL()}/weather/live?query=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Location not found in weather geocoder.");
      }
      const result = await res.json();
      setData(result);
      loadHistory(result.location.name);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Weather satellite lookup failed. Try Kochi, Dehradun, or Patna.");
    } finally {
      setLoading(false);
    }
  };

  // WebSocket Auto Refresh Listener
  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("Weather background sync complete. Refreshing weather metrics.");
      if (data?.location?.name) {
        fetch(`${getBaseURL()}/weather/live?query=${encodeURIComponent(data.location.name)}`)
          .then((res) => res.json())
          .then((result) => {
            setData(result);
            loadHistory(result.location.name);
          })
          .catch((err) => console.error(err));
      }
    }
  });

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* PAGE HEADER NAVBAR */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                🌧️ Live Weather Monitoring Center
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-Time Meteorological Satellites Telemetry & Predictive Historical Logging
              </p>
            </div>

            {/* Location Query Box */}
            <form onSubmit={handleSearch} className="flex w-full sm:w-96 items-center gap-2">
              <input
                type="text"
                placeholder="Search city e.g. Patna, Kochi, Dehradun..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>
        </header>

        {/* CONTAINER MAIN VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

          {/* Inactive State */}
          {!data && !error && !loading && (
            <div className="text-center py-20 bg-slate-800/40 rounded-3xl border border-slate-700/50 p-8">
              <span className="text-6xl">📡</span>
              <h3 className="text-xl font-bold text-slate-300 mt-4">Weather Telemetry Stream Offline</h3>
              <p className="text-slate-400 max-w-md mx-auto mt-2 text-sm">
                Enter any national city in the search bar above to fetch live temperature, barometric pressure, cloud density, and historical data logs.
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
                    🔍 Monitor {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
              <p className="text-slate-400 text-sm">Pinging Open-Meteo satellites & drawing trend loops...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-6 rounded-2xl">
              <h4 className="font-bold flex items-center gap-2">⚠️ Telemetry Connection Failure</h4>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* ACTIVE CONTENT */}
          {data && (
            <div className="space-y-6">
              
              {/* CURRENT SNAPSHOT SUMMARY */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-sky-400 font-bold font-mono">Current Weather Snapshot</span>
                  <h3 className="text-3xl font-black text-slate-100 mt-1">
                    {data.location.name}, {data.location.state}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {data.location.country} • Lat: {data.location.latitude} | Lon: {data.location.longitude}
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/30 rounded-2xl p-4 flex items-center gap-4">
                  <span className="text-4xl">🌤️</span>
                  <div>
                    <div className="text-2xl font-black font-mono text-white">{data.current.temperature}°C</div>
                    <div className="text-xs text-sky-400 font-bold uppercase tracking-wider">{data.current.condition}</div>
                  </div>
                </div>
              </div>

              {/* LIVE WEATHER METRICS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                {[
                  { label: "Humidity", val: `${data.current.humidity}%`, icon: "💧" },
                  { label: "Pressure", val: `${data.current.pressure} hPa`, icon: "🎛️" },
                  { label: "Rain Rate", val: `${data.current.rainfall} mm/h`, icon: "🌧️" },
                  { label: "Wind Speed", val: `${data.current.wind_speed} km/h`, icon: "💨" },
                  { label: "Cloud Cover", val: `${data.current.cloud_cover}%`, icon: "☁️" },
                  { label: "Visibility", val: `${data.current.visibility} km`, icon: "👁️" },
                  { label: "Status Indicator", val: "Online", icon: "🟢" },
                ].map((card) => (
                  <div key={card.label} className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-4 text-center space-y-1">
                    <div className="text-2xl">{card.icon}</div>
                    <div className="text-xs text-slate-400 font-semibold">{card.label}</div>
                    <div className="text-sm font-black font-mono text-white">{card.val}</div>
                  </div>
                ))}
              </div>

              {/* FORECAST CHARTS AND DAILY FORECASTS */}
              <div className="grid lg:grid-cols-3 gap-6">
                
                {/* 24h Hourly Forecast Area Chart */}
                <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-sky-400 font-bold font-mono">Forecast telemetry</span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">24-Hour Projected Temperature & Rain Trends</h3>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.hourly}>
                        <defs>
                          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155/30" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569" }} />
                        <Legend />
                        <Area type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#tempGrad)" />
                        <Area type="monotone" dataKey="rain" name="Rain (mm)" stroke="#60a5fa" strokeWidth={2} fillOpacity={1} fill="url(#rainGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 7-DAY FORECAST GRID */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-sky-400 font-bold font-mono">Daily Forecasts</span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">7-Day Meteorological Outlook</h3>
                  </div>

                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                    {data.daily.map((day: any) => (
                      <div key={day.date} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-700/30 text-xs">
                        <div className="font-bold text-slate-300 w-12">{day.day}</div>
                        <div className="text-slate-400 w-24 truncate">{day.condition}</div>
                        <div className="font-mono font-bold text-white w-20 text-right">
                          <span className="text-sky-300">{Math.round(day.temp_max)}°</span> / <span className="text-slate-500">{Math.round(day.temp_min)}°</span>
                        </div>
                        <div className="font-mono text-blue-400 w-12 text-right">{day.rain > 0 ? `${day.rain}mm` : "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* HISTORICAL TREND GRAPHS */}
              {history.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-sky-400 font-bold font-mono">Historical logs</span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">Satellite Telemetry Fluctuations (Last 15 Cycles)</h3>
                    <p className="text-xs text-slate-400">Plotted from automatic database background loggers</p>
                  </div>

                  <div className="h-[260px] w-full font-mono text-xs">
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
                        <Line type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="rainfall" name="Rain Rate (mm)" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#34d399" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
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
