import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
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
import useWebSocket from "../hooks/useWebSocket";

const API =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000/api/v1"
    : import.meta.env.VITE_API_URL || (window.location.hostname.endsWith(".railway.app") ? "https://water-crisis-prediction-platform-production.up.railway.app/api/v1" : "https://water-crisis-prediction-platform-1.onrender.com/api/v1");

// ============================
// Marker Icons
// ============================

const safeVillageIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const moderateVillageIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const highVillageIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const reservoirIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const refugeIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ============================
// Interfaces
// ============================

interface Village {
  id: number;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
  water_source: string;
  reservoir_dependency: number;
}

interface Reservoir {
  id: number;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_level: number;
}

interface River {
  id: number;
  name: string;
  river_level: number;
  danger_level: number;
  flow_rate: number;
  trend: string;
  latitude: number;
  longitude: number;
}

interface Prediction {
  id: number;
  village_id: number;
  risk_level: string;
  risk_score: number;
  rainfall: number;
  flood_probability: number;
  flood_severity: string;
}

// ============================
// Map Camera Controller
// ============================

function MapController({
  selectedState,
  selectedDistrict,
  selectedVillage,
  villages,
  districtCentroids,
}: {
  selectedState: string;
  selectedDistrict: string;
  selectedVillage: string;
  villages: Village[];
  districtCentroids: any[];
}) {
  const map = useMap();

  useEffect(() => {
    // 1. Zoom into specific Village
    if (selectedVillage !== "all") {
      const v = villages.find((vil) => vil.name === selectedVillage);
      if (v && isValidCoord(v.latitude, v.longitude)) {
        map.setView([v.latitude, v.longitude], 12, { animate: true });
      }
      return;
    }

    // 2. Zoom into specific District
    if (selectedDistrict !== "all") {
      const dist = districtCentroids.find((d) => d.name === selectedDistrict);
      if (dist && isValidCoord(dist.latitude, dist.longitude)) {
        map.setView([dist.latitude, dist.longitude], 9, { animate: true });
      }
      return;
    }

    // 3. Zoom into specific State
    if (selectedState !== "all") {
      const points: [number, number][] = villages
        .filter((v) => (v.state || "").toLowerCase() === selectedState.toLowerCase() && isValidCoord(v.latitude, v.longitude))
        .map((v) => [v.latitude, v.longitude]);

      if (points.length > 0) {
        map.fitBounds(points, { padding: [50, 50], animate: true });
      }
      return;
    }

    // 4. Zoom to National Scope (All points)
    const points: [number, number][] = villages
      .filter((v) => isValidCoord(v.latitude, v.longitude))
      .map((v) => [v.latitude, v.longitude]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50], animate: true });
    }
  }, [selectedState, selectedDistrict, selectedVillage, villages, map]);

  return null;
}

// Helper coordinate validator
function isValidCoord(lat: number, lng: number) {
  return lat !== null && lat !== undefined && !isNaN(lat) && lat !== 0 &&
         lng !== null && lng !== undefined && !isNaN(lng) && lng !== 0;
}

// ============================
// Main Component
// ============================

