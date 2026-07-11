import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useWebSocket from "../hooks/useWebSocket";
import { getBaseURL } from "../utils/api";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [reservoirs, setReservoirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [expandedAlertId, setExpandedAlertId] = useState<number | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const toggleExpandAlert = async (id: number) => {
    if (expandedAlertId === id) {
      setExpandedAlertId(null);
      setDispatchLogs([]);
      return;
    }
    setExpandedAlertId(id);
    setLogsLoading(true);
    try {
      const res = await fetch(`${getBaseURL()}/alerts/${id}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setDispatchLogs(data);
      }
    } catch (err) {
      console.error("Error loading notification logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const [form, setForm] = useState({
    village_id: "",
    reservoir_id: "",
    alert_type: "flood",
    severity: "critical",
    message: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const alertRes = await fetch(`${getBaseURL()}/alerts/`);
      const alertData = await alertRes.json();
      setAlerts(alertData);

      const vilRes = await fetch(`${getBaseURL()}/villages/`);
      const vilData = await vilRes.json();
      setVillages(vilData);

      const resRes = await fetch(`${getBaseURL()}/reservoirs/`);
      const resData = await resRes.json();
      setReservoirs(resData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // WebSocket Live Reload Sync Hook
  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("WebSocket Alerts: reload alerts logs.");
      loadData();
    }
  });

  const triggerSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) return;

    try {
      const res = await fetch(`${getBaseURL()}/alerts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          village_id: form.village_id ? Number(form.village_id) : null,
          reservoir_id: form.reservoir_id ? Number(form.reservoir_id) : null,
          alert_type: form.alert_type,
          severity: form.severity,
          message: form.message,
        }),
      });
      if (res.ok) {
        setForm({
          village_id: "",
          reservoir_id: "",
          alert_type: "flood",
          severity: "critical",
          message: "",
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`${getBaseURL()}/alerts/${id}/read`, {
        method: "PUT",
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAlert = async (id: number) => {
    try {
      await fetch(`${getBaseURL()}/alerts/${id}`, {
        method: "DELETE",
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getVillageName = (id: number) => {
    const v = villages.find((vil) => vil.id === id);
    return v ? v.name : `Village #${id}`;
  };

  const getReservoirName = (id: number) => {
    const r = reservoirs.find((res) => res.id === id);
    return r ? r.name : `Reservoir #${id}`;
  };

  // Filter conditions
  const filteredAlerts = alerts.filter((a) => {
    const typeMatch = filterType === "all" || a.alert_type === filterType;
    const sevMatch = filterSeverity === "all" || a.severity === filterSeverity;
    return typeMatch && sevMatch;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-extrabold";
      case "high":
        return "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-semibold";
      default:
        return "bg-green-500/20 text-green-400 border border-green-500/30";
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* HEADER NAVBAR */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
              🚨 Emergency Warning & Operations Log
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Active Warning Dispatches, Compounding Severity Indicators & Response Checklists
            </p>
          </div>
        </header>

        {/* CONTAINER MAIN VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

          {/* SIMULATION FORM AND FILTERS */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* SIMULATION FORM */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-red-400 font-bold font-mono">Disaster simulation</span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">Manual Alert Dispatch</h3>
              </div>

              <form onSubmit={triggerSimulation} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Village ID (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={form.village_id}
                      onChange={(e) => setForm({ ...form, village_id: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Reservoir ID (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 2"
                      value={form.reservoir_id}
                      onChange={(e) => setForm({ ...form, reservoir_id: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Alert Type</label>
                    <select
                      value={form.alert_type}
                      onChange={(e) => setForm({ ...form, alert_type: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="flood">Flood 🌊</option>
                      <option value="drought">Drought 🏜️</option>
                      <option value="reservoir">Dam Limit 🎛️</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-semibold">Severity</label>
                    <select
                      value={form.severity}
                      onChange={(e) => setForm({ ...form, severity: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="critical">Critical 🔴</option>
                      <option value="high">High 🟠</option>
                      <option value="medium">Medium 🟡</option>
                      <option value="low">Low 🟢</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Alert Message</label>
                  <textarea
                    rows={3}
                    placeholder="Enter alert warning message..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white rounded-xl py-2.5 font-semibold transition"
                >
                  🚀 Dispatch Alert Warning
                </button>
              </form>
            </div>

            {/* ALERTS FILTER OPTIONS */}
            <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-red-400 font-bold font-mono">Log filtering</span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">Configure Alert Streams</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Filter Alert Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">All Alerts</option>
                    <option value="flood">Flood Alarms 🌊</option>
                    <option value="drought">Scarcity Alarms 🏜️</option>
                    <option value="reservoir">Dam Alarms 🎛️</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Filter Severity</label>
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical Only 🔴</option>
                    <option value="high">High and above 🟠</option>
                    <option value="medium">Medium Only 🟡</option>
                    <option value="low">Low Only 🟢</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/30 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-semibold">Active Warnings logged:</span>
                  <span className="text-white font-black font-mono ml-2">{filteredAlerts.length} entries</span>
                </div>
                <div className="text-slate-500">Filters dynamically applied</div>
              </div>
            </div>

          </div>

          {/* ACTIVE WARNINGS STREAM */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-red-400 font-bold font-mono">Disaster alarms ledger</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">Logged Warnings Operations Feed</h3>
            </div>

            {loading && filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mx-auto"></div>
                <p className="text-slate-400 text-sm mt-3">Loading active operations log...</p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No active warning matches found matching your filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((a) => (
                  <div key={a.id} className="space-y-2">
                    <div
                      onClick={() => toggleExpandAlert(a.id)}
                      className={`flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/60 border rounded-2xl p-4 gap-4 text-xs transition-colors cursor-pointer ${
                        a.is_read ? "opacity-50 border-slate-800" : "border-slate-700/40 hover:border-slate-600"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black border ${getSeverityBadge(a.severity)}`}>
                            {a.severity}
                          </span>
                          <span className="text-red-400 uppercase font-black tracking-wider text-[10px]">{a.alert_type}</span>
                          {a.village_id && (
                            <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold capitalize">
                              🏘️ {getVillageName(a.village_id)}
                            </span>
                          )}
                          {a.reservoir_id && (
                            <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded font-bold capitalize">
                              💧 {getReservoirName(a.reservoir_id)}
                            </span>
                          )}
                          <span className="text-slate-500 font-mono">
                            {new Date(a.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-200 text-sm leading-relaxed">{a.message}</p>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto justify-end" onClick={(e) => e.stopPropagation()}>
                        {!a.is_read && (
                          <button
                            onClick={() => markAsRead(a.id)}
                            className="bg-green-500/10 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-xl px-4 py-2 font-bold transition"
                          >
                            Dismiss
                          </button>
                        )}
                        <button
                          onClick={() => deleteAlert(a.id)}
                          className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 font-bold transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Stakeholder Dispatch HUD dropdown */}
                    {expandedAlertId === a.id && (
                      <div className="bg-slate-800/80 border border-slate-700/40 rounded-2xl p-5 ml-4 space-y-3 transition-all animate-fadeIn">
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">
                          📩 Emergency Stakeholder Dispatch Ledger
                        </h4>
                        <hr className="border-slate-700/60" />
                        {logsLoading ? (
                          <div className="text-slate-400 text-[10px]">Loading delivery logs...</div>
                        ) : dispatchLogs.length === 0 ? (
                          <div className="text-slate-500 text-[10px]">No notification dispatch logs recorded for this alert.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dispatchLogs.map((log) => (
                              <div key={log.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="font-bold text-white text-xs">{log.recipient_name}</div>
                                  <div className="text-[10px] text-slate-400">{log.recipient_role}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {log.channel === "sms" ? "📱" : "📧"} {log.destination}
                                  </div>
                                </div>
                                <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] uppercase font-black px-2 py-0.5 rounded">
                                  {log.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
