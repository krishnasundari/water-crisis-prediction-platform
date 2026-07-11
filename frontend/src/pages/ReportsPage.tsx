import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getBaseURL } from "../utils/api";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [newReport, setNewReport] = useState({
    report_type: "pdf",
    include_predictions: true,
    include_forecasts: true,
    filters: "",
  });

  const loadReports = () => {
    fetch(`${getBaseURL()}/reports`)
      .then((res) => res.json())
      .then((data) => {
        setReports(data);
      })
      .catch((err) => console.error("Error loading reports:", err));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      let filtersObject = {};
      if (newReport.filters.trim() !== "") {
        try {
          filtersObject = JSON.parse(newReport.filters);
        } catch {
          alert("Filters must be valid JSON object.");
          setGenerating(false);
          return;
        }
      }

      const res = await fetch(`${getBaseURL()}/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_type: newReport.report_type,
          include_predictions: newReport.include_predictions,
          include_forecasts: newReport.include_forecasts,
          filters: filtersObject,
        }),
      });

      if (res.ok) {
        setNewReport({
          report_type: "pdf",
          include_predictions: true,
          include_forecasts: true,
          filters: "",
        });
        loadReports();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = (id: number) => {
    window.open(`${getBaseURL()}/reports/${id}/download`, "_blank");
  };

  const deleteReport = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this report from logs?")) return;
    try {
      await fetch(`${getBaseURL()}/reports/${id}`, {
        method: "DELETE",
      });
      loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredReports = reports.filter((r) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* HEADER NAVBAR */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              📄 Situation Reports & Analytics Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Generate PDF Situation Briefs, Tabular Hydrological Logs & System Audit Trails
            </p>
          </div>
        </header>

        {/* CONTAINER MAIN VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

          {/* DUAL WORKSPACE: FORM & STATS */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* GENERATE FORM */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Report compiler</span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">Compile New Briefing</h3>
              </div>

              <form onSubmit={generateReport} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">Report Format Type</label>
                  <select
                    value={newReport.report_type}
                    onChange={(e) => setNewReport({ ...newReport, report_type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pdf">Acrobat PDF Document 📄</option>
                    <option value="csv">Tabular CSV Spreadsheet 📊</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReport.include_predictions}
                      onChange={(e) => setNewReport({ ...newReport, include_predictions: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-slate-300 font-semibold">Include ML Hazard Models</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReport.include_forecasts}
                      onChange={(e) => setNewReport({ ...newReport, include_forecasts: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-slate-300 font-semibold">Include Hydrology Outlooks</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">JSON Filter Scope (Optional)</label>
                  <input
                    type="text"
                    placeholder='e.g. {"district": "Gaya"}'
                    value={newReport.filters}
                    onChange={(e) => setNewReport({ ...newReport, filters: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white rounded-xl py-2.5 font-semibold transition"
                >
                  {generating ? "Compiling Brief..." : "⚡ Compile Situation Brief"}
                </button>
              </form>
            </div>

            {/* LEDGER OVERVIEW STATS */}
            <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Briefing stats</span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">Compiled Reports Overview</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-white font-mono">{reports.length}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">Total Briefs</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-teal-400 font-mono">
                    {reports.filter((r) => r.report_type === "pdf").length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">PDF Format</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {reports.filter((r) => r.report_type === "csv").length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">CSV Format</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs text-slate-400 font-semibold">Search Generated Archives</label>
                <input
                  type="text"
                  placeholder="Filter logs by brief name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

          </div>

          {/* GENERATED ARCHIVES LEDGER */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-teal-400 font-bold font-mono">Briefing archive</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1">Generated Briefings Archives</h3>
            </div>

            {filteredReports.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No generated briefing logs match your search. Compile one above!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-300 font-bold uppercase tracking-wider">
                      <th className="p-4">ID</th>
                      <th className="p-4">Report Description</th>
                      <th className="p-4">Format</th>
                      <th className="p-4">Generated At</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredReports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-400">{r.id}</td>
                        <td className="p-4 font-bold text-white uppercase">{r.title}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                            r.report_type === "pdf"
                              ? "bg-red-500/10 border-red-500/20 text-red-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}>
                            {r.report_type}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-center flex justify-center gap-2">
                          <button
                            onClick={() => downloadReport(r.id)}
                            className="bg-teal-500/10 hover:bg-teal-500/30 text-teal-300 border border-teal-500/20 rounded px-3 py-1 font-bold transition"
                          >
                            ⬇️ Download
                          </button>
                          <button
                            onClick={() => deleteReport(r.id)}
                            className="bg-red-500/10 hover:bg-red-500/30 text-red-300 border border-red-500/20 rounded px-3 py-1 font-bold transition"
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