export default function MapsPage() {
  const [villages, setVillages] = useState<Village[]>([]);
  const [reservoirs, setReservoirs] = useState<Reservoir[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [rivers, setRivers] = useState<River[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Hierarchical state scopes
  const [selectedState, setSelectedState] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedVillage, setSelectedVillage] = useState("all");

  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState<any>(null);

  const loadData = async () => {
    try {
      const vil = await fetch(`${API}/villages`);
      setVillages(await vil.json());

      const res = await fetch(`${API}/reservoirs`);
      setReservoirs(await res.json());

      const pred = await fetch(`${API}/predictions`);
      setPredictions(await pred.json());

      const riv = await fetch(`${API}/rivers`);
      setRivers(await riv.json());

      const al = await fetch(`${API}/alerts`);
      setAlerts(await al.json());
    } catch (err) {
      console.error("Error loading map telemetry:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // WebSocket update triggers
  useWebSocket((event) => {
    if (event === "sync_complete") {
      console.log("WebSocket Map: syncing live telemetry hierarchy.");
      loadData();
    }
  });

  const handleCalculateRoute = async (villageId: number) => {
    setRouteLoading(true);
    try {
      const res = await fetch(`${API}/evacuation/route?village_id=${villageId}`);
      if (res.ok) {
        setActiveRoute(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRouteLoading(false);
    }
  };

  // Helper selectors
  const statesList = useMemo(() => {
    return Array.from(new Set(villages.map((v) => v.state).filter(Boolean))).sort();
  }, [villages]);

  const districtsList = useMemo(() => {
    const filtered = selectedState === "all"
      ? villages
      : villages.filter((v) => v.state === selectedState);
    return Array.from(new Set(filtered.map((v) => v.district).filter(Boolean))).sort();
  }, [villages, selectedState]);

  const villagesList = useMemo(() => {
    const filtered = selectedDistrict === "all"
      ? villages
      : villages.filter((v) => v.district === selectedDistrict);
    return filtered.map((v) => v.name).filter(Boolean).sort();
  }, [villages, selectedDistrict]);

  // Aggregate District Telemetry
  const districtCentroids = useMemo(() => {
    const mapDistricts = new Map<string, Village[]>();
    villages.forEach((v) => {
      if (v.district) {
        if (!mapDistricts.has(v.district)) {
          mapDistricts.set(v.district, []);
        }
        mapDistricts.get(v.district)!.push(v);
      }
    });

    const list: any[] = [];
    mapDistricts.forEach((vils, districtName) => {
      // Find average lat/lon centroid
      const sumLat = vils.reduce((sum, v) => sum + (v.latitude || 0), 0);
      const sumLon = vils.reduce((sum, v) => sum + (v.longitude || 0), 0);
      const avgLat = vils.length > 0 ? sumLat / vils.length : 22.5;
      const avgLon = vils.length > 0 ? sumLon / vils.length : 79.0;

      // Group predictions inside this district
      const villageIds = vils.map((v) => v.id);
      const distPredictions = predictions.filter((p) => villageIds.includes(p.village_id));
      
      const avgRainfall = distPredictions.length > 0
        ? distPredictions.reduce((sum, p) => sum + (p.rainfall || 0), 0) / distPredictions.length
        : 0;

      const avgFloodProbability = distPredictions.length > 0
        ? distPredictions.reduce((sum, p) => sum + (p.flood_probability || 0), 0) / distPredictions.length
        : 0;

      // Sourced dams inside district
      const distDams = reservoirs.filter((r) => r.district === districtName);
      const avgDamStorage = distDams.length > 0
        ? distDams.reduce((sum, r) => sum + (r.current_level / (r.capacity || 1) * 100), 0) / distDams.length
        : 50.0;

      // Sourced rivers in district
      const distRivers = (rivers || []).filter((riv) => {
        const rName = (riv.name || "").toLowerCase();
        const dName = (districtName || "").toLowerCase();
        return rName.includes(dName) || 
               dName === "gaya" && rName === "ganges" ||
               dName === "pongodu" && rName === "yamuna" ||
               dName === "ponugodu" && rName === "godavari";
      });

      const riversDangerBreach = distRivers.some((riv) => riv.river_level >= riv.danger_level);

      // Active Alerts count
      const activeAlerts = (alerts || []).filter((a) => !a.is_read && villageIds.includes(a.village_id || -1));
      const hasCriticalAlert = activeAlerts.some((a) => (a.severity || "").toLowerCase() === "critical");

      // Compounding Color Code logic
      let color = "#10b981"; // Green (Safe)
      let status = "Safe";
      if (hasCriticalAlert || avgFloodProbability > 70 || riversDangerBreach) {
        color = "#ef4444"; // Red (Critical)
        status = "Critical Warning";
      } else if (avgFloodProbability > 45 || activeAlerts.some((a) => (a.severity || "").toLowerCase() === "high")) {
        color = "#f97316"; // Orange (High)
        status = "High Threat";
      } else if (avgFloodProbability > 25 || activeAlerts.some((a) => (a.severity || "").toLowerCase() === "medium")) {
        color = "#eab308"; // Yellow (Moderate)
        status = "Moderate Warning";
      }

      list.push({
        name: districtName,
        state: vils[0].state,
        latitude: avgLat,
        longitude: avgLon,
        avgRainfall: round(avgRainfall, 1),
        avgFloodProbability: round(avgFloodProbability, 1),
        avgDamStorage: round(avgDamStorage, 1),
        damsCount: distDams.length,
        riversCount: distRivers.length,
        activeAlertsCount: activeAlerts.length,
        riversDangerBreach,
        color,
        status,
      });
    });

    return list;
  }, [villages, predictions, reservoirs, rivers, alerts]);

  // Selected scope district details HUD solver
  const activeDistrictSummary = useMemo(() => {
    if (selectedDistrict === "all") return null;
    return districtCentroids.find((d) => d.name === selectedDistrict) || null;
  }, [selectedDistrict, districtCentroids]);

  function round(val: number, decimals: number) {
    return Number(val.toFixed(decimals));
  }

  const getVillageRiskColor = (id: number) => {
    const latest = predictions.find((p) => p.village_id === id);
    if (!latest || !latest.risk_level) return "#10b981"; // Green
    const lvl = latest.risk_level.toLowerCase();
    if (lvl === "high") return "#ef4444"; // Red
    if (lvl === "moderate") return "#eab308"; // Yellow
    return "#10b981"; // Green
  };

  const getVillageRisk = (id: number) => {
    const latest = predictions.find((p) => p.village_id === id);
    return latest && latest.risk_level ? latest.risk_level : "safe";
  };

  const getVillageIcon = (id: number) => {
    const latest = predictions.find((p) => p.village_id === id);
    if (!latest || !latest.risk_level) return safeVillageIcon;
    const lvl = latest.risk_level.toLowerCase();
    if (lvl === "high") return highVillageIcon;
    if (lvl === "moderate") return moderateVillageIcon;
    return safeVillageIcon;
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* HIERARCHICAL SCOPE HEADER HUD */}
        <header className="bg-slate-800/90 border-b border-slate-700/60 p-4 sticky top-0 z-40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold font-mono">
              India Hydrological Viewfinder
            </span>
            <div className="text-sm font-bold flex items-center gap-1.5 mt-0.5">
              <span>🇮🇳 India</span>
              <span className="text-slate-500">/</span>
              <span className={selectedState !== "all" ? "text-indigo-400" : "text-slate-400"}>
                {selectedState === "all" ? "All States" : selectedState}
              </span>
              {selectedDistrict !== "all" && (
                <>
                  <span className="text-slate-500">/</span>
                  <span className="text-indigo-400">{selectedDistrict} District</span>
                </>
              )}
              {selectedVillage !== "all" && (
                <>
                  <span className="text-slate-500">/</span>
                  <span className="text-cyan-400">{selectedVillage}</span>
                </>
              )}
            </div>
          </div>

          {/* SCOPE DROPDOWNS SELECTORS */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* STATE */}
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict("all");
                setSelectedVillage("all");
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All States</option>
              {statesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* DISTRICT */}
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedVillage("all");
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={selectedState === "all"}
            >
              <option value="all">All Districts</option>
              {districtsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* VILLAGE */}
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={selectedDistrict === "all"}
            >
              <option value="all">All Villages</option>
              {villagesList.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </header>

        {/* MAP CONTAINER MAIN LAYER */}
        <div className="flex-1 relative">
          
          <MapContainer
            center={[22.5, 79]}
            zoom={5}
            style={{ width: "100%", height: "100%", zIndex: 10 }}
          >
            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController
              selectedState={selectedState}
              selectedDistrict={selectedDistrict}
              selectedVillage={selectedVillage}
              villages={villages}
              districtCentroids={districtCentroids}
            />

            {/* Render Evacuation Route */}
            {activeRoute && activeRoute.route_coordinates && (
              <>
                <Polyline
                  positions={activeRoute.route_coordinates}
                  pathOptions={{
                    color: "#10b981",
                    weight: 6,
                    opacity: 0.8,
                    dashArray: activeRoute.routing_mode === "fallback_direct" ? "10, 10" : undefined,
                  }}
                />
                {activeRoute.refuge && isValidCoord(activeRoute.refuge.latitude, activeRoute.refuge.longitude) && (
                  <Marker
                    position={[activeRoute.refuge.latitude, activeRoute.refuge.longitude]}
                    icon={refugeIcon}
                  >
                    <Popup>
                      <div style={{ minWidth: "150px" }} className="text-slate-900">
                        <h4 style={{ color: "#b45309", margin: "0 0 5px 0" }}>🔰 Designated Safe Refuge</h4>
                        <p style={{ margin: "2px 0", fontSize: "11px" }}><strong>Name:</strong> {activeRoute.refuge.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </>
            )}

            {/* 1. DISTRICT CENTROIDS OVERLAYS (Shown when selectedDistrict is 'all') */}
            {selectedDistrict === "all" &&
              districtCentroids
                .filter((d) => (selectedState === "all" || d.state === selectedState) && isValidCoord(d.latitude, d.longitude))
                .map((dist) => (
                  <Circle
                    key={`district-centroid-${dist.name}`}
                    center={[dist.latitude, dist.longitude]}
                    radius={30000}
                    pathOptions={{
                      color: dist.color,
                      fillColor: dist.color,
                      fillOpacity: 0.5,
                      weight: 2,
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedState(dist.state);
                        setSelectedDistrict(dist.name);
                      },
                      mouseover: () => setHoveredDistrict(dist),
                      mouseout: () => setHoveredDistrict(null),
                    }}
                  >
                    <Popup>
                      <div className="text-slate-900 text-xs min-w-[200px] space-y-1">
                        <h3 className="font-black text-sm uppercase" style={{ color: dist.color }}>
                          📍 {dist.name} District
                        </h3>
                        <p><strong>State:</strong> {dist.state}</p>
                        <p><strong>Severity:</strong> <span style={{ color: dist.color, fontWeight: "bold" }}>{dist.status}</span></p>
                        <hr className="my-1" />
                        <p><strong>Avg Flood Probability:</strong> {dist.avgFloodProbability}%</p>
                        <p><strong>Active Alert Alarms:</strong> {dist.activeAlertsCount}</p>
                        <p><strong>Click to zoom and view individual villages</strong></p>
                      </div>
                    </Popup>
                  </Circle>
                ))}

            {/* 2. SPECIFIC VILLAGE MARKERS (Shown when selectedDistrict is specific) */}
            {selectedDistrict !== "all" &&
              villages
                .filter((v) => v.district === selectedDistrict && isValidCoord(v.latitude, v.longitude))
                .map((village) => (
                  <Marker
                    key={`village-marker-${village.id}`}
                    position={[village.latitude, village.longitude]}
                    icon={getVillageIcon(village.id)}
                  >
                    <Popup>
                      <div className="text-slate-900 text-xs min-w-[220px] space-y-1.5">
                        <h3 style={{ color: getVillageRiskColor(village.id), margin: 0 }} className="font-bold text-sm">
                          🏘️ {village.name}
                        </h3>
                        <hr />
                        <p><strong>Population:</strong> {village.population.toLocaleString()}</p>
                        <p><strong>Water Source:</strong> {village.water_source}</p>
                        <p><strong>Drought Risk:</strong> <span style={{ color: getVillageRiskColor(village.id), fontWeight: "bold" }}>{getVillageRisk(village.id).toUpperCase()}</span></p>
                        
                        <button
                          onClick={() => handleCalculateRoute(village.id)}
                          style={{
                            width: "100%",
                            padding: "6px",
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            marginTop: "8px",
                            fontSize: "10px",
                          }}
                        >
                          {routeLoading ? "Calculating..." : "🏃 Evacuate Route"}
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

            {/* 3. ACTIVE ALERTS WARNING HALOS */}
            {selectedDistrict !== "all" &&
              alerts
                .filter((a: any) => !a.is_read && a.village_id)
                .map((alert: any) => {
                  const village = villages.find((v: any) => v.id === alert.village_id);
                  if (!village || village.district !== selectedDistrict || !isValidCoord(village.latitude, village.longitude)) return null;
                  return (
                    <Circle
                      key={`alert-halo-${alert.id}`}
                      center={[village.latitude, village.longitude]}
                      pathOptions={{
                        color: alert.severity === "critical" ? "#ef4444" : "#f97316",
                        fillColor: alert.severity === "critical" ? "#ef4444" : "#f97316",
                        fillOpacity: 0.15,
                        weight: 1.5,
                        dashArray: "5, 5",
                      }}
                      radius={18000}
                    />
                  );
                })}

            {/* 4. RESERVOIR/DAM MARKERS (Shown inside selected district) */}
            {selectedDistrict !== "all" &&
              reservoirs
                .filter((r) => r.district === selectedDistrict && isValidCoord(r.latitude, r.longitude))
                .map((reservoir) => (
                  <Marker
                    key={`res-marker-${reservoir.id}`}
                    position={[reservoir.latitude, reservoir.longitude]}
                    icon={reservoirIcon}
                  >
                    <Popup>
                      <div className="text-slate-900 text-xs min-w-[200px] space-y-1">
                        <h4 className="font-bold text-blue-600">💧 {reservoir.name} Reservoir</h4>
                        <p><strong>Capacity:</strong> {reservoir.capacity.toLocaleString()} m3</p>
                        <p><strong>Current Level:</strong> {reservoir.current_level.toLocaleString()} m</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

          </MapContainer>

          {/* FLOATING HOVER DISTRICT SUMMARY CARD */}
          {hoveredDistrict && (
            <div className="absolute bottom-5 left-5 z-40 bg-slate-950/90 border border-slate-700/80 rounded-2xl p-4 w-72 backdrop-blur-md shadow-2xl space-y-2 pointer-events-none text-xs">
              <h3 className="font-black text-sm uppercase flex items-center justify-between">
                <span>{hoveredDistrict.name} District</span>
                <span className="px-2 py-0.5 rounded text-[8px] font-black" style={{ background: `${hoveredDistrict.color}20`, color: hoveredDistrict.color, border: `1px solid ${hoveredDistrict.color}30` }}>
                  {hoveredDistrict.status}
                </span>
              </h3>
              <hr className="border-slate-800" />
              <p><strong>State:</strong> {hoveredDistrict.state}</p>
              <p><strong>Avg Rainfall:</strong> {hoveredDistrict.avgRainfall} mm</p>
              <p><strong>AI Flood Risk:</strong> {hoveredDistrict.avgFloodProbability}%</p>
              <p><strong>Dam Avg Storage:</strong> {hoveredDistrict.avgDamStorage}% ({hoveredDistrict.damsCount} active)</p>
              <p><strong>Rivers Danger:</strong> {hoveredDistrict.riversDangerBreach ? "🔴 Danger Breach" : "🟢 Stable"}</p>
              <p><strong>Active Alert Alarms:</strong> {hoveredDistrict.activeAlertsCount}</p>
            </div>
          )}

          {/* FLOATING DISTRICT HUD CARD (Shown when a district is selected) */}
          {activeDistrictSummary && (
            <div className="absolute top-5 right-5 z-40 bg-slate-950/95 border border-slate-700/80 rounded-3xl p-5 w-80 backdrop-blur-md shadow-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Selected Scope</span>
                  <h3 className="font-black text-sm uppercase text-white mt-0.5">{activeDistrictSummary.name} Summary</h3>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase" style={{ background: `${activeDistrictSummary.color}25`, color: activeDistrictSummary.color, border: `1px solid ${activeDistrictSummary.color}35` }}>
                  {activeDistrictSummary.status}
                </span>
              </div>
              <hr className="border-slate-800" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Average Rainfall:</span>
                  <span className="font-bold text-teal-400">{activeDistrictSummary.avgRainfall} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">AI Flood Risk:</span>
                  <span className="font-bold text-cyan-400">{activeDistrictSummary.avgFloodProbability}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dam Reserves:</span>
                  <span className="font-bold text-blue-400">{activeDistrictSummary.avgDamStorage}% ({activeDistrictSummary.damsCount} dams)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rivers Status:</span>
                  <span className={`font-bold ${activeDistrictSummary.riversDangerBreach ? "text-red-400" : "text-green-400"}`}>
                    {activeDistrictSummary.riversDangerBreach ? "BREACH ALERT" : "STABLE OUTFLOW"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Alert Logs:</span>
                  <span className="font-bold text-red-400">{activeDistrictSummary.activeAlertsCount} alerts</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setSelectedDistrict("all");
                    setSelectedVillage("all");
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-2 font-bold transition text-center"
                >
                  India Map
                </button>
              </div>
            </div>
          )}

          {/* EVACUATION ROUTE FLOATING CARD */}
          {activeRoute && (
            <div className="absolute bottom-5 right-5 z-40 bg-slate-950/95 border border-slate-700/80 rounded-3xl p-5 w-80 backdrop-blur-md shadow-2xl space-y-3 text-xs">
              <h4 className="text-indigo-400 font-black text-sm uppercase flex items-center gap-1.5">
                🏃 Evacuation Routing Solver
              </h4>
              <hr className="border-slate-800" />
              <div className="space-y-1.5">
                <p><strong>Source:</strong> <span className="capitalize">{activeRoute.source.name}</span></p>
                <p><strong>Safe Refuge Haven:</strong> <span className="capitalize text-amber-400 font-bold">{activeRoute.refuge.name}</span></p>
                <p><strong>Distance:</strong> {activeRoute.distance_km} km</p>
                <p><strong>Est. Drive Time:</strong> {activeRoute.duration_minutes} mins</p>
                <p><strong>Method:</strong> <span className="uppercase font-bold text-teal-400 text-[10px]">{activeRoute.routing_mode}</span></p>
              </div>
              <button
                onClick={() => setActiveRoute(null)}
                className="w-full bg-red-600 hover:bg-red-500 text-white rounded-xl py-2 font-bold transition"
              >
                Clear Route
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}