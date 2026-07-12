import { useEffect, useState } from "react";
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
  LineChart as LineIcon
} from "lucide-react";

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
  const [alerts, setAlerts] = useState<any[]>([]);

  const loadData = () => {
    fetch(`${getBaseURL()}/dashboard/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Error fetching dashboard stats:", err));

    fetch(`${getBaseURL()}/alerts/`)
      .then((res) => res.json())
      .then((data) => {
        const active = data.filter((a: any) => !a.is_read).slice(0, 5);
        setAlerts(active);
      })
      .catch((err) => console.error("Error fetching dashboard alerts:", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("Telemetry sync complete. Reloading dashboard data.");
      loadData();
    }
  });

  const cards = [
    {
      title: "Total Villages",
      value: stats.total_villages,
      icon: Home,
      color: "#1976d2",
    },
    {
      title: "Reservoirs",
      value: stats.total_reservoirs,
      icon: Database,
      color: "#0288d1",
    },
    {
      title: "Safe",
      value: stats.safe_villages,
      icon: CheckCircle,
      color: "#2e7d32",
    },
    {
      title: "Moderate",
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
      title: "Alerts",
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
    {
      name: "Safe",
      value: stats.safe_villages,
    },
    {
      name: "Moderate",
      value: stats.moderate_risk_villages,
    },
    {
      name: "High",
      value: stats.high_risk_villages,
    },
  ];

  const monthlyTrend = [
    { month: "Jan", risk: 45 },
    { month: "Feb", risk: 52 },
    { month: "Mar", risk: 60 },
    { month: "Apr", risk: 58 },
    { month: "May", risk: 72 },
    { month: "Jun", risk: stats.average_risk_score },
  ];

  const COLORS = ["#4caf50", "#ff9800", "#f44336"];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />

      <div className="flex-1 py-12 px-10 box-border max-w-[calc(100%-280px)]">
        
        {/* Page Header Title */}
        <h1 className="text-slate-900 text-3xl md:text-4xl font-black tracking-tight mb-5 leading-none">
          Water Crisis Prediction & Management Platform
        </h1>

        {/* Live Operational Status Indicators Bar */}
        <div className="flex flex-row gap-5 mb-8 flex-wrap">
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-sm flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Status : Online</span>
          </div>

          <div className="bg-blue-50 text-blue-700 border border-blue-200 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-sm flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span>AI Prediction : Active</span>
          </div>

          <div className="bg-amber-50 text-amber-700 border border-amber-200 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-sm flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Last Updated : Just Now</span>
          </div>
        </div>

        <p className="text-slate-500 text-lg font-semibold mb-9">
          AI Powered Water Resource Monitoring Dashboard
        </p>

        {/* Dashboard Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="p-6 rounded-2xl text-white shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between select-none"
                style={{
                  background: `linear-gradient(135deg, ${card.color}, ${card.color}DD)`
                }}
              >
                <div className="flex items-center gap-2.5 mb-4 opacity-90">
                  <Icon className="w-5 h-5 text-white" />
                  <span className="text-sm font-bold uppercase tracking-wider">{card.title}</span>
                </div>

                <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none m-0">
                  {card.value}
                </h1>
              </div>
            );
          })}
        </div>

        {/* Chart Widgets */}
        <div className="mt-10 bg-white border border-slate-200/80 rounded-2xl p-7 shadow-sm">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            <Layers className="w-6 h-6 text-slate-500" />
            <span>Risk Distribution</span>
          </h2>

          <div className="w-full h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  dataKey="value"
                  innerRadius={80}
                  outerRadius={135}
                  paddingAngle={4}
                  label
                >
                  {riskData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-10 bg-white border border-slate-200/80 rounded-2xl p-7 shadow-sm">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            <LineIcon className="w-6 h-6 text-slate-500" />
            <span>Monthly Water Risk Trend</span>
          </h2>

          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 13, fontWeight: "bold" }} />
                <YAxis tick={{ fontSize: 13, fontWeight: "bold" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 13, fontWeight: "bold" }} />
                <Line
                  type="monotone"
                  dataKey="risk"
                  stroke="#1976d2"
                  strokeWidth={4}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Alerts Operations Feed Section */}
        <div className="mt-10 bg-white border border-slate-200/80 rounded-2xl p-7 shadow-sm">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-slate-500" />
            <span>Active Operations Alerts Feed</span>
          </h2>

          {alerts.length === 0 ? (
            <p className="text-emerald-600 text-base font-bold">
              All systems stable. No active alerts or breaches logged.
            </p>
          ) : (
            <div className="flex flex-col gap-4 mt-5">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-5 rounded-2xl border-l-[6px] shadow-sm flex flex-col gap-2 transition-all ${
                    a.severity === "critical"
                      ? "bg-red-50/40 border-red-500 text-slate-800"
                      : a.severity === "high"
                      ? "bg-amber-50/40 border-amber-500 text-slate-800"
                      : "bg-yellow-50/30 border-yellow-500 text-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-center font-bold text-xs uppercase tracking-wider">
                    <span className={
                      a.severity === "critical"
                        ? "text-red-600"
                        : a.severity === "high"
                        ? "text-amber-600"
                        : "text-yellow-600"
                    }>
                      [{a.severity}] {a.alert_type} | DataSource: {a.data_source || 'AI Prediction Engine'}
                    </span>
                    <span className="text-slate-450 font-semibold lowercase">
                      {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-650 leading-relaxed mt-1">{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Predictive Summary Statistics Block */}
        <div className="mt-10 bg-white border border-slate-200/80 rounded-2xl p-7 shadow-sm">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-slate-500" />
            <span>AI Prediction Summary</span>
          </h2>

          <div className="text-base lg:text-[17px] leading-loose text-slate-600 bg-slate-50/60 border border-slate-100 p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
              <span className="font-bold">Average Risk Score</span>
              <span className="text-lg lg:text-xl font-black text-purple-700">{stats.average_risk_score}%</span>
            </div>
            
            <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
              <span className="font-bold">High Risk Villages</span>
              <span className="text-lg lg:text-xl font-black text-red-600">{stats.high_risk_villages}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
              <span className="font-bold">Safe Villages</span>
              <span className="text-lg lg:text-xl font-black text-emerald-600">{stats.safe_villages}</span>
            </div>

            <p className="text-sm font-medium text-slate-500 leading-relaxed mt-2 italic">
              The AI decision support model recommends continuous monitoring of rainfall forecasting, groundwater depletion levels, and reservoir overflow capacities for sustainable regional water resource management.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}