import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function VillagesPage() {
  const [villages, setVillages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [liveChecks, setLiveChecks] = useState<Record<number, any>>({});
  const [checkingIds, setCheckingIds] = useState<Record<number, boolean>>({});

  const [newVillage, setNewVillage] = useState({
    name: "",
    district: "",
    state: "",
    population: "",
    latitude: "25.6",
    longitude: "85.1",
    water_source: "River",
    reservoir_dependency: "50"
  });

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");
  };

  const fetchVillages = () => {
    fetch(`${getBaseURL()}/villages/`)
      .then((res) => res.json())
      .then((data) => setVillages(data))
      .catch((err) => console.error("Error fetching villages:", err));
  };

  useEffect(() => {
    fetchVillages();
  }, []);

  const addVillage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVillage.name.trim() || !newVillage.district.trim() || !newVillage.state.trim()) return;

    try {
      await fetch(`${getBaseURL()}/villages/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newVillage.name,
          district: newVillage.district,
          state: newVillage.state,
          population: Number(newVillage.population) || 1000,
          latitude: Number(newVillage.latitude) || 25.6,
          longitude: Number(newVillage.longitude) || 85.1,
          water_source: newVillage.water_source,
          reservoir_dependency: Number(newVillage.reservoir_dependency) || 50,
        }),
      });

      setNewVillage({
        name: "",
        district: "",
        state: "",
        population: "",
        latitude: "25.6",
        longitude: "85.1",
        water_source: "River",
        reservoir_dependency: "50"
      });

      fetchVillages();
    } catch (error) {
      console.error("Error adding village:", error);
    }
  };

  const deleteVillage = async (id: number) => {
    if (!confirm("Are you sure you want to delete this village?")) return;
    try {
      await fetch(`${getBaseURL()}/villages/${id}`, {
        method: "DELETE",
      });
      fetchVillages();
    } catch (error) {
      console.error("Error deleting village:", error);
    }
  };

  const checkLiveStatus = async (id: number) => {
    setCheckingIds(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${getBaseURL()}/villages/${id}/live-status`);
      if (!res.ok) throw new Error("Check failed");
      const data = await res.json();
      setLiveChecks(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      console.error(err);
      alert("Failed to connect to weather satellites.");
    } finally {
      setCheckingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  // Filter list by search term
  const filteredVillages = villages.filter((v: any) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* HEADER NAVBAR */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                🏘️ Villages Registry
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage village parameters, evaluate coordinates, and run live weather checks.
              </p>
            </div>

            {/* Quick Filter Box */}
            <input
              type="text"
              placeholder="Search villages or districts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-72"
            />
          </div>
        </header>

        {/* CONTAINER VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* ADD VILLAGE FORM PANEL */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 h-fit space-y-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                  Administrative Action
                </span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">Add New Village</h3>
              </div>

              <form onSubmit={addVillage} className="space-y-4 text-sm">
                <div className="space-y-1">
                  <label className="text-slate-400 text-xs">Village Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kuttanad"
                    value={newVillage.name}
                    onChange={(e) => setNewVillage({ ...newVillage, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs">District</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alappuzha"
                      value={newVillage.district}
                      onChange={(e) => setNewVillage({ ...newVillage, district: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs">State</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kerala"
                      value={newVillage.state}
                      onChange={(e) => setNewVillage({ ...newVillage, state: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs">Population</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 5000"
                      value={newVillage.population}
                      onChange={(e) => setNewVillage({ ...newVillage, population: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs">Dam Dependency (%)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 70"
                      value={newVillage.reservoir_dependency}
                      onChange={(e) => setNewVillage({ ...newVillage, reservoir_dependency: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs">Latitude</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9.49"
                      value={newVillage.latitude}
                      onChange={(e) => setNewVillage({ ...newVillage, latitude: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-xs">Longitude</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 76.33"
                      value={newVillage.longitude}
                      onChange={(e) => setNewVillage({ ...newVillage, longitude: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-xl py-3 font-semibold transition-all duration-200 mt-2"
                >
                  🚀 Add Village
                </button>
              </form>
            </div>

            {/* VILLAGE TABLE LISTING PANEL */}
            <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                  Village Records
                </span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">Registered Settlements</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase">
                      <th className="pb-3">ID</th>
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Location</th>
                      <th className="pb-3">Population</th>
                      <th className="pb-3">Linked Dam & Level</th>
                      <th className="pb-3">Live Risk Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {filteredVillages.map((village) => {
                      const check = liveChecks[village.id];
                      const isChecking = checkingIds[village.id];

                      return (
                        <tr key={village.id} className="hover:bg-slate-700/10">
                          <td className="py-4 font-mono text-xs text-slate-500">{village.id}</td>
                          <td className="py-4 font-semibold text-slate-200">{village.name}</td>
                          <td className="py-4">
                            <span className="block text-slate-300">{village.district}</span>
                            <span className="block text-[10px] text-slate-500">{village.state}</span>
                          </td>
                          <td className="py-4 text-slate-300">
                            {Number(village.population).toLocaleString()}
                          </td>
                          
                          {/* Nearest Dam Info */}
                          <td className="py-4">
                            {check ? (
                              <div>
                                <span className="block text-slate-300 font-medium">
                                  🌊 {check.nearest_dam}
                                </span>
                                <span className="block text-xs text-slate-400">
                                  Level: <span className="font-bold text-sky-400">{check.dam_level}%</span> ({check.distance_km}km)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-xs">Run check...</span>
                            )}
                          </td>

                          {/* Live Risk Status Pills */}
                          <td className="py-4">
                            {check ? (
                              <div className="space-y-1.5">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                                    check.risk_level === "High"
                                      ? "bg-red-500/15 text-red-400 border border-red-500/20"
                                      : check.risk_level === "Moderate"
                                      ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                                      : "bg-green-500/15 text-green-400 border border-green-500/20"
                                  }`}
                                >
                                  {check.risk_level === "High" ? "🔴 Danger Zone" : check.risk_level === "Moderate" ? "🟡 Moderate" : "🟢 Safe"}
                                </span>
                                <span className="block text-[9px] text-slate-400 uppercase font-mono">
                                  🌡️ {check.temp}°C • 🌧️ {check.rain}mm
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => checkLiveStatus(village.id)}
                                disabled={isChecking}
                                className="bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/20 text-sky-400 text-xs px-3 py-1.5 rounded-full font-bold transition duration-200"
                              >
                                {isChecking ? "📡 Querying..." : "🔍 Check Live"}
                              </button>
                            )}
                          </td>

                          {/* Delete Action */}
                          <td className="py-4 text-right">
                            <button
                              onClick={() => deleteVillage(village.id)}
                              className="text-red-400 hover:text-red-300 font-semibold text-xs transition"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredVillages.length === 0 && (
                  <p className="text-center text-slate-500 py-6 text-sm">
                    No matching villages registered.
                  </p>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}