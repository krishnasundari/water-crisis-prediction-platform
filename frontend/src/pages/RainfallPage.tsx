import { useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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

export default function RainfallPage() {
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
    fetch(`${getBaseURL()}/weather/rainfall/history?query=${encodeURIComponent(cityName)}`)
      .then((res) => res.json())
      .then((historyData) => setHistory(historyData))
      .catch((err) => console.error("Error loading rainfall history:", err));
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
      setError(err.message || "Rainfall satellite lookup failed. Try Kochi, Dehradun, or Patna.");
    } finally {
      setLoading(false);
    }
  };

  // WebSocket Auto Refresh Listener
  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("Rainfall sync complete. Refreshing live telemetry charts.");
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
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
                🌧️ Satellite Rainfall Monitoring System
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-Time Precipitation Analysis, Hourly Forecasts & Database Hydrological Logs
              </p>
            </div>

            {/* Location Query Box */}
            <form onSubmit={handleSearch} className="flex w-full sm:w-96 items-center gap-2">
              <input
                type="text"
                placeholder="Search city e.g. Patna, Kochi, Dehradun..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition"
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
              <span className="text-6xl">🌧️</span>
              <h3 className="text-xl font-bold text-slate-300 mt-4">Precipitation Telemetry Offline</h3>
              <p className="text-slate-400 max-w-md mx-auto mt-2 text-sm">
                Enter any national city in the search bar above to fetch live precipitation rates, 24h forecast accumulations, and dam basin historical rainfall totals.
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
                    🌧️ Monitor {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <p className="text-slate-400 text-sm">Pinging Open-Meteo satellites & plotting precipitation graphs...</p>
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
                  <span className="text-xs uppercase tracking-widest text-blue-400 font-bold font-mono">Current Precipitation snapshot</span>
                  <h3 className="text-3xl font-black text-slate-100 mt-1">
                    {data.location.name}, {data.location.state}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {data.location.country} • Lat: {data.location.latitude} | Lon: {data.location.longitude}
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/30 rounded-2xl p-4 flex items-center gap-4">
                  <span className="text-4xl">☔</span>
                  <div>
                    <div className="text-2xl font-black font-mono text-white">{data.current.rainfall} mm/h</div>
                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">{data.current.condition}</div>
                  </div>
                </div>
              </div>

              {/* OUTLOOK GRAPH CARDS */}
              <div className="grid lg:grid-cols-2 gap-6">
                
                {/* 24h Hourly Forecast Area Chart */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-blue-400 font-bold font-mono">Hourly Forecast</span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">24-Hour Projected Rainfall Trend</h3>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.hourly}>
                        <defs>
                          <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155/30" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} label={{ value: 'Rain (mm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569" }} />
                        <Legend />
                        <Area type="monotone" dataKey="rain" name="Rain rate (mm/h)" stroke="#60a5fa" strokeWidth={2.5} fillOpacity={1} fill="url(#rainGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 7-DAY FORECAST BAR CHART */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-blue-400 font-bold font-mono">Daily outlook</span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">7-Day Cumulative Precipitation Projections</h3>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155/30" />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} label={{ value: 'Daily Sum (mm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569" }} />
                        <Legend />
                        <Bar dataKey="rain" name="Daily Rain (mm)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* HISTORICAL TREND GRAPHS */}
              {history.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-blue-400 font-bold font-mono">Historical logging</span>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">Dam Basin Historical Rainfall Logs (Last 15 Cycles)</h3>
                    <p className="text-xs text-slate-400">Plotted from automatic database background loggers</p>
                  </div>

                  <div className="h-[260px] w-full font-mono text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155/30" />
                        <XAxis
                          dataKey="measurement_date"
                          tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          stroke="#94a3b8"
                          fontSize={10}
                        />
                        <YAxis stroke="#94a3b8" fontSize={10} label={{ value: 'Rainfall Amount (mm)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                        <Tooltip
                          labelFormatter={(label) => new Date(label).toLocaleString()}
                          contentStyle={{ backgroundColor: "#1e293b", borderColor: "#475569" }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="rainfall_amount" name="Rainfall Logged (mm)" stroke="#60a5fa" strokeWidth={3.5} dot={{ r: 5 }} />
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
