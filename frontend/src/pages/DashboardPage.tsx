import { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { getBaseURL } from "../utils/api";
import useWebSocket from "../hooks/useWebSocket";
import { 
  Home, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Bell, 
  TrendingUp, 
  ShieldAlert,
  Activity,
  Layers,
  LineChart as LineIcon,
  Filter,
  RefreshCw,
  Waves,
  Clock,
  Radio,
} from "lucide-react";

interface ReservoirItem {
  id: number;
  name: string;
  district: string;
  state: string;
  capacity: number;
  current_level: number;
  latitude?: number;
  longitude?: number;
  data_source?: string;
  data_status?: string;
  quality_status?: string;
  is_stale?: boolean;
  freshness_warning?: string;
  last_updated_at?: string;
}

interface ReservoirDetail extends ReservoirItem {
  storage_percentage: number;
  inflow: number;
  outflow: number;
  overflow_status: string;
}

interface RiverItem {
  id: number;
  name: string;
  river_level: number;
  danger_level: number;
  flow_rate: number;
  trend: string;
  data_source?: string;
  data_status?: string;
  quality_status?: string;
  is_stale?: boolean;
  freshness_warning?: string;
  last_updated_at?: string;
}

interface HistoryItem {
  id: number;
  water_level: number;
  inflow: number;
  outflow: number;
  recorded_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_villages: 0,
    total_reservoirs: 0,
    safe_villages: 0,
    moderate_risk_villages: 0,
    high_risk_villages: 0,
    active_alerts: 0,
    average_risk_score: 0,
  });
  const [reservoirs, setReservoirs] = useState<ReservoirItem[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [rivers, setRivers] = useState<RiverItem[]>([]);
  const [selectedRiverId, setSelectedRiverId] = useState<number | null>(null);
  const [activeRiverTelemetry, setActiveRiverTelemetry] = useState<RiverItem | null>(null);
  
  // Filter states
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [selectedReservoirId, setSelectedReservoirId] = useState<number | null>(null);

  // Selected telemetry details and history
  const [activeTelemetry, setActiveTelemetry] = useState<ReservoirDetail | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<HistoryItem[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, resRes, alertsRes, riversRes] = await Promise.all([
        fetch(`${getBaseURL()}/dashboard/stats`).then((r) => r.ok ? r.json() : null),
        fetch(`${getBaseURL()}/reservoirs/`).then((r) => r.ok ? r.json() : []),
        fetch(`${getBaseURL()}/alerts/`).then((r) => r.ok ? r.json() : []),
        fetch(`${getBaseURL()}/rivers/`).then((r) => r.ok ? r.json() : []),
      ]);

      if (statsRes) setStats(statsRes);
      if (Array.isArray(resRes)) {
        setReservoirs(resRes);
        if (resRes.length > 0 && !selectedReservoirId) {
          setSelectedReservoirId(resRes[0].id);
        }
      }
      if (Array.isArray(alertsRes)) {
        const active = alertsRes.filter((a: any) => !a.is_read).slice(0, 5);
        setAlerts(active);
      }
      if (Array.isArray(riversRes)) {
        setRivers(riversRes);
      }
    } catch (err: any) {
      console.error("Dashboard data load error:", err);
      setError("Failed to fetch operational data. Check network connection or backend service.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load detailed telemetry and history for selected reservoir
  const loadReservoirTelemetry = async (id: number) => {
    setIsHistoryLoading(true);
    try {
      const [liveRes, histRes] = await Promise.all([
        fetch(`${getBaseURL()}/reservoirs/${id}/live-status`).then((r) => r.ok ? r.json() : null),
        fetch(`${getBaseURL()}/reservoirs/${id}/history`).then((r) => r.ok ? r.json() : []),
      ]);
      if (liveRes) setActiveTelemetry(liveRes);
      if (Array.isArray(histRes)) setTelemetryHistory(histRes);
    } catch (err) {
      console.error(`Error loading telemetry for reservoir ${id}:`, err);
    } finally {
      setIsHistoryLoading(false);
    }
  };


  // Load river live status if a river is specifically selected
  useEffect(() => {
    if (selectedRiverId) {
      fetch(`${getBaseURL()}/rivers/${selectedRiverId}/live-status`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setActiveRiverTelemetry(data); })
        .catch((err) => console.error("Error loading river live status:", err));
    } else {
      setActiveRiverTelemetry(null);
    }
  }, [selectedRiverId]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedReservoirId) {
      loadReservoirTelemetry(selectedReservoirId);
    }
  }, [selectedReservoirId]);

  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("WebSocket telemetry sync complete. Refreshing dashboard.");
      loadData();
      if (selectedReservoirId) {
        loadReservoirTelemetry(selectedReservoirId);
      }
    }
  });

  // Extract unique States and Districts for filters
  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    reservoirs.forEach((r) => { if (r.state) states.add(r.state); });
    return Array.from(states).sort();
  }, [reservoirs]);

  const uniqueDistricts = useMemo(() => {
    const districts = new Set<string>();
    reservoirs.forEach((r) => {
      if (selectedState === "ALL" || r.state === selectedState) {
        if (r.district) districts.add(r.district);
      }
    });
    return Array.from(districts).sort();
  }, [reservoirs, selectedState]);

  // Filtered reservoir list based on State & District selections
  const filteredReservoirs = useMemo(() => {
    return reservoirs.filter((r) => {
      if (selectedState !== "ALL" && r.state !== selectedState) return false;
      if (selectedDistrict !== "ALL" && r.district !== selectedDistrict) return false;
      return true;
    });
  }, [reservoirs, selectedState, selectedDistrict]);

  // Automatically update selected reservoir if current selection drops out of filtered list
  useEffect(() => {
    if (filteredReservoirs.length > 0) {
      const exists = filteredReservoirs.some((r) => r.id === selectedReservoirId);
      if (!exists) {
        setSelectedReservoirId(filteredReservoirs[0].id);
      }
    } else {
      setSelectedReservoirId(null);
      setActiveTelemetry(null);
      setTelemetryHistory([]);
    }
  }, [filteredReservoirs]);

  // Format historical trend data for recharts
  const formattedHistory = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) return [];
    return telemetryHistory.map((item) => ({
      time: new Date(item.recorded_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      water_level: item.water_level,
      inflow: item.inflow,
      outflow: item.outflow,
    }));
  }, [telemetryHistory]);

  const cards = [
    {
      title: "Total Villages",
      value: stats.total_villages,
      icon: Home,
      color: "#1976d2",
    },
    {
      title: "Monitored Reservoirs",
      value: filteredReservoirs.length,
      icon: Database,
      color: "#0288d1",
    },
    {
      title: "Safe Status",
      value: stats.safe_villages,
      icon: CheckCircle,
      color: "#2e7d32",
    },
    {
      title: "Moderate Risk",
      value: stats.moderate_risk_villages,
      icon: AlertCircle,
      color: "#f9a825",
    },
    {
      title: "High Risk",
      value: stats.high_risk_villages,
      icon: XCircle,
      color: "#d32f2f",
    },
    {
      title: "Active Alerts",
      value: stats.active_alerts,
      icon: Bell,
      color: "#ef6c00",
    },
    {
      title: "Avg Risk Score",
      value: `${stats.average_risk_score}%`,
      icon: TrendingUp,
      color: "#6a1b9a",
    },
  ];

  const riskData = [
    { name: "Safe", value: stats.safe_villages },
    { name: "Moderate", value: stats.moderate_risk_villages },
    { name: "High", value: stats.high_risk_villages },
  ];

  const COLORS = ["#4caf50", "#ff9800", "#f44336"];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />

      <div className="flex-1 py-10 px-8 box-border max-w-[calc(100%-280px)] overflow-x-hidden">
        
        {/* Page Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-slate-900 text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Water Crisis & Disaster Intelligence Dashboard
            </h1>
            <p className="text-slate-500 text-base font-semibold mt-1">
              Multi-district hydrological surveillance, official bulletin tracking, and risk intelligence
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 self-start md:self-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="bg-rose-600 text-white font-bold px-3 py-1 rounded-lg text-xs hover:bg-rose-700 transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Live Operational Status Indicators Bar */}
        <div className="flex flex-row gap-4 mb-6 flex-wrap">
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Pipeline : Active</span>
          </div>

          <div className="bg-blue-50 text-blue-800 border border-blue-200 py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Scheduler Cadence : Guarded</span>
          </div>

          <div className="bg-purple-50 text-purple-800 border border-purple-200 py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-purple-600" />
            <span>Live WebSocket : Connected</span>
          </div>
        </div>

        {/* Multi-District & State Filter Controls */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-slate-800 font-extrabold text-sm uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Surveillance Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* State Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                State
              </label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict("ALL");
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="ALL">All States ({uniqueStates.length})</option>
                {uniqueStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                District
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="ALL">All Districts ({uniqueDistricts.length})</option>
                {uniqueDistricts.map((dst) => (
                  <option key={dst} value={dst}>{dst}</option>
                ))}
              </select>
            </div>

            {/* Reservoir Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Reservoir Focus
              </label>
              <select
                value={selectedReservoirId || ""}
                onChange={(e) => setSelectedReservoirId(Number(e.target.value))}
                disabled={filteredReservoirs.length === 0}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {filteredReservoirs.length === 0 ? (
                  <option value="">No reservoirs in selected region</option>
                ) : (
                  filteredReservoirs.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.name} ({res.district})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* River Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                River Surveillance
              </label>
              <select
                value={selectedRiverId || ""}
                onChange={(e) => setSelectedRiverId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">All Rivers ({rivers.length})</option>
                {rivers.map((riv) => (
                  <option key={riv.id} value={riv.id}>
                    🌊 {riv.name} River ({riv.river_level}m / {riv.danger_level}m)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>


        {/* Selected River Surveillance Telemetry Card */}
        {activeRiverTelemetry && (
          <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-black tracking-tight">{activeRiverTelemetry.name} River Telemetry</h3>
                </div>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">
                  Flow Status: {activeRiverTelemetry.trend} | Danger Level: {activeRiverTelemetry.danger_level}m
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase">Quality Status:</span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  activeRiverTelemetry.quality_status === "FRESH"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : activeRiverTelemetry.quality_status === "STALE"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}>
                  {activeRiverTelemetry.quality_status || "FRESH"}
                </span>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {activeRiverTelemetry.data_status || "Live"}
                </span>
              </div>
            </div>

            {activeRiverTelemetry.freshness_warning && (
              <div className="mb-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 flex items-center gap-2">
                <span>⚠️</span>
                <span>{activeRiverTelemetry.freshness_warning}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Current Depth</span>
                <span className="text-xl md:text-2xl font-black text-white font-mono mt-1 block">
                  {activeRiverTelemetry.river_level}m
                </span>
              </div>
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Danger Limit</span>
                <span className="text-xl md:text-2xl font-black text-rose-400 font-mono mt-1 block">
                  {activeRiverTelemetry.danger_level}m
                </span>
              </div>
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Discharge Flow</span>
                <span className="text-xl md:text-2xl font-black text-cyan-400 font-mono mt-1 block">
                  {activeRiverTelemetry.flow_rate} m³/s
                </span>
              </div>
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Telemetry Trend</span>
                <span className="text-xl md:text-2xl font-black text-amber-400 font-mono mt-1 block">
                  {activeRiverTelemetry.trend}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Reservoir Focus Telemetry & Freshness Card */}
        {activeTelemetry ? (
          <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Waves className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-xl font-black tracking-tight">{activeTelemetry.name} Reservoir</h3>
                </div>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">
                  Region: {activeTelemetry.district}, {activeTelemetry.state}
                </p>
              </div>

              {/* Data Quality & Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold uppercase">Quality Status:</span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  activeTelemetry.quality_status === "FRESH"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : activeTelemetry.quality_status === "STALE"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}>
                  {activeTelemetry.quality_status || "FRESH"}
                </span>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {activeTelemetry.data_status || "Live"}
                </span>
              </div>
            </div>

            {/* Freshness Warning Banner */}
            {activeTelemetry.freshness_warning && (
              <div className="mb-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 flex items-center gap-2">
                <span>⚠️</span>
                <span>{activeTelemetry.freshness_warning}</span>
              </div>
            )}

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Live Storage</span>
                <span className="text-xl md:text-2xl font-black text-white font-mono mt-1 block">
                  {activeTelemetry.current_level} MCM
                </span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Total Capacity</span>
                <span className="text-xl md:text-2xl font-black text-cyan-400 font-mono mt-1 block">
                  {activeTelemetry.capacity} MCM
                </span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Storage %</span>
                <span className={`text-xl md:text-2xl font-black font-mono mt-1 block ${
                  activeTelemetry.storage_percentage >= 90 ? "text-rose-400" :
                  activeTelemetry.storage_percentage >= 75 ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {activeTelemetry.storage_percentage}%
                </span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Overflow Alert</span>
                <span className="text-xl md:text-2xl font-black text-white font-mono mt-1 block">
                  {activeTelemetry.overflow_status}
                </span>
              </div>
            </div>

            {/* Provenance & Observation Timestamps */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400 gap-2">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Source: <strong className="text-slate-200">{activeTelemetry.data_source || "Estimated"}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Observed: {new Date(activeTelemetry.last_updated_at || new Date()).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : filteredReservoirs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 text-center text-slate-500 font-semibold shadow-sm">
            <Waves className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p>No reservoirs match the selected State and District filters.</p>
          </div>
        ) : null}

        {/* Dashboard Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="p-5 rounded-2xl text-white shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between select-none"
                style={{
                  background: `linear-gradient(135deg, ${card.color}, ${card.color}DD)`
                }}
              >
                <div className="flex items-center gap-2.5 mb-3 opacity-90">
                  <Icon className="w-5 h-5 text-white" />
                  <span className="text-xs font-bold uppercase tracking-wider">{card.title}</span>
                </div>

                <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-none m-0">
                  {card.value}
                </h2>
              </div>
            );
          })}
        </div>

        {/* Real Historical Trend Chart Section */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <LineIcon className="w-6 h-6 text-blue-600" />
              <span>Historical Storage Volume Trend</span>
            </h2>
            {activeTelemetry && (
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-lg">
                Reservoir: {activeTelemetry.name} (MCM)
              </span>
            )}
          </div>

          {isHistoryLoading ? (
            <div className="h-[320px] flex items-center justify-center text-slate-400 font-semibold">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading historical telemetry observations...</span>
            </div>
          ) : formattedHistory.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl">
              <Database className="w-8 h-8 text-slate-300 mb-2" />
              <span>No historical snapshots logged for this reservoir yet.</span>
            </div>
          ) : (
            <div className="w-full h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fontWeight: "bold" }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11, fontWeight: "bold" }} stroke="#94a3b8" unit=" MCM" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: "bold" }} />
                  <Line
                    type="monotone"
                    dataKey="water_level"
                    name="Storage Volume (MCM)"
                    stroke="#0288d1"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflow"
                    name="Inflow (MCM)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="outflow"
                    name="Outflow (MCM)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Risk Distribution Chart Widget */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-8">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <Layers className="w-6 h-6 text-slate-500" />
            <span>Regional Risk Classification Distribution</span>
          </h2>

          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  dataKey="value"
                  innerRadius={75}
                  outerRadius={125}
                  paddingAngle={4}
                  label
                >
                  {riskData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Alerts Operations Feed Section */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm mb-8">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-slate-500" />
            <span>Official & Disaster Alerts Feed</span>
          </h2>

          {alerts.length === 0 ? (
            <p className="text-emerald-600 text-sm font-bold bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              All regional systems normal. No active disaster warnings logged.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border-l-[5px] shadow-sm flex flex-col gap-1.5 transition-all ${
                    a.severity === "critical"
                      ? "bg-red-50/50 border-red-500 text-slate-800"
                      : a.severity === "high"
                      ? "bg-amber-50/50 border-amber-500 text-slate-800"
                      : "bg-yellow-50/40 border-yellow-500 text-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-center font-bold text-xs uppercase tracking-wider">
                    <span className={
                      a.severity === "critical" ? "text-red-600" :
                      a.severity === "high" ? "text-amber-600" : "text-yellow-600"
                    }>
                      [{a.severity}] {a.alert_type} | Source: {a.data_source || 'AI Engine'}
                    </span>
                    <span className="text-slate-400 font-semibold font-mono text-[11px]">
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-700 leading-relaxed">{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Predictive Summary Statistics Block */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-slate-500" />
            <span>Hydrological Intelligence Summary</span>
          </h2>

          <div className="text-sm md:text-base leading-relaxed text-slate-600 bg-slate-50 border border-slate-200/70 p-5 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="font-bold">Regional Average Risk Index</span>
              <span className="text-lg font-black text-purple-700">{stats.average_risk_score}%</span>
            </div>
            
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="font-bold">High Risk Settlements</span>
              <span className="text-lg font-black text-red-600">{stats.high_risk_villages}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="font-bold">Monitored Inflow/Storage Reservoirs</span>
              <span className="text-lg font-black text-cyan-700">{filteredReservoirs.length}</span>
            </div>

            <p className="text-xs font-medium text-slate-500 leading-relaxed mt-1 italic">
              Data streams synthesize official CWC Weekly Storage Bulletins, Open-Meteo precipitation archives, and local runoff calculations. Stale observations are flagged automatically with warning badges.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
