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

const citizenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
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

  // Government simulator states
  const [projectionHours, setProjectionHours] = useState<number>(0);
  const [allVillages, setAllVillages] = useState<any[]>([]);

  // Citizen search portal states
  const [citizenQuery, setCitizenQuery] = useState("");
  const [citizenVillage, setCitizenVillage] = useState<any>(null);

  const getBaseURL = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8000/api/v1"
      : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");
  };

  // Fetch all villages on mount for quick citizen search lookup
  useEffect(() => {
    fetch(`${getBaseURL()}/villages/`)
      .then((res) => res.json())
      .then((data) => setAllVillages(data))
      .catch((err) => console.error("Error fetching villages:", err));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setData(null);
    setCitizenVillage(null); // Reset citizen search
    setProjectionHours(0); // Reset projection

    try {
      const res = await weatherAPI.search(query.trim());
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch weather. Verify city name and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Citizen village lookup submission
  const handleCitizenSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenQuery.trim()) return;

    const found = allVillages.find((v) =>
      v.name.toLowerCase().includes(citizenQuery.toLowerCase().trim())
    );

    if (found) {
      setCitizenVillage(found);
      // Center weather query on this village's state or district
      setQuery(found.district || found.state);
      // Automatically pull coordinates and forecast in background
      weatherAPI.search(found.district || found.state).then((res) => {
        setData(res);
      }).catch((err) => console.error(err));
    } else {
      alert(`Village "${citizenQuery}" not found in database registry. Try Gaya Village or Pongodu.`);
    }
  };

  // Mathematical Simulator: calculate water levels over time if raining
  const getProjectedLevel = (baseLevel: number) => {
    const rainRate = data?.current_weather?.rain || 0;
    if (rainRate === 0) return baseLevel; // No rain, level stays baseline
    
    const inflowCoeff = 0.35; // Runoff coefficient into dam reservoir
    const addedInflow = rainRate * projectionHours * inflowCoeff;
    return Math.min(115.0, Math.round((baseLevel + addedInflow) * 100) / 100);
  };

  // Submerge calculator for nearby villages
  const getVillageFloodStatus = (_distanceKm: number, projectedLevel: number) => {
    if (projectedLevel >= 100) {
      return {
        status: "🔴 Submerged / Breached",
        action: "Urgent Boat Rescue Dispatch Required",
        color: "text-red-400 font-extrabold uppercase animate-pulse",
      };
    }
    if (projectedLevel >= 90) {
      const timeToFlood = Math.max(0.5, Math.round((100 - projectedLevel) * 0.5 * 10) / 10);
      return {
        status: "🔴 Evacuating Now",
        action: `Water hits boundary in ~${timeToFlood} hours`,
        color: "text-red-300 font-bold",
      };
    }
    if (projectedLevel >= 75) {
      return {
        status: "🟡 High Watch Level",
        action: "Evacuate senior citizens to shelter",
        color: "text-yellow-400 font-medium",
      };
    }
    return {
      status: "🟢 Safe Area",
      action: "Standby monitoring",
      color: "text-green-400",
    };
  };

  // Find nearest reservoir to the target searched location or citizen village
  const activeCoordinates = citizenVillage
    ? [citizenVillage.latitude, citizenVillage.longitude]
    : data?.location
    ? [data.location.latitude, data.location.longitude]
    : [20.5937, 78.9629]; // fallback

  const nearestReservoir = data?.nearby_reservoirs?.[0];
  const projectedDamLevel = nearestReservoir ? getProjectedLevel(nearestReservoir.current_level) : 50;

  // Dynamic distance calculation helper (Haversine formula)
  const calculateDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  // Find villages near the active reservoir
  const nearbyImpactedVillages = nearestReservoir
    ? allVillages
        .map((v) => ({
          ...v,
          distance_to_dam: calculateDistanceInKm(
            nearestReservoir.latitude,
            nearestReservoir.longitude,
            v.latitude,
            v.longitude
          ),
        }))
        // Only show registered villages within 150 km of the dam
        .filter((v) => v.distance_to_dam < 150)
        .sort((a, b) => a.distance_to_dam - b.distance_to_dam)
        .slice(0, 3)
    : [];

  // Evacuation coordinates
  const targetLatitude = activeCoordinates[0];
  const targetLongitude = activeCoordinates[1];

  const shelterCoords: [number, number] = [targetLatitude + 0.03, targetLongitude + 0.03];
  
  const escapeRoute: [number, number][] = [
    [targetLatitude, targetLongitude],
    [targetLatitude + 0.01, targetLongitude - 0.005],
    [targetLatitude + 0.02, targetLongitude + 0.015],
    shelterCoords,
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* DISASTER COMMAND HEADER */}
        <header className="bg-slate-800/80 border-b border-slate-700/60 p-6 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
                🛡️ Disaster Management Command Center
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Government Time-Projections (1hr - 8hrs) & Live Citizen Evacuation Routing
              </p>
            </div>

            {/* Two Search Inputs */}
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
              {/* Government Location Search */}
              <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
                <div className="relative w-full">
                  <span className="absolute left-3 top-2.5 text-xs text-sky-400 font-bold uppercase">Govt</span>
                  <input
                    type="text"
                    placeholder="Search State/City (e.g. Kerala, Patna)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-14 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
                >
                  Query
                </button>
              </form>

              {/* Citizen Village Search */}
              <form onSubmit={handleCitizenSearch} className="flex flex-1 items-center gap-2">
                <div className="relative w-full">
                  <span className="absolute left-3 top-2.5 text-xs text-orange-400 font-bold uppercase">Citizen</span>
                  <input
                    type="text"
                    placeholder="Search Your Village (e.g. Pongodu)"
                    value={citizenQuery}
                    onChange={(e) => setCitizenQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-20 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
                >
                  Locate
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* CONTAINER VIEW */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
          
          {/* Default Welcome View */}
          {!data && !error && !loading && (
            <div className="text-center py-20 bg-slate-800/40 rounded-3xl border border-slate-700/50 p-8">
              <span className="text-6xl">📡</span>
              <h3 className="text-xl font-bold text-slate-300 mt-4">Command Center Inactive</h3>
              <p className="text-slate-400 max-w-lg mx-auto mt-2 text-sm">
                Enter a city or state name in the **Govt Portal** to project dam inflows, or search for your village name in the **Citizen Portal** to generate live evacuation routes.
              </p>
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() => {
                    setQuery("Kerala");
                    const fakeEvent = { preventDefault: () => {} } as any;
                    setTimeout(() => handleSearch(fakeEvent), 100);
                  }}
                  className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600/40 px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 transition"
                >
                  🚨 Quick Test: Kerala
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-400"></div>
              <p className="text-slate-400 text-sm">Synchronizing satellite datasets...</p>
            </div>
          )}

          {/* CITIZEN EMERGENCY ALERT POPUP CARD */}
          {data && citizenVillage && nearestReservoir && (
            <div className="bg-red-950/40 border border-red-500/50 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-extrabold uppercase tracking-widest text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  Citizen Warning: Evacuation Active
                </div>
                <h3 className="text-2xl font-black text-slate-100">
                  📍 Village {citizenVillage.name} Inundation Threat!
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                  Your village is located **{nearestReservoir.distance_km} km** away from **{nearestReservoir.name}**, which is currently rises to **{projectedDamLevel}%** capacity under the rain sum of **{data.current_weather.rain} mm**.
                </p>
                <div className="bg-slate-900/60 p-3 rounded-xl inline-block border border-red-500/20">
                  <span className="text-green-400 font-bold text-sm">
                    ⛺ Safe Assembly Shelter: Government Relief Camp (District Center)
                  </span>
                </div>
              </div>

              {/* Citizen Countdown Widget */}
              <div className="bg-red-900/50 border border-red-500/40 p-5 rounded-2xl text-center min-w-[220px]">
                <span className="block text-xs uppercase tracking-wider text-red-300 font-extrabold">
                  Time to Submerge:
                </span>
                <span className="block text-3xl font-mono font-black text-white mt-1">
                  {projectedDamLevel >= 100
                    ? "00:00:00"
                    : projectedDamLevel >= 90
                    ? "01:34:12"
                    : "03:45:00"}
                </span>
                <span className="block text-[10px] text-red-300 mt-2 uppercase font-bold tracking-wider">
                  ⚠️ Evacuate via Green Line
                </span>
              </div>
            </div>
          )}

          {data && (
            <div className="grid lg:grid-cols-3 gap-6">
              
              {/* PANEL 1: GOVERNMENT CONTROL BOARD */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase tracking-widest text-red-400 font-bold">
                    Disaster Simulator
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mt-1">Government Projection</h3>
                </div>

                {/* Projection Slider Control */}
                <div className="space-y-4 bg-slate-900/50 p-5 rounded-2xl border border-slate-700/40">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-slate-400">Simulation Hours Later:</span>
                    <span className="text-sky-400 font-mono text-lg">{projectionHours} Hours</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={projectionHours}
                    onChange={(e) => setProjectionHours(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
                  />

                  <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                    <span>CURRENT</span>
                    <span>1 HR</span>
                    <span>2 HR</span>
                    <span>4 HR</span>
                    <span>8 HR</span>
                  </div>
                </div>

                {/* Simulated Weather Status */}
                <div className="space-y-3 pt-4 border-t border-slate-700/40 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Live Weather:</span>
                    <span className="font-semibold text-slate-200">{data.current_weather.condition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Satellite Rain Rate:</span>
                    <span className="font-semibold text-sky-400 font-mono">{data.current_weather.rain} mm/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Accumulated Rain:</span>
                    <span className="font-semibold text-sky-300 font-mono">
                      {(data.current_weather.rain * projectionHours).toFixed(1)} mm
                    </span>
                  </div>
                </div>

                {/* Simulated Dam Breaches */}
                {nearestReservoir && (
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/30 text-center">
                    <span className="text-xs uppercase text-slate-400 block font-bold">Projected Dam Level</span>
                    <span className="text-4xl font-extrabold text-white block mt-1 font-mono">
                      {projectedDamLevel}%
                    </span>
                    {projectedDamLevel >= 100 ? (
                      <span className="text-[10px] bg-red-500/25 border border-red-500/35 px-3 py-1 rounded-full text-red-400 font-bold block mt-2 animate-bounce">
                        🚨 CRITICAL OVERFLOW BREACH!
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Capacity Limit: {nearestReservoir.capacity} MCM
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* PANEL 2: GIS MAP */}
              <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                    GIS Incident Command Map
                  </span>
                  <h3 className="text-xl font-bold text-slate-100 mt-1">
                    Live Warning Boundaries & Evacuation Paths
                  </h3>
                </div>

                <div className="h-[380px] w-full rounded-2xl overflow-hidden border border-slate-700">
                  <MapContainer center={[targetLatitude, targetLongitude]} zoom={12} style={{ height: "100%", width: "100%" }}>
                    <ChangeView center={[targetLatitude, targetLongitude]} zoom={projectedDamLevel >= 90 ? 11 : 12} />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Searched Location Marker */}
                    {!citizenVillage && (
                      <Marker position={[targetLatitude, targetLongitude]} icon={targetLocationIcon}>
                        <Popup>
                          <div className="text-slate-800 font-bold">
                            <h4>📍 Searched City center</h4>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Citizen Village Marker */}
                    {citizenVillage && (
                      <Marker position={[targetLatitude, targetLongitude]} icon={citizenIcon}>
                        <Popup>
                          <div className="text-slate-800 font-bold">
                            <h4>📍 {citizenVillage.name}</h4>
                            <p className="text-xs font-normal">Your searched village location.</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Safe Relief Shelter Marker */}
                    {(projectedDamLevel >= 90 || citizenVillage) && (
                      <>
                        <Marker position={shelterCoords} icon={shelterIcon}>
                          <Popup>
                            <div className="text-slate-800">
                              <h4 className="font-bold text-green-600">⛺ Safe Relief Shelter</h4>
                              <p className="text-xs">Medical supplies, water, and food rations.</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Evacuation green polyline */}
                        <Polyline
                          positions={escapeRoute}
                          pathOptions={{
                            color: "#10B981",
                            weight: 6,
                            opacity: 0.8,
                            dashArray: "10, 10",
                          }}
                        />
                      </>
                    )}

                    {/* Nearest Reservoir Marker */}
                    {nearestReservoir && (
                      <>
                        <Marker position={[nearestReservoir.latitude, nearestReservoir.longitude]} icon={reservoirIcon}>
                          <Popup>
                            <div className="text-slate-800 font-bold">
                              <h4>🌊 {nearestReservoir.name}</h4>
                              <p className="text-xs">Capacity: {nearestReservoir.capacity} MCM</p>
                              <p className="text-xs">Simulated Level: {projectedDamLevel}%</p>
                            </div>
                          </Popup>
                        </Marker>

                        {/* Red danger circle based on projection */}
                        {projectedDamLevel >= 90 && (
                          <Circle
                            center={[nearestReservoir.latitude, nearestReservoir.longitude]}
                            radius={8000} // 8km danger zone
                            pathOptions={{
                              fillColor: "red",
                              color: "red",
                              fillOpacity: 0.25,
                              dashArray: "5, 10",
                            }}
                          />
                        )}
                      </>
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
          )}

          {/* PANEL 3: IMPACTED VILLAGES DOWNSTREAM */}
          {data && nearestReservoir && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-red-400 font-bold">
                  Government Action Table
                </span>
                <h3 className="text-xl font-bold text-slate-100 mt-1">
                  Downstream Submerge & Evacuation Status at Hour {projectionHours}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Villages located within the downstream path of {nearestReservoir.name}.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-slate-400 text-xs uppercase">
                      <th className="pb-3">Village Name</th>
                      <th className="pb-3">Distance to Dam</th>
                      <th className="pb-3">Population</th>
                      <th className="pb-3">Simulated Safety Status</th>
                      <th className="pb-3 text-right">Emergency Action Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {nearbyImpactedVillages.map((village) => {
                      const statusInfo = getVillageFloodStatus(village.distance_to_dam, projectedDamLevel);
                      return (
                        <tr key={village.id} className="hover:bg-slate-700/10">
                          <td className="py-4 font-bold text-slate-200">{village.name}</td>
                          <td className="py-4 font-mono font-semibold text-sky-400">{village.distance_to_dam} km</td>
                          <td className="py-4 text-slate-300">{(village.population || 1000).toLocaleString()}</td>
                          <td className="py-4">
                            <span className={statusInfo.color}>{statusInfo.status}</span>
                          </td>
                          <td className="py-4 text-right">
                            {projectedDamLevel >= 90 ? (
                              <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-full font-bold">
                                🚨 {statusInfo.action}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs italic">Standby Mode</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {nearbyImpactedVillages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                          🟢 Safe Zone: No registered downstream villages within flood threat range (150km) of this reservoir.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
