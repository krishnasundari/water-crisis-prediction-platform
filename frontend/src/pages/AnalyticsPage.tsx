import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

export default function AnalyticsPage() {
  const [riskData, setRiskData] = useState({ safe: 0, moderate: 0, high: 0 });
  const [reservoirs, setReservoirs] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [alerts, setAlerts] = useState({ total: 0, unread: 0, low: 0, medium: 0, high: 0, critical: 0 });

  // History Tab States
  const [activeCategory, setActiveCategory] = useState("weather"); // weather, rainfall, dams, rivers, predictions, alerts
  const [activeTimeframe, setActiveTimeframe] = useState("daily"); // daily, weekly, monthly, yearly
  const [historySeries, setHistorySeries] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : "https://water-crisis-prediction-platform-1.onrender.com/api/v1";
  };

  const loadSummaryStats = () => {
    fetch(`${getBaseURL()}/analytics/risk-distribution`)
      .then((res) => res.json())
      .then(setRiskData)
      .catch(console.error);

    fetch(`${getBaseURL()}/analytics/reservoir-utilization`)
      .then((res) => res.json())
      .then(setReservoirs)
      .catch(console.error);

    fetch(`${getBaseURL()}/analytics/district-summary`)
      .then((res) => res.json())
      .then(setDistricts)
      .catch(console.error);

    fetch(`${getBaseURL()}/analytics/alerts-summary`)
      .then((res) => res.json())
      .then(setAlerts)
      .catch(console.error);
  };

  const loadHistorySeries = () => {
    setLoadingHistory(true);
    fetch(`${getBaseURL()}/analytics/history-series?category=${activeCategory}&timeframe=${activeTimeframe}`)
      .then((res) => res.json())
      .then((data) => {
        setHistorySeries(data);
        setLoadingHistory(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingHistory(false);
      });
  };

  useEffect(() => {
    loadSummaryStats();
  }, []);

  useEffect(() => {
    loadHistorySeries();
  }, [activeCategory, activeTimeframe]);

  const COLORS = ["#10b981", "#f59e0b", "#ef4444"];
  
  const pieData = [
    { name: "Safe", value: riskData.safe },
    { name: "Moderate", value: riskData.moderate },
    { name: "High", value: riskData.high },
  ];

  // Helper to render the active chart dynamically based on selected category
  const renderHistoryChart = () => {
    if (loadingHistory) {
      return (
        <div className="flex h-[320px] items-center justify-center text-slate-400 text-xs font-mono">
          Loading history telemetry series...
        </div>
      );
    }

    if (historySeries.length === 0) {
      return (
        <div className="flex h-[320px] items-center justify-center text-slate-400 text-xs">
          No historical records found for this scope.
        </div>
      );
    }

    switch (activeCategory) {
      case "weather":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={historySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "white" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="temperature" stroke="#38bdf8" strokeWidth={2.5} name="Temp (°C)" />
              <Line type="monotone" dataKey="humidity" stroke="#a78bfa" strokeWidth={2.5} name="Humidity (%)" />
            </LineChart>
          </ResponsiveContainer>
        );

      case "rainfall":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={historySeries}>
              <defs>
                <linearGradient id="rainColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "white" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="rainfall" stroke="#60a5fa" fillOpacity={1} fill="url(#rainColor)" strokeWidth={2} name="Rainfall (mm)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "dams":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={historySeries}>
              <defs>
                <linearGradient id="damColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "white" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="water_level" stroke="#3b82f6" fillOpacity={1} fill="url(#damColor)" strokeWidth={2} name="Water Level (m)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "rivers":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={historySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "white" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="river_level" stroke="#f43f5e" strokeWidth={2.5} name="River Level (m)" />
            </LineChart>
          </ResponsiveContainer>
        );

      case "predictions":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={historySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "white" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="risk_score" stroke="#fbbf24" strokeWidth={2.5} name="Drought Risk Score" />
              <Line type="monotone" dataKey="flood_probability" stroke="#ef4444" strokeWidth={2.5} name="Flood Probability (%)" />
            </LineChart>
          </ResponsiveContainer>
        );

      case "alerts":
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={historySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "white" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="alerts_count" fill="#ec4899" radius={[4, 4, 0, 0]} name="Triggered Warning Counts" />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* HEADER */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              📈 Professional Analytics Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Historical Audits, Fluctuation Trends & Aggregated Regional Hydrology Outlooks
            </p>
          </div>
        </header>

        {/* CONTAINER MAIN */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

          {/* SUMMARY STATISTICS GRID CARD PANELS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Alerts", value: alerts.total, color: "text-indigo-400" },
              { label: "Unread Warnings", value: alerts.unread, color: "text-rose-400" },
              { label: "Nominal Nodes", value: riskData.safe, color: "text-emerald-400" },
              { label: "Moderate Risk", value: riskData.moderate, color: "text-amber-400" },
              { label: "High Risk", value: riskData.high, color: "text-orange-400" },
              { label: "Critical Warnings", value: alerts.critical, color: "text-red-500 animate-pulse" },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{stat.label}</span>
                <div className={`text-2xl font-mono font-black ${stat.color} mt-1`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* HISTORICAL TRENDS DYNAMIC ANALYSIS WORKSPACE */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Telemetry Analyzer</span>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">Historical Fluctuation Trends</h3>
              </div>

              {/* NAVIGATION WORKSPACE CONTROLS */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* CATEGORIES */}
                <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-1 flex flex-wrap gap-1">
                  {[
                    { id: "weather", name: "Weather" },
                    { id: "rainfall", name: "Rainfall" },
                    { id: "dams", name: "Dams/Dems" },
                    { id: "rivers", name: "Rivers" },
                    { id: "predictions", name: "AI Risks" },
                    { id: "alerts", name: "Alerts" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        activeCategory === cat.id ? "bg-teal-600 text-white" : "hover:text-white text-slate-400"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* TIMEFRAMES */}
                <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-1 flex gap-1">
                  {[
                    { id: "daily", name: "Daily" },
                    { id: "weekly", name: "Weekly" },
                    { id: "monthly", name: "Monthly" },
                    { id: "yearly", name: "Yearly" },
                  ].map((tf) => (
                    <button
                      key={tf.id}
                      onClick={() => setActiveTimeframe(tf.id)}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        activeTimeframe === tf.id ? "bg-indigo-600 text-white" : "hover:text-white text-slate-400"
                      }`}
                    >
                      {tf.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* DYNAMIC CHART RENDER LAYER */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              {renderHistoryChart()}
            </div>
          </div>

          {/* LOWER GRID: PIE CHART & RESERVOIR STATS */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* PIE CHART */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between items-center">
              <div className="w-full text-left">
                <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Aggregated risks</span>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">Risk Level Distribution</h3>
              </div>

              <div className="flex justify-center my-4">
                <PieChart width={380} height={280}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    outerRadius={90}
                    cx="50%"
                    cy="50%"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "white" }} />
                  <Legend />
                </PieChart>
              </div>
            </div>

            {/* BAR CHART UTILIZATION */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
              <div className="text-left mb-4">
                <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Reserves utilization</span>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">Reservoir Active Storage Capacity</h3>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reservoirs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#334155", color: "white" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="utilization" fill="#2563eb" radius={[4, 4, 0, 0]} name="Utilization %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* DISTRICT SUMMARY TABLE */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Demographics</span>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">Aggregated District Demographic Profiles</h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider">
                    <th className="p-4">District</th>
                    <th className="p-4">Monitored Villages</th>
                    <th className="p-4">Aggregated Demographic Population</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {districts.map((district) => (
                    <tr key={district.district} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-bold text-white uppercase">{district.district}</td>
                      <td className="p-4 font-mono font-bold text-slate-300">{district.villages}</td>
                      <td className="p-4 font-mono text-slate-400">{district.population.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
