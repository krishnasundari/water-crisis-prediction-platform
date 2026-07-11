import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useWebSocket from "../hooks/useWebSocket";
import { getBaseURL } from "../utils/api";

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPrediction, setNewPrediction] = useState({
    village_id: "",
    rainfall: "",
    population: "",
    reservoir_capacity: "",
    groundwater_level: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const predRes = await fetch(`${getBaseURL()}/predictions/`);
      const predData = await predRes.json();
      setPredictions(predData);

      const vilRes = await fetch(`${getBaseURL()}/villages/`);
      const vilData = await vilRes.json();
      setVillages(vilData);
    } catch (err) {
      console.error("Error loading predictions data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // WebSocket Live Refetch Hook
  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("WebSocket: prediction loop complete. Refetching active records.");
      loadData();
    }
  });

  const addPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrediction.village_id || !newPrediction.rainfall || !newPrediction.population) return;

    try {
      const res = await fetch(`${getBaseURL()}/predictions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          village_id: Number(newPrediction.village_id),
          rainfall: Number(newPrediction.rainfall),
          population: Number(newPrediction.population),
          reservoir_capacity: Number(newPrediction.reservoir_capacity || 50),
          groundwater_level: Number(newPrediction.groundwater_level || 15),
        }),
      });
      if (res.ok) {
        setNewPrediction({
          village_id: "",
          rainfall: "",
          population: "",
          reservoir_capacity: "",
          groundwater_level: "",
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deletePrediction = async (id: number) => {
    try {
      await fetch(`${getBaseURL()}/predictions/${id}`, {
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

  // Helper styles
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "Severe":
        return "text-red-400 font-extrabold";
      case "High":
        return "text-red-300 font-bold";
      case "Moderate":
        return "text-yellow-400 font-semibold";
      default:
        return "text-green-400";
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* HEADER */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-300 bg-clip-text text-transparent">
              🤖 AI Hazards & Volumetrics Prediction Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Random Forest Scarcity Risks, Multi-hazard Flood Classifications & Confidence Intervals
            </p>
          </div>
        </header>

        {/* CONTAINER */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

          {/* DUAL MODE FORM INPUT */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold font-mono">Predictive modeling</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">Run AI Hazards Diagnostic Simulation</h3>
            </div>

            <form onSubmit={addPrediction} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Target Village</label>
                <select
                  value={newPrediction.village_id}
                  onChange={(e) => setNewPrediction({ ...newPrediction, village_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Village...</option>
                  {villages.map((vil) => (
                    <option key={vil.id} value={vil.id}>
                      {vil.name} ({vil.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Rainfall (mm)</label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={newPrediction.rainfall}
                  onChange={(e) => setNewPrediction({ ...newPrediction, rainfall: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Population</label>
                <input
                  type="number"
                  placeholder="e.g. 8000"
                  value={newPrediction.population}
                  onChange={(e) => setNewPrediction({ ...newPrediction, population: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Dam Capacity (%)</label>
                <input
                  type="number"
                  placeholder="e.g. 65"
                  value={newPrediction.reservoir_capacity}
                  onChange={(e) => setNewPrediction({ ...newPrediction, reservoir_capacity: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Aquifer Depth (m)</label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={newPrediction.groundwater_level}
                  onChange={(e) => setNewPrediction({ ...newPrediction, groundwater_level: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-5 flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition"
                >
                  🔮 Run Hazard Prognosis
                </button>
              </div>
            </form>
          </div>

          {/* ACTIVE PREDICTIVE LOGS LIST */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold font-mono">Prediction ledger</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">AI Output Analytics Logs</h3>
            </div>

            {loading && predictions.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="text-slate-400 text-sm mt-3">Loading prediction runs...</p>
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No active hazard predictions. Run a manual prognosis simulation above or wait for sync schedules!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider">
                      <th className="p-4">ID</th>
                      <th className="p-4">Village Name</th>
                      <th className="p-4">Scarcity Score</th>
                      <th className="p-4">Scarcity Risk</th>
                      <th className="p-4">Flood Probability</th>
                      <th className="p-4">Flood Severity</th>
                      <th className="p-4">Confidence</th>
                      <th className="p-4">Impact Advisory</th>
                      <th className="p-4">Prognosis Date</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {predictions.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-400">{p.id}</td>
                        <td className="p-4 font-bold text-white capitalize">{getVillageName(p.village_id)}</td>
                        <td className="p-4 font-mono text-indigo-400 font-bold">{p.risk_score}%</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${
                            p.risk_level === "High" ? "bg-red-500/20 text-red-400" : p.risk_level === "Moderate" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"
                          }`}>
                            {p.risk_level}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-cyan-400 font-bold">{p.flood_probability !== null ? `${p.flood_probability}%` : "-"}</td>
                        <td className="p-4">
                          {p.flood_severity ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${getSeverityColor(p.flood_severity)}`}>
                              {p.flood_severity}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-4 font-mono text-teal-400 font-bold">{p.confidence_score !== null ? `${p.confidence_score}%` : "-"}</td>
                        <td className="p-4 text-slate-300 max-w-[200px] truncate" title={p.expected_impact || "N/A"}>
                          {p.expected_impact || "N/A"}
                        </td>
                        <td className="p-4 text-slate-400 font-mono">
                          {new Date(p.prediction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(p.prediction_date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => deletePrediction(p.id)}
                            className="bg-red-500/10 hover:bg-red-500/30 text-red-300 border border-red-500/20 rounded px-2.5 py-1 transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}