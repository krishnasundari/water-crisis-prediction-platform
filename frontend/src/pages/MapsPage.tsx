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
import { getBaseURL } from "../utils/api";
import {
  isValidCoord,
  calculateStoragePercentage,
  CoordinateItem,
} from "../utils/mapUtils";
import { Waves, AlertTriangle, Layers } from "lucide-react";

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

const riverIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
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

interface Village extends CoordinateItem {
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

interface Reservoir extends CoordinateItem {
  id: number;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_level: number;
  data_source?: string;
  data_status?: string;
  quality_status?: string;
  last_updated_at?: string;
}

interface River extends CoordinateItem {
  id: number;
  name: string;
  river_level: number;
  danger_level: number;
  flow_rate: number;
  trend: string;
  latitude: number;
  longitude: number;
  data_source?: string;
  data_status?: string;
  quality_status?: string;
  last_updated_at?: string;
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
  reservoirs,
  districtCentroids,
}: {
  selectedState: string;
  selectedDistrict: string;
  selectedVillage: string;
  villages: Village[];
  reservoirs: Reservoir[];
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
      } else {
        const distVillages = villages.filter(
          (v) => v.district === selectedDistrict && isValidCoord(v.latitude, v.longitude)
        );
        if (distVillages.length > 0) {
          map.setView([distVillages[0].latitude, distVillages[0].longitude], 9, { animate: true });
        }
      }
      return;
    }

    // 3. Zoom into specific State
    if (selectedState !== "all") {
      const stateVillages = villages.filter(
        (v) => (v.state || "").toLowerCase() === selectedState.toLowerCase() && isValidCoord(v.latitude, v.longitude)
      );
      const stateReservoirs = reservoirs.filter(
        (r) => (r.state || "").toLowerCase() === selectedState.toLowerCase() && isValidCoord(r.latitude, r.longitude)
      );
      const points: [number, number][] = [
        ...stateVillages.map((v): [number, number] => [v.latitude, v.longitude]),
        ...stateReservoirs.map((r): [number, number] => [r.latitude, r.longitude]),
      ];

      if (points.length > 0) {
        map.fitBounds(points, { padding: [50, 50], animate: true });
      }
      return;
    }

    // 4. Default: India National Viewfinder
    map.setView([22.5, 79.0], 5, { animate: true });
  }, [selectedState, selectedDistrict, selectedVillage, villages, reservoirs, districtCentroids, map]);

  return null;
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

  // Hierarchical scope filters
  const [selectedState, setSelectedState] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedVillage, setSelectedVillage] = useState("all");

  // Asset type filter (Prompt 11 requirement)
  const [assetFilter, setAssetFilter] = useState<"all" | "villages" | "reservoirs" | "rivers">("all");

  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState<any>(null);

  const loadData = async () => {
    try {
      const base = getBaseURL();
      const [vilRes, resRes, predRes, rivRes, alertRes] = await Promise.all([
        fetch(`${base}/villages/`).then((r) => r.ok ? r.json() : []),
        fetch(`${base}/reservoirs/`).then((r) => r.ok ? r.json() : []),
        fetch(`${base}/predictions/`).then((r) => r.ok ? r.json() : []),
        fetch(`${base}/rivers/`).then((r) => r.ok ? r.json() : []),
        fetch(`${base}/alerts/`).then((r) => r.ok ? r.json() : []),
      ]);

      if (Array.isArray(vilRes)) setVillages(vilRes);
      if (Array.isArray(resRes)) setReservoirs(resRes);
      if (Array.isArray(predRes)) setPredictions(predRes);
      if (Array.isArray(rivRes)) setRivers(rivRes);
      if (Array.isArray(alertRes)) setAlerts(alertRes);
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
      const res = await fetch(`${getBaseURL()}/evacuation/route?village_id=${villageId}`);
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
    const states = new Set<string>();
    villages.forEach((v) => { if (v.state) states.add(v.state); });
    reservoirs.forEach((r) => { if (r.state) states.add(r.state); });
    return Array.from(states).sort();
  }, [villages, reservoirs]);

  const districtsList = useMemo(() => {
    const districts = new Set<string>();
    const stateMatch = (s?: string) => selectedState === "all" || (s || "").toLowerCase() === selectedState.toLowerCase();

    villages.forEach((v) => { if (stateMatch(v.state) && v.district) districts.add(v.district); });
    reservoirs.forEach((r) => { if (stateMatch(r.state) && r.district) districts.add(r.district); });
    return Array.from(districts).sort();
  }, [villages, reservoirs, selectedState]);

  const villagesList = useMemo(() => {
    const filtered = selectedDistrict === "all"
      ? villages
      : villages.filter((v) => v.district === selectedDistrict);
    return filtered.map((v) => v.name).filter(Boolean).sort();
  }, [villages, selectedDistrict]);

  // Aggregate District Telemetry (without synthetic fallback numbers)
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
      const validVils = vils.filter((v) => isValidCoord(v.latitude, v.longitude));
      if (validVils.length === 0) return;

      const sumLat = validVils.reduce((sum, v) => sum + v.latitude, 0);
      const sumLon = validVils.reduce((sum, v) => sum + v.longitude, 0);
      const avgLat = sumLat / validVils.length;
      const avgLon = sumLon / validVils.length;

      const villageIds = vils.map((v) => v.id);
      const distPredictions = predictions.filter((p) => villageIds.includes(p.village_id));
      
      const avgRainfall = distPredictions.length > 0
        ? distPredictions.reduce((sum, p) => sum + (p.rainfall || 0), 0) / distPredictions.length
        : null;

      const avgFloodProbability = distPredictions.length > 0
        ? distPredictions.reduce((sum, p) => sum + (p.flood_probability || 0), 0) / distPredictions.length
        : null;

      // Real monitored reservoirs inside district
      const distDams = reservoirs.filter((r) => r.district === districtName);
      const validDams = distDams.filter((r) => r.capacity && r.capacity > 0);
      const avgDamStorage = validDams.length > 0
        ? validDams.reduce((sum, r) => sum + ((r.current_level / r.capacity) * 100), 0) / validDams.length
        : null; // Explicit null when no dams exist, never a fabricated 50%

      // Associated rivers in district
      const distRivers = (rivers || []).filter((riv) => {
        const rName = (riv.name || "").toLowerCase();
        const dName = (districtName || "").toLowerCase();
        return rName.includes(dName);
      });

      const riversDangerBreach = distRivers.some((riv) => riv.river_level >= riv.danger_level);

      // Active Alerts count
      const activeAlerts = (alerts || []).filter((a) => !a.is_read && villageIds.includes(a.village_id || -1));
      const hasCriticalAlert = activeAlerts.some((a) => (a.severity || "").toLowerCase() === "critical");

      // Compounding Color Code logic (Green: Safe, Yellow: Moderate, Orange: High, Red: Critical)
      let color = "#10b981"; // Green (Safe)
      let status = "Safe";
      const floodProb = avgFloodProbability ?? 0;

      if (hasCriticalAlert || floodProb > 70 || riversDangerBreach) {
        color = "#ef4444"; // Red (Critical)
        status = "Critical Threat";
      } else if (floodProb > 45 || activeAlerts.some((a) => (a.severity || "").toLowerCase() === "high")) {
        color = "#f97316"; // Orange (High)
        status = "High Warning";
      } else if (floodProb > 25 || activeAlerts.some((a) => (a.severity || "").toLowerCase() === "medium")) {
        color = "#eab308"; // Yellow (Moderate)
        status = "Moderate Risk";
      }

      list.push({
        name: districtName,
        state: vils[0].state,
        latitude: avgLat,
        longitude: avgLon,
        avgRainfall: avgRainfall !== null ? Number(avgRainfall.toFixed(1)) : null,
        avgFloodProbability: avgFloodProbability !== null ? Number(avgFloodProbability.toFixed(1)) : null,
        avgDamStorage: avgDamStorage !== null ? Number(avgDamStorage.toFixed(1)) : null,
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

  // Count unmapped assets with missing or invalid coordinates
  const unmappedCount = useMemo(() => {
    let unmapped = 0;
    villages.forEach((v) => { if (!isValidCoord(v.latitude, v.longitude)) unmapped++; });
    reservoirs.forEach((r) => { if (!isValidCoord(r.latitude, r.longitude)) unmapped++; });
    rivers.forEach((riv) => { if (!isValidCoord(riv.latitude, riv.longitude)) unmapped++; });
    return unmapped;
  }, [villages, reservoirs, rivers]);

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

  // Filtered asset collections (respecting location and asset type filters)
  const displayVillages = useMemo(() => {
    if (assetFilter !== "all" && assetFilter !== "villages") return [];
    return villages.filter((v) => {
      if (!isValidCoord(v.latitude, v.longitude)) return false;
      if (selectedState !== "all" && (v.state || "").toLowerCase() !== selectedState.toLowerCase()) return false;
      if (selectedDistrict !== "all" && (v.district || "").toLowerCase() !== selectedDistrict.toLowerCase()) return false;
      return true;
    });
  }, [villages, assetFilter, selectedState, selectedDistrict]);

  const displayReservoirs = useMemo(() => {
    if (assetFilter !== "all" && assetFilter !== "reservoirs") return [];
    return reservoirs.filter((r) => {
      if (!isValidCoord(r.latitude, r.longitude)) return false;
      if (selectedState !== "all" && (r.state || "").toLowerCase() !== selectedState.toLowerCase()) return false;
      if (selectedDistrict !== "all" && (r.district || "").toLowerCase() !== selectedDistrict.toLowerCase()) return false;
      return true;
    });
  }, [reservoirs, assetFilter, selectedState, selectedDistrict]);

  const displayRivers = useMemo(() => {
    if (assetFilter !== "all" && assetFilter !== "rivers") return [];
    return rivers.filter((riv) => {
      return isValidCoord(riv.latitude, riv.longitude);
    });
  }, [rivers, assetFilter]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* HIERARCHICAL SCOPE HEADER HUD */}
        <header className="bg-slate-800/90 border-b border-slate-700/60 p-4 sticky top-0 z-40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold font-mono">
              India Hydrological Viewfinder & Spatial Surveillance
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

          {/* SCOPE & ASSET DROPDOWN SELECTORS */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* ASSET TYPE FILTER */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value as any)}
                className="bg-transparent text-slate-200 focus:outline-none font-semibold cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Layers</option>
                <option value="reservoirs" className="bg-slate-900">💧 Reservoirs & Dams ({reservoirs.length})</option>
                <option value="rivers" className="bg-slate-900">🌊 River Stations ({rivers.length})</option>
                <option value="villages" className="bg-slate-900">🏘️ Settlements ({villages.length})</option>
              </select>
            </div>

            {/* STATE SELECTOR */}
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict("all");
                setSelectedVillage("all");
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            >
              <option value="all">All States ({statesList.length})</option>
              {statesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* DISTRICT SELECTOR */}
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedVillage("all");
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            >
              <option value="all">All Districts ({districtsList.length})</option>
              {districtsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* VILLAGE SELECTOR */}
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              disabled={selectedDistrict === "all"}
            >
              <option value="all">All Settlements ({villagesList.length})</option>
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
              reservoirs={reservoirs}
              districtCentroids={districtCentroids}
            />

            {/* Evacuation Route Polyline */}
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
                      <div className="text-slate-900 text-xs min-w-[150px]">
                        <h4 className="font-bold text-amber-700 m-0 mb-1">🔰 Designated Safe Refuge</h4>
                        <p className="m-0"><strong>Name:</strong> {activeRoute.refuge.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </>
            )}

            {/* 1. DISTRICT CENTROIDS OVERLAYS (When viewing all districts) */}
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
                      fillOpacity: 0.45,
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
                        <p><strong>Threat Status:</strong> <span style={{ color: dist.color, fontWeight: "bold" }}>{dist.status}</span></p>
                        <hr className="my-1 border-slate-200" />
                        <p><strong>Avg Rainfall:</strong> {dist.avgRainfall !== null ? `${dist.avgRainfall} mm` : "N/A"}</p>
                        <p><strong>Dam Reserves:</strong> {dist.avgDamStorage !== null ? `${dist.avgDamStorage}%` : "No Monitored Reservoirs"}</p>
                        <p><strong>Active Alerts:</strong> {dist.activeAlertsCount}</p>
                        <p className="text-[10px] text-slate-500 italic mt-1">Click to zoom into district assets</p>
                      </div>
                    </Popup>
                  </Circle>
                ))}

            {/* 2. SPECIFIC VILLAGE MARKERS */}
            {displayVillages.map((village) => (
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
                    <p className="text-slate-500 text-[11px] m-0">{village.district}, {village.state}</p>
                    <hr className="border-slate-200 my-1" />
                    <p><strong>Population:</strong> {village.population.toLocaleString()}</p>
                    <p><strong>Primary Source:</strong> {village.water_source}</p>
                    <p><strong>Drought Risk:</strong> <span style={{ color: getVillageRiskColor(village.id), fontWeight: "bold" }}>{getVillageRisk(village.id).toUpperCase()}</span></p>
                    
                    <button
                      onClick={() => handleCalculateRoute(village.id)}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold mt-2 text-[11px] transition shadow-sm"
                    >
                      {routeLoading ? "Calculating..." : "🏃 Evacuation Route"}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 3. ACTIVE ALERTS WARNING HALOS */}
            {alerts
              .filter((a: any) => !a.is_read && a.village_id)
              .map((alert: any) => {
                const village = villages.find((v: any) => v.id === alert.village_id);
                if (!village || !isValidCoord(village.latitude, village.longitude)) return null;
                if (selectedState !== "all" && (village.state || "").toLowerCase() !== selectedState.toLowerCase()) return null;
                if (selectedDistrict !== "all" && (village.district || "").toLowerCase() !== selectedDistrict.toLowerCase()) return null;

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

            {/* 4. RESERVOIR / DAM MARKERS WITH METADATA (Prompt 11 requirement) */}
            {displayReservoirs.map((reservoir) => {
              const storagePct = calculateStoragePercentage(reservoir.current_level, reservoir.capacity);
              return (
                <Marker
                  key={`res-marker-${reservoir.id}`}
                  position={[reservoir.latitude, reservoir.longitude]}
                  icon={reservoirIcon}
                >
                  <Popup>
                    <div className="text-slate-900 text-xs min-w-[220px] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-blue-700 font-extrabold text-sm">
                        <Waves className="w-4 h-4 text-blue-600" />
                        <span>{reservoir.name} Reservoir</span>
                      </div>
                      <p className="text-slate-500 text-[11px] m-0">{reservoir.district}, {reservoir.state}</p>
                      <hr className="border-slate-200 my-1" />
                      <div className="space-y-1">
                        <p><strong>Live Storage:</strong> {reservoir.current_level.toLocaleString()} MCM</p>
                        <p><strong>Design Capacity:</strong> {reservoir.capacity.toLocaleString()} MCM</p>
                        <p><strong>Storage Level:</strong> <span className="font-bold text-blue-700">{storagePct !== null ? `${storagePct}%` : "N/A"}</span></p>
                        <p><strong>Source:</strong> <span className="text-[11px] font-semibold">{reservoir.data_source || "Estimated"}</span></p>
                        <p><strong>Quality Status:</strong> <span className="font-bold uppercase text-emerald-700">{reservoir.quality_status || reservoir.data_status || "Live"}</span></p>
                        {reservoir.last_updated_at && (
                          <p className="text-[10px] text-slate-400 font-mono">Updated: {new Date(reservoir.last_updated_at).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* 5. RIVER GAUGES MARKERS (Prompt 11 requirement) */}
            {displayRivers.map((river) => {
              const isBreached = river.river_level >= river.danger_level;
              return (
                <Marker
                  key={`river-marker-${river.id}`}
                  position={[river.latitude, river.longitude]}
                  icon={riverIcon}
                >
                  <Popup>
                    <div className="text-slate-900 text-xs min-w-[210px] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-purple-700 font-extrabold text-sm">
                        <span>🌊</span>
                        <span>{river.name} River Station</span>
                      </div>
                      <hr className="border-slate-200 my-1" />
                      <div className="space-y-1">
                        <p><strong>Current Depth:</strong> {river.river_level}m</p>
                        <p><strong>Flood Danger Limit:</strong> {river.danger_level}m</p>
                        <p><strong>Flow Discharge:</strong> {river.flow_rate} m³/s</p>
                        <p><strong>Telemetry Trend:</strong> <span className="font-bold">{river.trend}</span></p>
                        <p><strong>Status:</strong> <span className={`font-bold ${isBreached ? "text-red-600" : "text-emerald-700"}`}>
                          {isBreached ? "🔴 FLOOD BREACH" : "🟢 NORMAL OUTFLOW"}
                        </span></p>
                        <p><strong>Source:</strong> <span className="text-[11px]">{river.data_source || "Simulated Telemetry"}</span></p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          </MapContainer>

          {/* UNMAPPED ASSETS ADVISORY BADGE */}
          {unmappedCount > 0 && (
            <div className="absolute top-4 left-4 z-30 bg-slate-900/90 border border-slate-700/70 text-slate-300 rounded-xl px-3 py-1.5 text-[11px] flex items-center gap-1.5 backdrop-blur-md shadow-md">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{unmappedCount} asset(s) omitted due to missing geographic coordinates</span>
            </div>
          )}

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
              <p><strong>Avg Rainfall:</strong> {hoveredDistrict.avgRainfall !== null ? `${hoveredDistrict.avgRainfall} mm` : "No Station"}</p>
              <p><strong>AI Flood Risk:</strong> {hoveredDistrict.avgFloodProbability !== null ? `${hoveredDistrict.avgFloodProbability}%` : "Not Assessed"}</p>
              <p><strong>Dam Avg Storage:</strong> {hoveredDistrict.avgDamStorage !== null ? `${hoveredDistrict.avgDamStorage}% (${hoveredDistrict.damsCount} active)` : "No Monitored Dams"}</p>
              <p><strong>Rivers Danger:</strong> {hoveredDistrict.riversDangerBreach ? "🔴 Danger Breach" : "🟢 Stable"}</p>
              <p><strong>Active Alerts:</strong> {hoveredDistrict.activeAlertsCount}</p>
            </div>
          )}

          {/* FLOATING DISTRICT HUD CARD */}
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
                  <span className="font-bold text-teal-400">
                    {activeDistrictSummary.avgRainfall !== null ? `${activeDistrictSummary.avgRainfall} mm` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Flood Risk Index:</span>
                  <span className="font-bold text-cyan-400">
                    {activeDistrictSummary.avgFloodProbability !== null ? `${activeDistrictSummary.avgFloodProbability}%` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dam Reserves:</span>
                  <span className="font-bold text-blue-400">
                    {activeDistrictSummary.avgDamStorage !== null ? `${activeDistrictSummary.avgDamStorage}% (${activeDistrictSummary.damsCount} dams)` : "No Monitored Dams"}
                  </span>
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
                  Reset Scope
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
                <p><strong>Safe Refuge:</strong> <span className="capitalize text-amber-400 font-bold">{activeRoute.refuge.name}</span></p>
                <p><strong>Distance:</strong> {activeRoute.distance_km} km</p>
                <p><strong>Est. Drive Time:</strong> {activeRoute.duration_minutes} mins</p>
                <p><strong>Routing Mode:</strong> <span className="uppercase font-bold text-teal-400 text-[10px]">{activeRoute.routing_mode}</span></p>
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
